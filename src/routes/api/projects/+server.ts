/**
 * Public projects API for Iris.
 * GET /api/projects — all open projects grouped by group name.
 * No auth required. The response contract is frozen — see toPublicGroups.
 */
import { latestUpdatedAt, toPublicGroups } from '$lib/projects/utils';
import { listOpenProjects } from '$lib/services/open-projects';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const projects = await listOpenProjects(db);

	return json(
		{
			updatedAt: latestUpdatedAt(projects) || new Date().toISOString(),
			groups: toPublicGroups(projects)
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
			}
		}
	);
};
