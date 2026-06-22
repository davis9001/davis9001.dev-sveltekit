/**
 * Public projects API for Iris.
 * GET /api/projects — returns all open-projects grouped by group field.
 * No auth required.
 */
import { getContentTypeBySlug, listContentItems, syncContentTypes } from '$lib/services/cms';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Task = { text: string; done: boolean };

function normalizeTasks(tasks: unknown, completedTasks: unknown): Task[] {
	const rawTasks: any[] = Array.isArray(tasks) ? tasks : [];
	const normalized: Task[] = rawTasks.map((t) =>
		typeof t === 'string' ? { text: t, done: false } : { text: String(t.text ?? ''), done: Boolean(t.done) }
	);

	const rawCompleted: any[] = Array.isArray(completedTasks) ? completedTasks : [];
	const completed: Task[] = rawCompleted.map((t) =>
		typeof t === 'string' ? { text: t, done: true } : { text: String(t.text ?? ''), done: true }
	);

	return [...normalized, ...completed];
}

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

	let latestUpdatedAt = '';

	const groupMap = new Map<
		string,
		{
			name: string;
			status: string;
			priority: string;
			description: string;
			primaryLink: string | null;
			githubUrl: string | null;
			extraLinks: { label: string; href: string }[];
			tasks: Task[];
			blockers: string;
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
			priority: (f.priority as string) || 'medium',
			description: (f.description as string) || '',
			primaryLink: (f.primary_link as string | null) || null,
			githubUrl: (f.github_url as string | null) || null,
			extraLinks: (f.extra_links as { label: string; href: string }[]) || [],
			tasks: normalizeTasks(f.tasks, f.completed_tasks),
			blockers: (f.blockers as string) || '',
			sortOrder: typeof f.sort_order === 'number' ? (f.sort_order as number) : 999
		});
	}

	const groupOrder = ['*Space', 'Personal'];
	const orderedGroups: {
		name: string;
		projects: ReturnType<typeof groupMap.get> extends undefined ? never : NonNullable<ReturnType<typeof groupMap.get>>;
	}[] = [];

	for (const name of groupOrder) {
		if (groupMap.has(name)) {
			const projects = groupMap.get(name)!;
			projects.sort((a, b) => a.sortOrder - b.sortOrder);
			orderedGroups.push({ name, projects } as any);
			groupMap.delete(name);
		}
	}
	for (const [name, projects] of groupMap) {
		projects.sort((a, b) => a.sortOrder - b.sortOrder);
		orderedGroups.push({ name, projects } as any);
	}

	// Strip internal sortOrder from response
	const responseGroups = orderedGroups.map((g) => ({
		name: g.name,
		projects: (g.projects as any[]).map(({ sortOrder: _so, ...p }) => p)
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
