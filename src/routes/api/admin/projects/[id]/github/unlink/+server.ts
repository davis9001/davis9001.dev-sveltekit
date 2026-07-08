/**
 * Unlink an OpenProject from its GitHub Projects v2 board.
 * POST → { project }
 *
 * Local-only: does not touch GitHub itself (no issues closed, no board
 * items removed). Also strips per-task GitHub identity — a task pointing
 * at a githubItemId on a board the project no longer claims is a dangling
 * reference that would misbehave if later linked to a different board.
 */
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

	const strippedTasks = project.tasks.map((task) => {
		const {
			githubItemId: _itemId,
			githubIssueId: _issueId,
			githubIssueNumber: _issueNumber,
			...rest
		} = task;
		return rest;
	});

	const updated = await updateOpenProject(db, params.id, {
		githubProjectUrl: null,
		githubProjectId: null,
		githubSyncEnabled: false,
		githubLastSyncedAt: null,
		githubLastSyncError: null,
		githubPriorityFieldFound: false,
		tasks: strippedTasks
	});

	return json({ project: updated });
};
