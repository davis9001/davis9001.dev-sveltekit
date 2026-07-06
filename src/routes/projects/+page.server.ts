import { toPublicGroups } from '$lib/projects/utils';
import { listOpenProjects } from '$lib/services/open-projects';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const projects = await listOpenProjects(db);

	return { groups: toPublicGroups(projects) };
};
