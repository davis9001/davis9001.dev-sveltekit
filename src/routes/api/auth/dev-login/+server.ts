import { dev } from '$app/environment';
import { recordLoginActivity } from '$lib/services/user-activity';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Dev-only simulated GitHub sign-in as the superadmin (davis9001).
 *
 * Only exists under `vite dev` — the `dev` flag from $app/environment is
 * compiled to `false` in production builds, so this endpoint 404s there.
 * It skips GitHub OAuth entirely and issues the same session cookie the
 * real callback would for the owner account.
 */

const DEV_OWNER_LOGIN = 'davis9001';
const DEV_OWNER_FALLBACK_ID = 'dev-davis9001';

// GET - Simulate a GitHub owner login (dev only)
export const GET: RequestHandler = async ({ url, platform }) => {
	if (!dev) {
		throw error(404, 'Not found');
	}

	let userId = DEV_OWNER_FALLBACK_ID;
	let name: string | null = 'David Monaghan';
	let email: string | null = `${DEV_OWNER_LOGIN}@github.local`;
	let avatarUrl: string | null = `https://github.com/${DEV_OWNER_LOGIN}.png`;

	const db = platform?.env?.DB;
	if (db) {
		try {
			// Reuse the real user row if davis9001 has logged in before (via
			// actual OAuth or a previous dev login) so we don't create duplicates
			const existing = await db
				.prepare(
					'SELECT id, name, email, github_avatar_url FROM users WHERE LOWER(github_login) = ?'
				)
				.bind(DEV_OWNER_LOGIN)
				.first<{
					id: string;
					name: string | null;
					email: string | null;
					github_avatar_url: string | null;
				}>();

			if (existing) {
				userId = existing.id;
				name = existing.name ?? name;
				email = existing.email ?? email;
				avatarUrl = existing.github_avatar_url ?? avatarUrl;

				await db
					.prepare('UPDATE users SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
					.bind(userId)
					.run();
			} else {
				await db
					.prepare(
						`INSERT INTO users (id, email, name, github_login, github_avatar_url, is_admin, created_at)
						VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
					)
					.bind(userId, email, name, DEV_OWNER_LOGIN, avatarUrl)
					.run();
			}

			await recordLoginActivity(db, userId, 'github');
		} catch (dbErr) {
			console.error('[DevLogin] Database error (continuing with session anyway):', dbErr);
		}
	}

	const sessionData = {
		id: userId,
		login: DEV_OWNER_LOGIN,
		name,
		email,
		avatarUrl,
		isOwner: true,
		isAdmin: true
	};

	// Same URL-safe base64 cookie format as the real GitHub callback
	const sessionCookie = btoa(JSON.stringify(sessionData))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	const isSecure = url.protocol === 'https:';
	const cookieParts = [
		`session=${sessionCookie}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		`Max-Age=${60 * 60 * 24 * 7}`
	];
	if (isSecure) {
		cookieParts.push('Secure');
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: new URL('/admin', url.origin).toString(),
			'Set-Cookie': cookieParts.join('; ')
		}
	});
};
