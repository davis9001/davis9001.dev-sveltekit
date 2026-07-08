/**
 * List GitHub Projects v2 boards available to link, so the edit page can
 * offer a picker instead of requiring a hand-typed URL.
 * GET → { boards: AvailableBoard[] }
 */
import { GITHUB_SYNC_PAT_KV_KEY, type StoredGithubPat } from '$lib/github/config';
import { listAvailableProjectBoards } from '$lib/github/queries';
import { parseRepoUrl } from '$lib/github/url';
import { getOpenProject } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.isOwner && !locals.user.isAdmin) throw error(403, 'Forbidden');
}

export const GET: RequestHandler = async ({ locals, platform, params }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) throw error(500, 'Database not available');

	const project = await getOpenProject(db, params.id);
	if (!project) throw error(404, 'Project not found');

	const patRaw = await platform?.env?.KV?.get(GITHUB_SYNC_PAT_KV_KEY);
	if (!patRaw)
		throw error(400, 'No GitHub sync token configured — set one up at /admin/github-sync');
	const { token } = JSON.parse(patRaw) as StoredGithubPat;

	const repo = project.githubUrl ? parseRepoUrl(project.githubUrl) : null;
	const boards = await listAvailableProjectBoards(token, repo);

	return json({ boards });
};
