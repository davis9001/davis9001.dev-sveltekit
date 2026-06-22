/**
 * Public projects API for Iris.
 * GET /api/projects — returns all open-projects grouped by group field.
 * No auth required.
 */
import { getContentTypeBySlug, listContentItems, syncContentTypes } from '$lib/services/cms';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	await syncContentTypes(db);

	const contentType = await getContentTypeBySlug(db, 'open-projects');
	if (!contentType) {
		throw error(404, 'open-projects content type not found');
	}

	const result = await listContentItems(db, contentType.id, {
		status: 'published',
		pageSize: 200,
		sortBy: 'created_at',
		sortDirection: 'asc'
	});

	// Track the most recent updated_at across all items
	let latestUpdatedAt = '';

	// Group and sort
	const groupMap = new Map<
		string,
		{
			name: string;
			status: string;
			primaryLink: string | null;
			tasks: string[];
			completedTasks: string[];
			sortOrder: number;
		}[]
	>();

	for (const item of result.items) {
		const f = item.fields;
		const groupName = (f.group as string) || 'Other';
		if (!groupMap.has(groupName)) {
			groupMap.set(groupName, []);
		}

		if (item.updatedAt > latestUpdatedAt) {
			latestUpdatedAt = item.updatedAt;
		}

		groupMap.get(groupName)!.push({
			name: (f.project_name as string) || item.title,
			status: (f.status as string) || 'active',
			primaryLink: (f.primary_link as string | null) || null,
			tasks: (f.tasks as string[]) || [],
			completedTasks: (f.completed_tasks as string[]) || [],
			sortOrder: typeof f.sort_order === 'number' ? (f.sort_order as number) : 999
		});
	}

	const groupOrder = ['*Space', 'Personal'];
	const groups: { name: string; projects: typeof groupMap extends Map<string, infer V> ? V : never }[] = [];

	for (const name of groupOrder) {
		if (groupMap.has(name)) {
			const projects = groupMap.get(name)!;
			projects.sort((a, b) => a.sortOrder - b.sortOrder);
			groups.push({ name, projects });
			groupMap.delete(name);
		}
	}
	for (const [name, projects] of groupMap) {
		projects.sort((a, b) => a.sortOrder - b.sortOrder);
		groups.push({ name, projects });
	}

	// Strip internal sortOrder from response
	const responseGroups = groups.map((g) => ({
		name: g.name,
		projects: g.projects.map(({ sortOrder: _so, ...p }) => p)
	}));

	return json(
		{
			updatedAt: latestUpdatedAt || new Date().toISOString(),
			groups: responseGroups
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
			}
		}
	);
};
