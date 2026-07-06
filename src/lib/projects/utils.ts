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

/**
 * Canonicalise one task entry. Tasks carry a workflow status (the admin
 * board is a task kanban); `done` mirrors `status === 'complete'`.
 * An explicit valid status wins; otherwise it derives from `done`.
 */
function normalizeTask(entry: unknown, forceDone = false): Task {
	if (typeof entry === 'string') {
		const status: ProjectStatus = forceDone ? 'complete' : 'planning';
		return { text: entry, done: status === 'complete', status };
	}

	const raw = (entry ?? {}) as Partial<Task>;
	let status: ProjectStatus;
	if (forceDone) {
		status = 'complete';
	} else if (PROJECT_STATUSES.includes(raw.status as ProjectStatus)) {
		status = raw.status as ProjectStatus;
	} else {
		status = raw.done ? 'complete' : 'planning';
	}

	return { text: String(raw.text ?? ''), done: status === 'complete', status };
}

/** Normalise a tasks value — handles legacy string[], {text,done}[], and {text,done,status}[] shapes */
export function normalizeTasks(tasks: unknown, completedTasks?: unknown): Task[] {
	const raw: unknown[] = Array.isArray(tasks) ? tasks : [];
	const normalized = raw.map((t) => normalizeTask(t));

	const rawCompleted: unknown[] = Array.isArray(completedTasks) ? completedTasks : [];
	const completed = rawCompleted.map((t) => normalizeTask(t, true));

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
			// Contract: tasks expose exactly {text, done} — internal task
			// status never leaks to the public API
			tasks: p.tasks.map((t) => ({ text: t.text, done: t.done })),
			blockers: p.blockers
		}))
	}));
}

/** A task card on the public board — includes status (page-only; the JSON API stays {text, done}) */
export interface PublicBoardTask {
	text: string;
	status: ProjectStatus;
	projectName: string;
	group: string;
	projectLink: string | null;
}

/**
 * Flatten projects into public board cards, in group display order.
 * Used by the /projects page; NOT part of the frozen /api/projects contract.
 */
export function toPublicBoardTasks(projects: OpenProject[]): PublicBoardTask[] {
	const cards: PublicBoardTask[] = [];
	for (const group of groupProjects(projects)) {
		for (const project of group.projects) {
			for (const task of project.tasks) {
				cards.push({
					text: task.text,
					status: task.status,
					projectName: project.name,
					group: group.name,
					projectLink: project.primaryLink
				});
			}
		}
	}
	return cards;
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
