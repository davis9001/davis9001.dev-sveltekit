/**
 * Admin Projects Dashboard logic
 *
 * Pure helpers behind /admin/projects — stats, filtering, and reorder math.
 * Types and grouping come from the shared $lib/projects module; this file
 * only holds what is genuinely dashboard-specific. No Svelte/DB imports.
 */

import type { OpenProject, ProjectPriority, ProjectStatus, Task } from '$lib/projects/types';
import { groupProjects } from '$lib/projects/utils';

export { PROJECT_PRIORITIES, PROJECT_STATUSES } from '$lib/projects/types';
export type { OpenProject, ProjectPriority, ProjectStatus, Task } from '$lib/projects/types';
export { groupProjects } from '$lib/projects/utils';

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

/** Compute headline stats across all projects */
export function computeStats(projects: OpenProject[]): ProjectStats {
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
		byStatus[p.status]++;
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
export function taskProgress(tasks: Task[]): { done: number; total: number; percent: number } {
	const done = tasks.filter((t) => t.done).length;
	const total = tasks.length;
	return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Apply dashboard filters to a project list */
export function filterProjects(projects: OpenProject[], filters: DashboardFilters): OpenProject[] {
	const search = (filters.search || '').trim().toLowerCase();

	return projects.filter((p) => {
		if (filters.status && p.status !== filters.status) return false;
		if (filters.priority && p.priority !== filters.priority) return false;
		if (filters.group && p.group !== filters.group) return false;
		if (filters.hideComplete && p.status === 'complete') return false;
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

/** Distinct group names across projects, in grouped display order */
export function listGroups(projects: OpenProject[]): string[] {
	return groupProjects(projects).map((g) => g.name);
}

/**
 * Compute sort-order updates to move a project up/down within its group.
 * Normalises the group to sequential 0..n-1 orders first (handles gaps and
 * missing sort orders), then swaps with the neighbour.
 * Returns the updates needed ({id, sortOrder}), or [] if the move is a no-op.
 */
export function moveProject(
	projects: OpenProject[],
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
