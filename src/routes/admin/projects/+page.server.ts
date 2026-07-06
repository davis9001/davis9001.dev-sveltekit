/**
 * Admin Projects Dashboard - Server Load
 *
 * Loads ALL open-projects items (drafts included — this is mission control,
 * not the public page) straight from D1 and maps them for the dashboard.
 */
import { mapItemToAdminProject } from '$lib/admin/projects-dashboard';
import { getContentTypeBySlug, listContentItems, syncContentTypes } from '$lib/services/cms';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	await syncContentTypes(db);

	const contentType = await getContentTypeBySlug(db, 'open-projects');
	if (!contentType) {
		throw error(500, 'open-projects content type not found');
	}

	const result = await listContentItems(db, contentType.id, {
		pageSize: 500,
		sortBy: 'created_at',
		sortDirection: 'asc'
	});

	return {
		projects: result.items.map(mapItemToAdminProject)
	};
};
