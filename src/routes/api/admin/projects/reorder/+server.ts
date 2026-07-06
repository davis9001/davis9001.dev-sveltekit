/**
 * Admin Open Projects API — bulk reorder.
 * POST /api/admin/projects/reorder { updates: [{ id, sortOrder }] }
 * Applies all sort-order changes in one atomic D1 batch.
 */
import { validateReorderInput } from '$lib/projects/validate';
import { reorderOpenProjects } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json().catch(() => null);
	const result = validateReorderInput(body);
	if (!result.ok) {
		throw error(400, result.message);
	}

	const updated = await reorderOpenProjects(db, result.updates);
	return json({ success: true, updated });
};
