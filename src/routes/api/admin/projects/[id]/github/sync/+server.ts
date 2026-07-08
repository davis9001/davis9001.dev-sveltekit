/**
 * Manual "Sync now" — push-then-pull, synchronous (unlike the save-triggered
 * background push). Push-first so a stuck earlier push error self-heals
 * before pulling remote changes back in.
 * POST → { project, summary: { appended, unlinked, conflicts } }
 */
import { GITHUB_SYNC_PAT_KV_KEY, type StoredGithubPat } from '$lib/github/config';
import { pullProjectFromGithub, pushProjectToGithub } from '$lib/github/project-sync';
import { getOpenProject, updateOpenProject } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.isOwner && !locals.user.isAdmin) throw error(403, 'Forbidden');
}

export const POST: RequestHandler = async ({ locals, platform, params }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) throw error(500, 'Database not available');

	const project = await getOpenProject(db, params.id);
	if (!project) throw error(404, 'Project not found');
	if (!project.githubSyncEnabled || !project.githubProjectId) {
		throw error(400, 'Project is not linked to a GitHub board');
	}

	const patRaw = await platform?.env?.KV?.get(GITHUB_SYNC_PAT_KV_KEY);
	if (!patRaw)
		throw error(400, 'No GitHub sync token configured — set one up at /admin/github-sync');
	const { token } = JSON.parse(patRaw) as StoredGithubPat;

	const pushResult = await pushProjectToGithub(token, project, project.tasks);
	const afterPush = { ...project, tasks: pushResult.tasks };

	const pullResult = await pullProjectFromGithub(token, afterPush);

	const error_ = pushResult.error ?? pullResult.error ?? null;
	const updated = await updateOpenProject(db, params.id, {
		tasks: pullResult.tasks,
		githubLastSyncedAt: new Date().toISOString(),
		githubLastSyncError: error_,
		githubPriorityFieldFound: pullResult.priorityFieldFound || pushResult.priorityFieldFound
	});

	return json({
		project: updated,
		summary: {
			appended: pullResult.appended,
			unlinked: pullResult.unlinked,
			conflicts: pullResult.conflicts,
			error: error_
		}
	});
};
