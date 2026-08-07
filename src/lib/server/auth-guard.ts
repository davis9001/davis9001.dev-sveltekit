/**
 * Authorization guards for server routes.
 *
 * Routes under /api/admin are NOT covered by the /admin layout — SvelteKit
 * layouts do not apply to API routes — so every admin endpoint has to assert
 * its own caller. These helpers exist so that assertion is one call and looks
 * the same everywhere, rather than being re-typed (or forgotten) per file.
 */
import { error } from '@sveltejs/kit';

// `locals` is optional-chained throughout: a caller that reaches these with no
// locals at all is unauthenticated, and should get a 401 rather than a
// TypeError that some upstream catch block might turn into a success path.

/** Owner or admin. Throws 401 when unauthenticated, 403 when under-privileged. */
export function requireAdmin(locals: App.Locals | undefined): void {
	if (!locals?.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}
}

/** Owner only — for actions that change how authentication itself works. */
export function requireOwner(locals: App.Locals | undefined): void {
	if (!locals?.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isOwner) {
		throw error(403, 'Forbidden');
	}
}
