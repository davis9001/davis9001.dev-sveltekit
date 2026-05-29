import { error, json } from '@sveltejs/kit';
import { logUserActivity } from '$lib/services/user-activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const userId = params.id;

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const user = await db
			.prepare(
				`SELECT
					id,
					email,
					name,
					is_admin,
					github_login,
					github_avatar_url,
					discord_username,
					discord_avatar_url,
					created_at,
					updated_at
				 FROM users
				 WHERE id = ?`
			)
			.bind(userId)
			.first();

		if (!user) {
			throw error(404, 'User not found');
		}

		const oauthAccountsResult = await db
			.prepare(
				`SELECT provider, provider_account_id, created_at
				 FROM oauth_accounts
				 WHERE user_id = ?
				 ORDER BY created_at DESC`
			)
			.bind(userId)
			.all();

		const sessionsResult = await db
			.prepare(
				`SELECT id, created_at, expires_at
				 FROM sessions
				 WHERE user_id = ?
				 ORDER BY created_at DESC
				 LIMIT 50`
			)
			.bind(userId)
			.all();

		const activityLogsResult = await db
			.prepare(
				`SELECT
					ual.id,
					ual.action_type,
					ual.action_label,
					ual.metadata,
					ual.created_at,
					ual.actor_user_id,
					au.name AS actor_name,
					au.github_login AS actor_github_login,
					au.discord_username AS actor_discord_username
				 FROM user_activity_logs ual
				 LEFT JOIN users au ON au.id = ual.actor_user_id
				 WHERE ual.user_id = ?
				 ORDER BY ual.created_at DESC
				 LIMIT 100`
			)
			.bind(userId)
			.all();

		const totalSessionsRow = await db
			.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();

		const totalChatMessagesRow = await db
			.prepare('SELECT COUNT(*) AS count FROM chat_messages WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();

		return json({
			user,
			oauthAccounts: oauthAccountsResult.results || [],
			sessions: sessionsResult.results || [],
			activityLogs: activityLogsResult.results || [],
			stats: {
				totalSessions: Number(totalSessionsRow?.count || 0),
				totalChatMessages: Number(totalChatMessagesRow?.count || 0)
			}
		});
	} catch (err: any) {
		console.error('Failed to fetch user details:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to fetch user details');
	}
};

export const PATCH: RequestHandler = async ({ platform, locals, params, request }) => {
	// Check if user is authenticated and is admin
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const userId = params.id;
	const body = await request.json();
	const { isAdmin } = body;

	if (typeof isAdmin !== 'boolean') {
		throw error(400, 'isAdmin must be a boolean');
	}

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Get the target user
		const targetUser = await db
			.prepare('SELECT id, email, github_login FROM users WHERE id = ?')
			.bind(userId)
			.first<{ id: string; email: string; github_login: string }>();

		if (!targetUser) {
			throw error(404, 'User not found');
		}

		// Check if trying to modify self
		if (userId === locals.user.id) {
			throw error(400, 'Cannot modify your own admin status');
		}

		// Get setup owner email from KV
		const setupData = await platform?.env?.KV?.get('setup:complete');
		if (setupData) {
			const setupInfo = JSON.parse(setupData);
			const ownerEmail = setupInfo.ownerEmail;

			// Prevent demoting the setup owner
			if (targetUser.email === ownerEmail && !isAdmin) {
				throw error(400, 'Cannot demote the setup owner');
			}
		}

		// Update user admin status
		await db
			.prepare('UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
			.bind(isAdmin ? 1 : 0, userId)
			.run();

		await logUserActivity({
			db,
			userId,
			actorUserId: locals.user.id,
			actionType: 'admin.role_change',
			actionLabel: isAdmin ? 'Promoted to admin' : 'Demoted to user',
			metadata: {
				isAdmin,
				actorId: locals.user.id
			}
		});

		return json({
			success: true,
			message: isAdmin ? 'User promoted to admin' : 'User demoted from admin'
		});
	} catch (err: any) {
		console.error('Failed to update user:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to update user');
	}
};

export const DELETE: RequestHandler = async ({ platform, locals, params }) => {
	// Check if user is authenticated and is admin
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const userId = params.id;

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Check if trying to delete self
		if (userId === locals.user.id) {
			throw error(400, 'Cannot delete your own account');
		}

		// Get the target user
		const targetUser = await db
			.prepare('SELECT id, email FROM users WHERE id = ?')
			.bind(userId)
			.first<{ id: string; email: string }>();

		if (!targetUser) {
			throw error(404, 'User not found');
		}

		// Get setup owner email from KV
		const setupData = await platform?.env?.KV?.get('setup:complete');
		if (setupData) {
			const setupInfo = JSON.parse(setupData);
			const ownerEmail = setupInfo.ownerEmail;

			// Prevent deleting the setup owner
			if (targetUser.email === ownerEmail) {
				throw error(400, 'Cannot delete the setup owner');
			}
		}

		// Delete user (cascades to sessions and oauth_accounts)
		await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

		return json({
			success: true,
			message: 'User deleted successfully'
		});
	} catch (err: any) {
		console.error('Failed to delete user:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to delete user');
	}
};
