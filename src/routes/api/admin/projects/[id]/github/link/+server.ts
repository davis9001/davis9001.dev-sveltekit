/**
 * Link an OpenProject to a GitHub Projects v2 board.
 * POST { projectUrl } → { project, fieldsFound: { status, priority } }
 */
import { GithubApiError } from '$lib/github/client';
import { GITHUB_SYNC_PAT_KV_KEY, type StoredGithubPat } from '$lib/github/config';
import { findPriorityFieldMapping, findStatusFieldMapping } from '$lib/github/field-mapping';
import { resolveProjectV2 } from '$lib/github/queries';
import { parseProjectUrl } from '$lib/github/url';
import { getOpenProject, updateOpenProject } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.isOwner && !locals.user.isAdmin) throw error(403, 'Forbidden');
}

function isHttpError(err: unknown): err is { status: number; body: unknown } {
	return typeof err === 'object' && err !== null && 'status' in err && 'body' in err;
}

export const POST: RequestHandler = async ({ locals, platform, params, request }) => {
	requireAdmin(locals);

	const db = platform?.env?.DB;
	if (!db) throw error(500, 'Database not available');

	try {
		const body = await request.json().catch(() => null);
		const projectUrl = (body as { projectUrl?: unknown } | null)?.projectUrl;
		if (typeof projectUrl !== 'string' || !projectUrl.trim()) {
			throw error(400, 'projectUrl is required');
		}

		const parsed = parseProjectUrl(projectUrl.trim());
		if (!parsed) {
			throw error(
				400,
				'projectUrl must look like https://github.com/orgs|users/<owner>/projects/<number>'
			);
		}

		const project = await getOpenProject(db, params.id);
		if (!project) throw error(404, 'Project not found');

		const existingLink = await db
			.prepare('SELECT id FROM open_projects WHERE github_project_url = ? AND id != ?')
			.bind(projectUrl.trim(), params.id)
			.first<{ id: string }>();
		if (existingLink) {
			throw error(409, 'This GitHub board is already linked to another project');
		}

		const patRaw = await platform?.env?.KV?.get(GITHUB_SYNC_PAT_KV_KEY);
		if (!patRaw)
			throw error(400, 'No GitHub sync token configured — set one up at /admin/github-sync');
		const { token } = JSON.parse(patRaw) as StoredGithubPat;

		let resolved;
		try {
			resolved = await resolveProjectV2(token, parsed);
		} catch (err) {
			const message =
				err instanceof GithubApiError ? err.message : 'Failed to resolve the GitHub board';
			throw error(400, message);
		}
		if (!resolved) {
			throw error(404, 'GitHub board not found (check the URL and token permissions)');
		}

		const statusFound = findStatusFieldMapping(resolved.fields) !== null;
		const priorityFound = findPriorityFieldMapping(resolved.fields) !== null;

		const updated = await updateOpenProject(db, params.id, {
			githubProjectUrl: projectUrl.trim(),
			githubProjectId: resolved.id,
			githubSyncEnabled: true,
			githubPriorityFieldFound: priorityFound,
			githubLastSyncError: null
		});

		return json({
			project: updated,
			fieldsFound: { status: statusFound, priority: priorityFound }
		});
	} catch (err) {
		if (isHttpError(err)) throw err;
		throw error(500, err instanceof Error ? err.message : 'Unknown error linking GitHub board');
	}
};
