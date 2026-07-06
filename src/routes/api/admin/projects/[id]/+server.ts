/**
 * Admin Open Projects API — single project.
 * GET    /api/admin/projects/[id] → { project }
 * PUT    /api/admin/projects/[id] → { project } (partial patch)
 * DELETE /api/admin/projects/[id] → { success: true }
 */
import { validateProjectInput } from '$lib/projects/validate';
import { deleteOpenProject, getOpenProject, updateOpenProject } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}
}

export const GET: RequestHandler = async ({ locals, platform, params }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const project = await getOpenProject(db, params.id);
	if (!project) {
		throw error(404, 'Project not found');
	}

	return json({ project });
};

export const PUT: RequestHandler = async ({ locals, platform, params, request }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json().catch(() => null);
	const result = validateProjectInput(body);
	if (!result.ok) {
		throw error(400, result.message);
	}

	const project = await updateOpenProject(db, params.id, result.input);
	if (!project) {
		throw error(404, 'Project not found');
	}

	return json({ project });
};

export const DELETE: RequestHandler = async ({ locals, platform, params }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const deleted = await deleteOpenProject(db, params.id);
	if (!deleted) {
		throw error(404, 'Project not found');
	}

	return json({ success: true });
};
