/**
 * Open Projects — shared pure helpers
 *
 * Normalisation, coercion, and grouping used by the service, the admin
 * dashboard, the public page, and the public API. No Svelte or DB imports.
 */

import {
	PROJECT_PRIORITIES,
	PROJECT_STATUSES,
	type ExtraLink,
	type OpenProject,
	type ProjectGroup,
	type ProjectPriority,
	type ProjectStatus,
	type PublicProjectGroup,
	type Task
} from './types';

/** Normalise a tasks value — handles legacy string[] and {text,done}[] shapes */
export function normalizeTasks(tasks: unknown, completedTasks?: unknown): Task[] {
	const raw: unknown[] = Array.isArray(tasks) ? tasks : [];
	const normalized: Task[] = raw.map((t) =>
		typeof t === 'string'
			? { text: t, done: false }
			: { text: String((t as Task)?.text ?? ''), done: Boolean((t as Task)?.done) }
	);

	const rawCompleted: unknown[] = Array.isArray(completedTasks) ? completedTasks : [];
	const completed: Task[] = rawCompleted.map((t) =>
		typeof t === 'string'
			? { text: t, done: true }
			: { text: String((t as Task)?.text ?? ''), done: true }
	);

	return [...normalized, ...completed];
}

/** Keep only well-formed {label, href} entries */
export function normalizeExtraLinks(value: unknown): ExtraLink[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(l): l is ExtraLink =>
				typeof l === 'object' &&
				l !== null &&
				typeof (l as ExtraLink).label === 'string' &&
				typeof (l as ExtraLink).href === 'string'
		)
		.map((l) => ({ label: l.label, href: l.href }));
}

export function asProjectStatus(value: unknown): ProjectStatus {
	return PROJECT_STATUSES.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'active';
}

export function asPriority(value: unknown): ProjectPriority {
	return PROJECT_PRIORITIES.includes(value as ProjectPriority)
		? (value as ProjectPriority)
		: 'medium';
}

/** Group projects, preserving a preferred group order, sorted by sortOrder within group */
export function groupProjects(
	projects: OpenProject[],
	groupOrder: string[] = ['*Space', 'Personal']
): ProjectGroup[] {
	const map = new Map<string, OpenProject[]>();
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

/**
 * The frozen public contract: grouped projects with internal fields
 * (id, sortOrder, timestamps) stripped. Consumed by /projects and
 * /api/projects — do not change key names or ordering semantics.
 */
export function toPublicGroups(projects: OpenProject[]): PublicProjectGroup[] {
	return groupProjects(projects).map((group) => ({
		name: group.name,
		projects: group.projects.map((p) => ({
			name: p.name,
			status: p.status,
			priority: p.priority,
			description: p.description,
			primaryLink: p.primaryLink,
			githubUrl: p.githubUrl,
			extraLinks: p.extraLinks,
			tasks: p.tasks,
			blockers: p.blockers
		}))
	}));
}

/** Latest updated_at across projects (raw DB datetime strings sort lexicographically) */
export function latestUpdatedAt(projects: OpenProject[]): string | null {
	let latest: string | null = null;
	for (const p of projects) {
		if (p.updatedAt && (latest === null || p.updatedAt > latest)) {
			latest = p.updatedAt;
		}
	}
	return latest;
}
