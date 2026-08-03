import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	assertDatabaseIdentity,
	shouldEnforceDatabaseIdentity
} from '$lib/server/database-identity';
import { getAuthSession } from '$lib/utils/db';

const databaseIdentityHandler: Handle = async ({ event, resolve }) => {
	if (shouldEnforceDatabaseIdentity(event.url.hostname)) {
		await assertDatabaseIdentity(event.platform?.env?.DB, {
			expectedAppId: event.platform?.env?.EXPECTED_DB_APP_ID
		});
	}

	return resolve(event);
};

// Auth handling hook
const authHandler: Handle = async ({ event, resolve }) => {
	// The cookie is an opaque session id, not the user object. The trusted
	// payload lives server-side in the sessions table (see createAuthSession),
	// so isOwner/isAdmin cannot be forged by editing the cookie. A cookie that
	// resolves to no session leaves the request unauthenticated — fail closed.
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const db = event.platform?.env?.DB;
		let user = null;
		if (db) {
			try {
				user = await getAuthSession(db, sessionId);
			} catch {
				// Treat a database error as "cannot authenticate this request"
				// rather than trusting the cookie — the whole point of the change.
				user = null;
			}
		}

		if (user) {
			event.locals.user = user;
		} else {
			// Unknown, expired, or unverifiable session — clear the stale cookie.
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};

// Security headers hook — mirrors the Deno Fresh securityHeaders plugin
const securityHeadersHandler: Handle = async ({ event, resolve }) => {
	// Skip API routes (they set their own headers)
	if (event.url.pathname.startsWith('/api')) {
		return resolve(event);
	}

	const response = await resolve(event);

	response.headers.set('Strict-Transport-Security', 'max-age=63072000;');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-XSS-Protection', '1; mode=block');

	return response;
};

// Combine all hooks
export const handle = sequence(databaseIdentityHandler, authHandler, securityHeadersHandler);
