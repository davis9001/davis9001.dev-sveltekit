/**
 * Dynamic CMS Content Item Page - Server Load
 *
 * Handles /{contentType}/{slug} routes (e.g., /blog/my-first-post).
 * Matches both system (registry) and user-created content types from the DB.
 */
import {
	getContentItemBySlug,
	getContentTypeBySlug,
	getItemTags,
	isContentTypeSlug,
	syncContentTypes
} from '$lib/services/cms';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const typeSlug = params.contentType;
	const itemSlug = params.slug;

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Ensure content types are synced
	await syncContentTypes(db);

	// Check if this slug exists in DB (covers both system and user-created types)
	const exists = await isContentTypeSlug(db, typeSlug);
	if (!exists) {
		throw error(404, 'Not found');
	}

	const contentType = await getContentTypeBySlug(db, typeSlug);
	if (!contentType) {
		throw error(404, 'Content type not found');
	}

	const item = await getContentItemBySlug(db, contentType.id, itemSlug);
	if (!item) {
		throw error(404, 'Content not found');
	}

	// Only show published items on public routes, except archived items of
	// types that opted into staying publicly visible (grouped as "Archive"
	// on the list page) — drafts always 404.
	const archiveVisible = item.status === 'archived' && contentType.settings.publicArchiveVisible;
	if (item.status !== 'published' && !archiveVisible) {
		throw error(404, 'Content not found');
	}

	// Get tags if the type supports them
	let tags: any[] = [];
	if (contentType.settings.hasTags) {
		tags = await getItemTags(db, item.id);
	}

	return {
		contentType,
		item,
		tags
	};
};
