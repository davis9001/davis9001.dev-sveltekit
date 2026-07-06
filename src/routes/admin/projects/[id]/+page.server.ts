/**
 * Admin Project Edit Page - Server Load
 *
 * Loads a single open project plus the existing group names (for the
 * group suggestions datalist). 404s for unknown ids.
 */
import { listGroups } from '$lib/admin/projects-dashboard';
import { getOpenProject, listOpenProjects } from '$lib/services/open-projects';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const project = await getOpenProject(db, params.id);
	if (!project) {
		throw error(404, 'Project not found');
	}

	const groups = listGroups(await listOpenProjects(db));

	return { project, groups };
};
