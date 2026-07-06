/**
 * Admin Open Projects API — list and create.
 * GET  /api/admin/projects  → { projects }
 * POST /api/admin/projects  → 201 { project }
 */
import { validateProjectInput } from '$lib/projects/validate';
import { createOpenProject, listOpenProjects } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
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

	const projects = await listOpenProjects(db);
	return json({ projects });
};

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
	const result = validateProjectInput(body, { requireIdentity: true });
	if (!result.ok) {
		throw error(400, result.message);
	}

	const project = await createOpenProject(
		db,
		result.input as typeof result.input & { group: string; name: string }
	);

	return json({ project }, { status: 201 });
};
