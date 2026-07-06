/**
 * Admin Projects Dashboard logic
 *
 * Pure helpers behind /admin/projects — mapping CMS items into dashboard
 * projects, computing stats, filtering, grouping, and reorder math.
 * Kept free of Svelte/DB imports so it's fully unit-testable.
 */

import type { ContentItemParsed } from '$lib/cms/types';

export type AdminTask = { text: string; done: boolean };

export type ProjectStatus = 'active' | 'planning' | 'paused' | 'blocked' | 'complete';
export type ProjectPriority = 'high' | 'medium' | 'low';

export const PROJECT_STATUSES: ProjectStatus[] = [
	'active',
	'planning',
	'paused',
	'blocked',
	'complete'
];

export const PROJECT_PRIORITIES: ProjectPriority[] = ['high', 'medium', 'low'];

export interface AdminProject {
	id: string;
	slug: string;
	title: string;
	itemStatus: string; // CMS status: draft/published/archived
	group: string;
	name: string;
	projectStatus: ProjectStatus;
	priority: ProjectPriority;
	description: string;
	primaryLink: string | null;
	githubUrl: string | null;
	extraLinks: { label: string; href: string }[];
	tasks: AdminTask[];
	blockers: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	/** Raw fields JSON as stored — the source of truth for PUT merges */
	rawFields: Record<string, unknown>;
}

export interface ProjectStats {
	total: number;
	byStatus: Record<ProjectStatus, number>;
	byPriority: Record<ProjectPriority, number>;
	openTasks: number;
	doneTasks: number;
	totalTasks: number;
	taskPercent: number;
	withBlockers: number;
}

export interface DashboardFilters {
	search?: string;
	status?: string;
	priority?: string;
	group?: string;
	hideComplete?: boolean;
	blockersOnly?: boolean;
}

export interface ProjectGroup {
	name: string;
	projects: AdminProject[];
}

/** Normalise a tasks field — handles legacy string[] and {text,done}[] shapes */
export function normalizeTasks(tasks: unknown, completedTasks?: unknown): AdminTask[] {
	const raw: unknown[] = Array.isArray(tasks) ? tasks : [];
	const normalized: AdminTask[] = raw.map((t) =>
		typeof t === 'string'
			? { text: t, done: false }
			: { text: String((t as AdminTask)?.text ?? ''), done: Boolean((t as AdminTask)?.done) }
	);

	const rawCompleted: unknown[] = Array.isArray(completedTasks) ? completedTasks : [];
	const completed: AdminTask[] = rawCompleted.map((t) =>
		typeof t === 'string'
			? { text: t, done: true }
			: { text: String((t as AdminTask)?.text ?? ''), done: true }
	);

	return [...normalized, ...completed];
}

function asProjectStatus(value: unknown): ProjectStatus {
	return PROJECT_STATUSES.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'active';
}

function asPriority(value: unknown): ProjectPriority {
	return PROJECT_PRIORITIES.includes(value as ProjectPriority)
		? (value as ProjectPriority)
		: 'medium';
}

/** Map a parsed CMS content item to a dashboard project */
export function mapItemToAdminProject(item: ContentItemParsed): AdminProject {
	const f = item.fields || {};
	return {
		id: item.id,
		slug: item.slug,
		title: item.title,
		itemStatus: item.status,
		group: (f.group as string) || 'Other',
		name: (f.project_name as string) || item.title,
		projectStatus: asProjectStatus(f.status),
		priority: asPriority(f.priority),
		description: (f.description as string) || '',
		primaryLink: (f.primary_link as string | null) || null,
		githubUrl: (f.github_url as string | null) || null,
		extraLinks: Array.isArray(f.extra_links)
			? (f.extra_links as { label: string; href: string }[])
			: [],
		tasks: normalizeTasks(f.tasks, f.completed_tasks),
		blockers: (f.blockers as string) || '',
		sortOrder: typeof f.sort_order === 'number' ? f.sort_order : 999,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		rawFields: f
	};
}

/** Compute headline stats across all projects */
export function computeStats(projects: AdminProject[]): ProjectStats {
	const byStatus: Record<ProjectStatus, number> = {
		active: 0,
		planning: 0,
		paused: 0,
		blocked: 0,
		complete: 0
	};
	const byPriority: Record<ProjectPriority, number> = { high: 0, medium: 0, low: 0 };

	let openTasks = 0;
	let doneTasks = 0;
	let withBlockers = 0;

	for (const p of projects) {
		byStatus[p.projectStatus]++;
		byPriority[p.priority]++;
		for (const t of p.tasks) {
			if (t.done) doneTasks++;
			else openTasks++;
		}
		if (p.blockers.trim()) withBlockers++;
	}

	const totalTasks = openTasks + doneTasks;
	return {
		total: projects.length,
		byStatus,
		byPriority,
		openTasks,
		doneTasks,
		totalTasks,
		taskPercent: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
		withBlockers
	};
}

/** Task progress for one project */
export function taskProgress(tasks: AdminTask[]): { done: number; total: number; percent: number } {
	const done = tasks.filter((t) => t.done).length;
	const total = tasks.length;
	return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Apply dashboard filters to a project list */
export function filterProjects(
	projects: AdminProject[],
	filters: DashboardFilters
): AdminProject[] {
	const search = (filters.search || '').trim().toLowerCase();

	return projects.filter((p) => {
		if (filters.status && p.projectStatus !== filters.status) return false;
		if (filters.priority && p.priority !== filters.priority) return false;
		if (filters.group && p.group !== filters.group) return false;
		if (filters.hideComplete && p.projectStatus === 'complete') return false;
		if (filters.blockersOnly && !p.blockers.trim()) return false;

		if (search) {
			const haystack = [p.name, p.description, p.blockers, p.group, ...p.tasks.map((t) => t.text)]
				.join('\n')
				.toLowerCase();
			if (!haystack.includes(search)) return false;
		}

		return true;
	});
}

/** Group projects, preserving a preferred group order, sorted by sortOrder within group */
export function groupProjects(
	projects: AdminProject[],
	groupOrder: string[] = ['*Space', 'Personal']
): ProjectGroup[] {
	const map = new Map<string, AdminProject[]>();
	for (const p of projects) {
		if (!map.has(p.group)) map.set(p.group, []);
		map.get(p.group)!.push(p);
	}

	for (const list of map.values()) {
		list.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	const groups: ProjectGroup[] = [];
	for (const name of groupOrder) {
		if (map.has(name)) {
			groups.push({ name, projects: map.get(name)! });
			map.delete(name);
		}
	}
	for (const [name, list] of map) {
		groups.push({ name, projects: list });
	}
	return groups;
}

/** Distinct group names across projects, in grouped display order */
export function listGroups(projects: AdminProject[]): string[] {
	return groupProjects(projects).map((g) => g.name);
}

/**
 * Compute sort_order updates to move a project up/down within its group.
 * Normalises the group to sequential 0..n-1 orders first (handles gaps and
 * missing sort_order), then swaps with the neighbour.
 * Returns the updates needed ({id, sortOrder}), or [] if the move is a no-op.
 */
export function moveProject(
	projects: AdminProject[],
	id: string,
	direction: 'up' | 'down'
): { id: string; sortOrder: number }[] {
	const target = projects.find((p) => p.id === id);
	if (!target) return [];

	const group = projects
		.filter((p) => p.group === target.group)
		.sort((a, b) => a.sortOrder - b.sortOrder);

	const index = group.findIndex((p) => p.id === id);
	const swapWith = direction === 'up' ? index - 1 : index + 1;
	if (swapWith < 0 || swapWith >= group.length) return [];

	// Normalised sequential order with the two neighbours swapped
	const reordered = [...group];
	[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

	const updates: { id: string; sortOrder: number }[] = [];
	reordered.forEach((p, i) => {
		if (p.sortOrder !== i) updates.push({ id: p.id, sortOrder: i });
	});
	return updates;
}

/**
 * Merge a field patch into a project's raw fields for a PUT.
 * Always writes tasks in the canonical {text,done}[] shape and drops the
 * legacy completed_tasks field once tasks have been normalised.
 */
export function buildFieldsUpdate(
	project: AdminProject,
	patch: Partial<{
		group: string;
		project_name: string;
		status: string;
		priority: string;
		description: string;
		primary_link: string | null;
		github_url: string | null;
		extra_links: { label: string; href: string }[];
		tasks: AdminTask[];
		blockers: string;
		sort_order: number;
	}>
): Record<string, unknown> {
	const fields: Record<string, unknown> = { ...project.rawFields, ...patch };

	// Canonicalise tasks; merge legacy completed_tasks into the main list
	fields.tasks =
		patch.tasks ?? normalizeTasks(project.rawFields.tasks, project.rawFields.completed_tasks);
	delete fields.completed_tasks;

	return fields;
}
