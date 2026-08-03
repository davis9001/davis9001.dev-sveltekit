import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { deleteSession } from '$lib/utils/db';
import type { RequestHandler } from './$types';

/**
 * End the session in both places it lives: the server-side row (so the cookie
 * can never be replayed) and the cookie itself. A missing DB still clears the
 * cookie — logout must never fail into "still logged in".
 */
async function logout(cookies: Cookies, db?: D1Database): Promise<void> {
	const sessionId = cookies.get('session');
	if (sessionId && db) {
		try {
			await deleteSession(db, sessionId);
		} catch {
			// Best effort: the cookie is cleared regardless, and the row expires
			// on its own.
		}
	}
	cookies.delete('session', { path: '/' });
}

// POST - Logout user
export const POST: RequestHandler = async ({ cookies, platform }) => {
	await logout(cookies, platform?.env?.DB);
	throw redirect(302, '/auth/login');
};

// GET - Logout user (for convenience)
export const GET: RequestHandler = async ({ cookies, platform }) => {
	await logout(cookies, platform?.env?.DB);
	throw redirect(302, '/auth/login');
};
