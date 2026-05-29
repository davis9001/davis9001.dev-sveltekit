import { error, json } from '@sveltejs/kit';
import { logUserActivity } from '$lib/services/user-activity';
import type { RequestHandler } from './$types';

type UserDetailRow = {
	id: string;
	email: string;
	name: string | null;
	is_admin: number;
	github_login: string | null;
	github_avatar_url: string | null;
	discord_username: string | null;
	discord_avatar_url: string | null;
	created_at: string;
	updated_at: string | null;
};

function isLegacyDiscordColumnError(err: unknown) {
	const message = String((err as any)?.message || err || '');
	return (
		message.includes('no such column') &&
		(message.includes('discord_username') || message.includes('discord_avatar_url'))
	);
}

function normalizeStringField(value: unknown) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

async function loadUserDetails(db: any, userId: string, legacyFallback = false) {
	const discordColumns = legacyFallback
		? 'NULL as discord_username, NULL as discord_avatar_url'
		: 'discord_username, discord_avatar_url';
	const actorDiscordColumn = legacyFallback
		? 'NULL as actor_discord_username'
		: 'au.discord_username AS actor_discord_username';

	const user = await db
		.prepare(
			`SELECT
				id,
				email,
				name,
				is_admin,
				github_login,
				github_avatar_url,
				${discordColumns},
				created_at,
				updated_at
			 FROM users
			 WHERE id = ?`
		)
		.bind(userId)
		.first();

	const typedUser = user as UserDetailRow | null;

	if (!typedUser) {
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
				${actorDiscordColumn}
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
		.first();

	const totalChatMessagesRow = await db
		.prepare('SELECT COUNT(*) AS count FROM chat_messages WHERE user_id = ?')
		.bind(userId)
		.first();

	return {
		user: typedUser,
		oauthAccounts: oauthAccountsResult.results || [],
		sessions: sessionsResult.results || [],
		activityLogs: activityLogsResult.results || [],
		stats: {
			totalSessions: Number(totalSessionsRow?.count || 0),
			totalChatMessages: Number(totalChatMessagesRow?.count || 0)
		}
	};
}

async function loadUserDetailsWithFallback(db: any, userId: string) {
	try {
		return await loadUserDetails(db, userId, false);
	} catch (err) {
		if (!isLegacyDiscordColumnError(err)) {
			throw err;
		}

		return await loadUserDetails(db, userId, true);
	}
}

async function updateUserRecord(
	db: any,
	userId: string,
	body: Record<string, unknown>,
	legacyFallback = false
) {
	const updateClauses: string[] = [];
	const values: Array<string | number | null> = [];

	const addStringUpdate = (column: string, value: unknown) => {
		const normalized = normalizeStringField(value);
		if (normalized === undefined) {
			return;
		}

		updateClauses.push(`${column} = ?`);
		values.push(normalized);
	};

	addStringUpdate('name', body.name);
	addStringUpdate('email', body.email);
	addStringUpdate('github_login', body.githubLogin);
	addStringUpdate('github_avatar_url', body.githubAvatarUrl);

	if (!legacyFallback) {
		addStringUpdate('discord_username', body.discordUsername);
		addStringUpdate('discord_avatar_url', body.discordAvatarUrl);
	}

	if (typeof body.isAdmin === 'boolean') {
		updateClauses.push('is_admin = ?');
		values.push(body.isAdmin ? 1 : 0);
	}

	if (updateClauses.length === 0) {
		throw error(400, 'No supported fields provided');
	}

	updateClauses.push('updated_at = CURRENT_TIMESTAMP');
	values.push(userId);

	await db.prepare(`UPDATE users SET ${updateClauses.join(', ')} WHERE id = ?`).bind(...values).run();

	return await loadUserDetails(db, userId, legacyFallback);
}

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
		return json(await loadUserDetailsWithFallback(db, userId));
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

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Get the target user
		const targetUser = await db
			.prepare('SELECT id, email, github_login, is_admin FROM users WHERE id = ?')
			.bind(userId)
			.first<{ id: string; email: string; github_login: string | null; is_admin: number }>();

		if (!targetUser) {
			throw error(404, 'User not found');
		}

		const hasAdminUpdate = typeof body.isAdmin === 'boolean';
		if (hasAdminUpdate && userId === locals.user.id) {
			throw error(400, 'Cannot modify your own admin status');
		}

		// Get setup owner email from KV
		const setupData = await platform?.env?.KV?.get('setup:complete');
		if (setupData && hasAdminUpdate) {
			const setupInfo = JSON.parse(setupData);
			const ownerEmail = setupInfo.ownerEmail;

			// Prevent demoting the setup owner
			if (targetUser.email === ownerEmail && !body.isAdmin) {
				throw error(400, 'Cannot demote the setup owner');
			}
		}

		const preferredUpdate = await updateUserRecord(db, userId, body as Record<string, unknown>);
		const changedFields = Object.entries(body)
			.filter(([key, value]) => {
				if (key === 'isAdmin') {
					return typeof value === 'boolean';
				}
				return normalizeStringField(value) !== undefined;
			})
			.map(([key]) => key);

		if (changedFields.length > 0) {
			const activityLog = await logUserActivity({
				db,
				userId,
				actorUserId: locals.user.id,
				actionType:
					hasAdminUpdate && changedFields.length === 1 && changedFields[0] === 'isAdmin'
						? 'admin.role_change'
						: 'admin.user_update',
				actionLabel:
					hasAdminUpdate && changedFields.length === 1 && changedFields[0] === 'isAdmin'
						? body.isAdmin
							? 'Promoted to admin'
							: 'Demoted to user'
						: 'Updated user profile data',
				metadata: {
					changedFields,
					actorId: locals.user.id
				}
			});

			return json({
				success: true,
				message:
					hasAdminUpdate && changedFields.length === 1 && changedFields[0] === 'isAdmin'
						? body.isAdmin
							? 'User promoted to admin'
							: 'User demoted from admin'
						: 'User updated successfully',
				user: preferredUpdate.user,
				activityLog
			});
		}

		return json({
			success: true,
			message: 'User updated successfully',
			user: preferredUpdate.user
		});
	} catch (err: any) {
		console.error('Failed to update user:', err);
		if (isLegacyDiscordColumnError(err)) {
			try {
				const db = platform?.env?.DB;
				if (!db) {
					throw error(500, 'Database not available');
				}

				const legacyUpdate = await updateUserRecord(db, userId, body as Record<string, unknown>, true);
				return json({
					success: true,
					message: 'User updated successfully',
					user: legacyUpdate.user
				});
			} catch (legacyErr: any) {
				console.error('Failed to update user using legacy fallback:', legacyErr);
				if (legacyErr.status) {
					throw legacyErr;
				}
				throw error(500, 'Failed to update user');
			}
		}

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
