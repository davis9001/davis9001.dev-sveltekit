/**
 * Admin Open Projects API — single project.
 * GET    /api/admin/projects/[id] → { project }
 * PUT    /api/admin/projects/[id] → { project } (partial patch)
 * DELETE /api/admin/projects/[id] → { success: true }
 */
import { GITHUB_SYNC_PAT_KV_KEY, type StoredGithubPat } from '$lib/github/config';
import { pushProjectToGithub } from '$lib/github/project-sync';
import { validateProjectInput } from '$lib/projects/validate';
import type { OpenProject, Task } from '$lib/projects/types';
import { deleteOpenProject, getOpenProject, updateOpenProject } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestHandler } from './$types';

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}
}

/**
 * Push local task changes to GitHub in the background — awaited via
 * platform.context.waitUntil() so the client's save response isn't delayed
 * by GitHub API round-trips. Errors surface on the next load via
 * githubLastSyncError, since waitUntil can't affect an already-sent response.
 */
async function pushProjectInBackground(
	platform: App.Platform | undefined,
	db: D1Database,
	id: string,
	project: OpenProject,
	previousTasks: Task[]
): Promise<void> {
	try {
		const patRaw = await platform?.env?.KV?.get(GITHUB_SYNC_PAT_KV_KEY);
		if (!patRaw) return;
		const { token } = JSON.parse(patRaw) as StoredGithubPat;

		const result = await pushProjectToGithub(token, project, previousTasks);
		await updateOpenProject(db, id, {
			tasks: result.tasks,
			githubLastSyncedAt: new Date().toISOString(),
			githubLastSyncError: result.error ?? null,
			githubPriorityFieldFound: result.priorityFieldFound
		});
	} catch (err) {
		await updateOpenProject(db, id, {
			githubLastSyncError: err instanceof Error ? err.message : 'Unknown GitHub sync error',
			githubLastSyncedAt: new Date().toISOString()
		}).catch(() => {});
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

	const existing = await getOpenProject(db, params.id);
	if (!existing) {
		throw error(404, 'Project not found');
	}

	const project = await updateOpenProject(db, params.id, result.input);
	if (!project) {
		throw error(404, 'Project not found');
	}

	if (existing.githubSyncEnabled && existing.githubProjectId) {
		platform?.context?.waitUntil(
			pushProjectInBackground(platform, db, params.id, project, existing.tasks)
		);
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
