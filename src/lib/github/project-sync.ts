/**
 * Two-way sync engine between an OpenProject's tasks and a GitHub Projects
 * v2 board. Split for testability:
 *   - diffTasksForPush / reconcilePulledItems are pure (data in, data out)
 *     and carry the bulk of this feature's test coverage.
 *   - pushProjectToGithub / pullProjectFromGithub orchestrate the pure
 *     functions against the GitHub client — these are the only parts that
 *     need fetch/D1 mocked in tests.
 */

import type { OpenProject, ProjectPriority, ProjectStatus, Task } from '$lib/projects/types';
import { findPriorityFieldMapping, findStatusFieldMapping } from './field-mapping';
import {
	addProjectV2Item,
	createIssue,
	deleteProjectV2Item,
	fetchProjectV2Fields,
	listProjectItems,
	updateIssue,
	updateProjectV2ItemFieldValue,
	type RemoteItem
} from './queries';
import { parseRepoUrl } from './url';

// ── Pure: push-side diff ────────────────────────────────────────────────

export interface TaskUpdateDiff {
	task: Task;
	textChanged: boolean;
	statusChanged: boolean;
	priorityChanged: boolean;
}

export interface PushDiff {
	toCreate: Task[];
	toUpdate: TaskUpdateDiff[];
	toClose: Task[];
}

/**
 * Diff a project's previous (pre-save) and new (post-save) task lists to
 * decide what needs pushing. Identity is `githubItemId`: absent = never
 * synced (create); present in both = compare fields (update if changed);
 * present in previous but absent in new = removed locally (close + remove
 * from board).
 */
export function diffTasksForPush(previousTasks: Task[], newTasks: Task[]): PushDiff {
	const previousByItemId = new Map(
		previousTasks.filter((t) => t.githubItemId).map((t) => [t.githubItemId as string, t])
	);
	const newLinkedIds = new Set(newTasks.filter((t) => t.githubItemId).map((t) => t.githubItemId));

	const toCreate: Task[] = [];
	const toUpdate: TaskUpdateDiff[] = [];

	for (const task of newTasks) {
		if (!task.githubItemId) {
			toCreate.push(task);
			continue;
		}
		const previous = previousByItemId.get(task.githubItemId);
		if (!previous) {
			// Linked but not in the pre-save snapshot (e.g. just pulled) —
			// push current values defensively.
			toUpdate.push({ task, textChanged: true, statusChanged: true, priorityChanged: true });
			continue;
		}
		const textChanged = previous.text !== task.text;
		const statusChanged = previous.status !== task.status;
		const priorityChanged = previous.priority !== task.priority;
		if (textChanged || statusChanged || priorityChanged) {
			toUpdate.push({ task, textChanged, statusChanged, priorityChanged });
		}
	}

	const toClose = previousTasks.filter((t) => t.githubItemId && !newLinkedIds.has(t.githubItemId));

	return { toCreate, toUpdate, toClose };
}

// ── Pure: pull-side reconciliation ──────────────────────────────────────

export interface ReconcileConflict {
	text: string;
	resolution: 'local' | 'remote';
}

export interface ReconcileResult {
	merged: Task[];
	appended: number;
	unlinked: number;
	conflicts: ReconcileConflict[];
}

function epochMillis(iso: string | undefined): number {
	if (!iso) return 0;
	const ms = Date.parse(iso);
	return Number.isFinite(ms) ? ms : 0;
}

function remoteStatus(
	remote: RemoteItem,
	statusByOptionName: Record<string, ProjectStatus>,
	fallback: ProjectStatus
): ProjectStatus {
	// A closed Issue is authoritative for "complete" regardless of the
	// Status single-select value — an admin can close an issue directly.
	if (remote.closed) return 'complete';
	const mapped = remote.statusOptionName
		? statusByOptionName[remote.statusOptionName.toLowerCase()]
		: undefined;
	return mapped ?? fallback;
}

function remotePriority(
	remote: RemoteItem,
	priorityByOptionName: Record<string, ProjectPriority>,
	fallback: ProjectPriority
): ProjectPriority {
	const mapped = remote.priorityOptionName
		? priorityByOptionName[remote.priorityOptionName.toLowerCase()]
		: undefined;
	return mapped ?? fallback;
}

/**
 * Reconcile a board's current items against local tasks: last-write-wins by
 * timestamp for tasks linked on both sides, append remote items with no
 * local match, and unlink (not delete) local tasks whose item vanished from
 * the board.
 */
export function reconcilePulledItems(
	localTasks: Task[],
	remoteItems: RemoteItem[],
	statusByOptionName: Record<string, ProjectStatus>,
	priorityByOptionName: Record<string, ProjectPriority>
): ReconcileResult {
	const remoteByItemId = new Map(remoteItems.map((r) => [r.itemId, r]));
	const seenItemIds = new Set<string>();
	const conflicts: ReconcileConflict[] = [];
	let appended = 0;
	let unlinked = 0;
	const merged: Task[] = [];

	for (const task of localTasks) {
		if (!task.githubItemId) {
			merged.push(task);
			continue;
		}
		seenItemIds.add(task.githubItemId);

		const remote = remoteByItemId.get(task.githubItemId);
		if (!remote) {
			unlinked++;
			const {
				githubItemId: _itemId,
				githubIssueId: _issueId,
				githubIssueNumber: _issueNumber,
				...rest
			} = task;
			merged.push(rest);
			continue;
		}

		const localMs = epochMillis(task.updatedAt);
		const remoteMs = epochMillis(remote.updatedAt);

		if (remoteMs > localMs) {
			merged.push({
				...task,
				text: remote.title,
				status: remoteStatus(remote, statusByOptionName, task.status),
				priority: remotePriority(remote, priorityByOptionName, task.priority),
				done: remoteStatus(remote, statusByOptionName, task.status) === 'complete',
				githubIssueId: remote.issueId,
				githubIssueNumber: remote.issueNumber,
				updatedAt: remote.updatedAt
			});
			conflicts.push({ text: remote.title, resolution: 'remote' });
		} else {
			merged.push(task);
			if (localMs > 0 && remoteMs > 0 && localMs !== remoteMs) {
				conflicts.push({ text: task.text, resolution: 'local' });
			}
		}
	}

	for (const remote of remoteItems) {
		if (seenItemIds.has(remote.itemId)) continue;
		appended++;
		const status = remoteStatus(remote, statusByOptionName, 'planning');
		merged.push({
			text: remote.title,
			done: status === 'complete',
			status,
			priority: remotePriority(remote, priorityByOptionName, 'medium'),
			githubItemId: remote.itemId,
			githubIssueId: remote.issueId,
			githubIssueNumber: remote.issueNumber,
			updatedAt: remote.updatedAt
		});
	}

	return { merged, appended, unlinked, conflicts };
}

// ── Impure: orchestration ───────────────────────────────────────────────

export interface PushResult {
	tasks: Task[];
	priorityFieldFound: boolean;
	error?: string;
}

export interface PullResult {
	tasks: Task[];
	priorityFieldFound: boolean;
	appended: number;
	unlinked: number;
	conflicts: ReconcileConflict[];
	error?: string;
}

function nowIso(): string {
	return new Date().toISOString();
}

/** Push local task changes to the linked repo (Issues) and board (fields). */
export async function pushProjectToGithub(
	token: string,
	project: OpenProject,
	previousTasks: Task[]
): Promise<PushResult> {
	if (!project.githubProjectId || !project.githubUrl) {
		return {
			tasks: project.tasks,
			priorityFieldFound: project.githubPriorityFieldFound,
			error: 'Project is not linked to a GitHub repo and board'
		};
	}
	const repo = parseRepoUrl(project.githubUrl);
	if (!repo) {
		return {
			tasks: project.tasks,
			priorityFieldFound: project.githubPriorityFieldFound,
			error: 'githubUrl is not a valid GitHub repo URL'
		};
	}

	try {
		const fields = await fetchProjectV2Fields(token, project.githubProjectId);
		const statusMapping = findStatusFieldMapping(fields);
		const priorityMapping = findPriorityFieldMapping(fields);

		const diff = diffTasksForPush(previousTasks, project.tasks);
		const tasks = [...project.tasks];

		for (const task of diff.toCreate) {
			const { issueId, issueNumber } = await createIssue(token, repo.owner, repo.repo, task.text);
			const itemId = await addProjectV2Item(token, project.githubProjectId, issueId);
			if (statusMapping?.optionIdByStatus[task.status]) {
				await updateProjectV2ItemFieldValue(
					token,
					project.githubProjectId,
					itemId,
					statusMapping.fieldId,
					statusMapping.optionIdByStatus[task.status] as string
				);
			}
			if (priorityMapping?.optionIdByPriority[task.priority]) {
				await updateProjectV2ItemFieldValue(
					token,
					project.githubProjectId,
					itemId,
					priorityMapping.fieldId,
					priorityMapping.optionIdByPriority[task.priority] as string
				);
			}
			const idx = tasks.findIndex((t) => t === task);
			tasks[idx] = {
				...task,
				githubItemId: itemId,
				githubIssueId: issueId,
				githubIssueNumber: issueNumber,
				updatedAt: nowIso()
			};
		}

		for (const { task, textChanged, statusChanged, priorityChanged } of diff.toUpdate) {
			if (!task.githubIssueNumber) continue;
			if (textChanged || statusChanged) {
				await updateIssue(token, repo.owner, repo.repo, task.githubIssueNumber, {
					...(textChanged ? { title: task.text } : {}),
					...(statusChanged ? { state: task.status === 'complete' ? 'closed' : 'open' } : {})
				});
			}
			if (statusChanged && statusMapping?.optionIdByStatus[task.status]) {
				await updateProjectV2ItemFieldValue(
					token,
					project.githubProjectId,
					task.githubItemId as string,
					statusMapping.fieldId,
					statusMapping.optionIdByStatus[task.status] as string
				);
			}
			if (priorityChanged && priorityMapping?.optionIdByPriority[task.priority]) {
				await updateProjectV2ItemFieldValue(
					token,
					project.githubProjectId,
					task.githubItemId as string,
					priorityMapping.fieldId,
					priorityMapping.optionIdByPriority[task.priority] as string
				);
			}
			const idx = tasks.findIndex((t) => t.githubItemId === task.githubItemId);
			tasks[idx] = { ...task, updatedAt: nowIso() };
		}

		for (const task of diff.toClose) {
			if (task.githubIssueNumber) {
				await updateIssue(token, repo.owner, repo.repo, task.githubIssueNumber, {
					state: 'closed'
				});
			}
			if (task.githubItemId) {
				await deleteProjectV2Item(token, project.githubProjectId, task.githubItemId);
			}
		}

		return { tasks, priorityFieldFound: priorityMapping !== null };
	} catch (err) {
		return {
			tasks: project.tasks,
			priorityFieldFound: project.githubPriorityFieldFound,
			error: err instanceof Error ? err.message : 'Unknown GitHub sync error'
		};
	}
}

/** Pull the board's current items into local tasks. */
export async function pullProjectFromGithub(
	token: string,
	project: OpenProject
): Promise<PullResult> {
	if (!project.githubProjectId) {
		return {
			tasks: project.tasks,
			priorityFieldFound: project.githubPriorityFieldFound,
			appended: 0,
			unlinked: 0,
			conflicts: [],
			error: 'Project is not linked to a GitHub board'
		};
	}

	try {
		const [fields, remoteItems] = await Promise.all([
			fetchProjectV2Fields(token, project.githubProjectId),
			listProjectItems(token, project.githubProjectId)
		]);
		const statusMapping = findStatusFieldMapping(fields);
		const priorityMapping = findPriorityFieldMapping(fields);

		const result = reconcilePulledItems(
			project.tasks,
			remoteItems,
			statusMapping?.statusByOptionName ?? {},
			priorityMapping?.priorityByOptionName ?? {}
		);

		return {
			tasks: result.merged,
			priorityFieldFound: priorityMapping !== null,
			appended: result.appended,
			unlinked: result.unlinked,
			conflicts: result.conflicts
		};
	} catch (err) {
		return {
			tasks: project.tasks,
			priorityFieldFound: project.githubPriorityFieldFound,
			appended: 0,
			unlinked: 0,
			conflicts: [],
			error: err instanceof Error ? err.message : 'Unknown GitHub sync error'
		};
	}
}
