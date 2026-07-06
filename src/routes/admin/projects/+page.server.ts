/**
 * Admin Projects Dashboard - Server Load
 *
 * Loads all open projects straight from the dedicated table.
 */
import { listOpenProjects } from '$lib/services/open-projects';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	return {
		projects: await listOpenProjects(db)
	};
};
