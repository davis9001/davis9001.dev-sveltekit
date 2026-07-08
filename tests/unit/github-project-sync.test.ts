/**
 * Tests for the two-way GitHub Projects v2 sync engine ($lib/github/project-sync)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	diffTasksForPush,
	pullProjectFromGithub,
	pushProjectToGithub,
	reconcilePulledItems
} from '../../src/lib/github/project-sync';
import type { OpenProject, Task } from '../../src/lib/projects/types';
import type { RemoteItem } from '../../src/lib/github/queries';

function task(overrides: Partial<Task> = {}): Task {
	return { text: 'Task', done: false, status: 'planning', priority: 'medium', ...overrides };
}

function project(overrides: Partial<OpenProject> = {}): OpenProject {
	return {
		id: 'p1',
		group: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primaryLink: null,
		githubUrl: 'https://github.com/starspacegroup/NebulaKit',
		extraLinks: [],
		tasks: [],
		blockers: '',
		sortOrder: 0,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-02',
		githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
		githubProjectId: 'PVT_1',
		githubSyncEnabled: true,
		githubLastSyncedAt: null,
		githubLastSyncError: null,
		githubPriorityFieldFound: false,
		...overrides
	};
}

function remoteItem(overrides: Partial<RemoteItem> = {}): RemoteItem {
	return {
		itemId: 'PVTI_1',
		issueId: 'I_1',
		issueNumber: 1,
		title: 'Remote title',
		closed: false,
		updatedAt: '2026-01-01T00:00:00Z',
		statusOptionName: null,
		priorityOptionName: null,
		...overrides
	};
}

describe('diffTasksForPush', () => {
	it('treats an unlinked task as toCreate', () => {
		const t = task({ text: 'New task' });
		const diff = diffTasksForPush([], [t]);

		expect(diff.toCreate).toEqual([t]);
		expect(diff.toUpdate).toEqual([]);
		expect(diff.toClose).toEqual([]);
	});

	it('does not flag an unchanged linked task as an update', () => {
		const t = task({ githubItemId: 'PVTI_1', text: 'Same' });
		const diff = diffTasksForPush([t], [t]);

		expect(diff.toUpdate).toEqual([]);
	});

	it('flags a linked task as toUpdate when text changed', () => {
		const previous = task({ githubItemId: 'PVTI_1', text: 'Old' });
		const updated = { ...previous, text: 'New' };
		const diff = diffTasksForPush([previous], [updated]);

		expect(diff.toUpdate).toEqual([
			{ task: updated, textChanged: true, statusChanged: false, priorityChanged: false }
		]);
	});

	it('flags a linked task as toUpdate when status changed', () => {
		const previous = task({ githubItemId: 'PVTI_1', status: 'planning' });
		const updated = { ...previous, status: 'active' as const, done: false };
		const diff = diffTasksForPush([previous], [updated]);

		expect(diff.toUpdate).toEqual([
			{ task: updated, textChanged: false, statusChanged: true, priorityChanged: false }
		]);
	});

	it('flags a linked task as toUpdate when priority changed', () => {
		const previous = task({ githubItemId: 'PVTI_1', priority: 'medium' });
		const updated = { ...previous, priority: 'high' as const };
		const diff = diffTasksForPush([previous], [updated]);

		expect(diff.toUpdate).toEqual([
			{ task: updated, textChanged: false, statusChanged: false, priorityChanged: true }
		]);
	});

	it('flags a linked task missing from the previous snapshot as a defensive full update', () => {
		const t = task({ githubItemId: 'PVTI_1' });
		const diff = diffTasksForPush([], [t]);

		expect(diff.toUpdate).toEqual([
			{ task: t, textChanged: true, statusChanged: true, priorityChanged: true }
		]);
		expect(diff.toCreate).toEqual([]);
	});

	it('treats a task present previously but absent now as toClose', () => {
		const removed = task({ githubItemId: 'PVTI_1' });
		const diff = diffTasksForPush([removed], []);

		expect(diff.toClose).toEqual([removed]);
	});

	it('handles a mixed batch of create/update/close in one diff', () => {
		const kept = task({ githubItemId: 'PVTI_kept', text: 'kept' });
		const changed = task({ githubItemId: 'PVTI_changed', text: 'old' });
		const removed = task({ githubItemId: 'PVTI_removed', text: 'gone' });
		const brandNew = task({ text: 'brand new' });

		const changedNew = { ...changed, text: 'new' };
		const diff = diffTasksForPush([kept, changed, removed], [kept, changedNew, brandNew]);

		expect(diff.toCreate).toEqual([brandNew]);
		expect(diff.toUpdate).toEqual([
			{ task: changedNew, textChanged: true, statusChanged: false, priorityChanged: false }
		]);
		expect(diff.toClose).toEqual([removed]);
	});
});

describe('reconcilePulledItems', () => {
	const statusByOptionName = { 'in progress': 'active' as const, done: 'complete' as const };
	const priorityByOptionName = { high: 'high' as const };

	it('appends a remote item with no local match', () => {
		const remote = remoteItem({ title: 'From GitHub', statusOptionName: 'In Progress' });
		const result = reconcilePulledItems([], [remote], statusByOptionName, priorityByOptionName);

		expect(result.appended).toBe(1);
		expect(result.unlinked).toBe(0);
		expect(result.merged).toEqual([
			{
				text: 'From GitHub',
				done: false,
				status: 'active',
				priority: 'medium',
				githubItemId: 'PVTI_1',
				githubIssueId: 'I_1',
				githubIssueNumber: 1,
				updatedAt: '2026-01-01T00:00:00Z'
			}
		]);
	});

	it('leaves a task with no githubItemId untouched', () => {
		const t = task({ text: 'local only' });
		const result = reconcilePulledItems([t], [], statusByOptionName, priorityByOptionName);

		expect(result.merged).toEqual([t]);
		expect(result.appended).toBe(0);
	});

	it('unlinks a local task whose item vanished from the board, keeping the task', () => {
		const t = task({
			text: 'was linked',
			githubItemId: 'PVTI_gone',
			githubIssueId: 'I_gone',
			githubIssueNumber: 9
		});
		const result = reconcilePulledItems([t], [], statusByOptionName, priorityByOptionName);

		expect(result.unlinked).toBe(1);
		expect(result.merged).toEqual([
			{ text: 'was linked', done: false, status: 'planning', priority: 'medium' }
		]);
	});

	it('remote wins when its updatedAt is newer than local', () => {
		const t = task({
			githubItemId: 'PVTI_1',
			text: 'stale local',
			status: 'planning',
			updatedAt: '2026-01-01T00:00:00Z'
		});
		const remote = remoteItem({
			title: 'fresh remote',
			statusOptionName: 'In Progress',
			updatedAt: '2026-01-02T00:00:00Z'
		});

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toMatchObject({ text: 'fresh remote', status: 'active', done: false });
		expect(result.conflicts).toEqual([{ text: 'fresh remote', resolution: 'remote' }]);
	});

	it('local wins when its updatedAt is newer than remote', () => {
		const t = task({
			githubItemId: 'PVTI_1',
			text: 'fresh local',
			status: 'blocked',
			updatedAt: '2026-01-03T00:00:00Z'
		});
		const remote = remoteItem({
			title: 'stale remote',
			statusOptionName: 'In Progress',
			updatedAt: '2026-01-02T00:00:00Z'
		});

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toEqual(t);
		expect(result.conflicts).toEqual([{ text: 'fresh local', resolution: 'local' }]);
	});

	it('treats a closed remote issue as complete regardless of the Status field value', () => {
		const t = task({ githubItemId: 'PVTI_1', updatedAt: '2026-01-01T00:00:00Z' });
		const remote = remoteItem({
			closed: true,
			statusOptionName: 'In Progress', // would otherwise map to 'active'
			updatedAt: '2026-01-02T00:00:00Z'
		});

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toMatchObject({ status: 'complete', done: true });
	});

	it('maps a Priority field value on both append and remote-wins paths', () => {
		const remote = remoteItem({ priorityOptionName: 'High' });
		const result = reconcilePulledItems([], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toMatchObject({ priority: 'high' });
	});

	it('does not report a conflict when local and remote timestamps are equal', () => {
		const t = task({ githubItemId: 'PVTI_1', updatedAt: '2026-01-01T00:00:00Z' });
		const remote = remoteItem({ updatedAt: '2026-01-01T00:00:00Z' });

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.conflicts).toEqual([]);
	});

	it('treats a task with no updatedAt as epoch 0, so remote always wins', () => {
		const t = task({ githubItemId: 'PVTI_1', text: 'never synced before' });
		const remote = remoteItem({ title: 'from github' });

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toMatchObject({ text: 'from github' });
	});

	it('treats an unparsable updatedAt as epoch 0', () => {
		const t = task({ githubItemId: 'PVTI_1', text: 'bad timestamp', updatedAt: 'not-a-date' });
		const remote = remoteItem({ title: 'from github' });

		const result = reconcilePulledItems([t], [remote], statusByOptionName, priorityByOptionName);

		expect(result.merged[0]).toMatchObject({ text: 'from github' });
	});

	it('handles a mixed batch: kept, unlinked, remote-wins, and appended together', () => {
		const kept = task({
			text: 'kept',
			githubItemId: 'PVTI_kept',
			updatedAt: '2026-01-05T00:00:00Z'
		});
		const unlinkMe = task({ text: 'unlink me', githubItemId: 'PVTI_unlink' });
		const staleLocal = task({
			text: 'stale',
			githubItemId: 'PVTI_stale',
			updatedAt: '2026-01-01T00:00:00Z'
		});

		const keptRemote = remoteItem({
			itemId: 'PVTI_kept',
			title: 'kept',
			updatedAt: '2026-01-01T00:00:00Z'
		});
		const staleRemote = remoteItem({
			itemId: 'PVTI_stale',
			title: 'fresh',
			updatedAt: '2026-01-06T00:00:00Z'
		});
		const newRemote = remoteItem({ itemId: 'PVTI_new', title: 'new from github' });

		const result = reconcilePulledItems(
			[kept, unlinkMe, staleLocal],
			[keptRemote, staleRemote, newRemote],
			statusByOptionName,
			priorityByOptionName
		);

		expect(result.appended).toBe(1);
		expect(result.unlinked).toBe(1);
		expect(result.merged.map((t) => t.text)).toEqual([
			'kept',
			'unlink me',
			'fresh',
			'new from github'
		]);
	});
});

describe('pushProjectToGithub', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns an error without mutating tasks when the project is unlinked', async () => {
		const p = project({ githubProjectId: null });

		const result = await pushProjectToGithub('tok', p, []);

		expect(result.error).toMatch(/not linked/);
		expect(result.tasks).toBe(p.tasks);
	});

	it('returns an error when githubUrl is not a valid repo URL', async () => {
		const p = project({ githubUrl: 'not-a-url' });

		const result = await pushProjectToGithub('tok', p, []);

		expect(result.error).toMatch(/valid GitHub repo URL/);
	});

	it('creates an issue, adds it to the board, and sets discovered fields', async () => {
		const newTask = task({ text: 'Ship it', status: 'active', priority: 'high' });
		const p = project({ tasks: [newTask] });

		let call = 0;
		globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
			call++;
			const body = init?.body ? JSON.parse(init.body) : {};
			// 1: fetchProjectV2Fields
			if (call === 1) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({
						data: {
							node: {
								fields: {
									nodes: [
										{
											id: 'F_status',
											name: 'Status',
											options: [{ id: 'O_active', name: 'In Progress' }]
										},
										{
											id: 'F_priority',
											name: 'Priority',
											options: [{ id: 'O_high', name: 'High' }]
										}
									]
								}
							}
						}
					})
				};
			}
			// 2: createIssue (REST)
			if (call === 2) {
				expect(url).toBe('https://api.github.com/repos/starspacegroup/NebulaKit/issues');
				expect(body).toEqual({ title: 'Ship it' });
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ node_id: 'I_new', number: 7 })
				};
			}
			// 3: addProjectV2Item
			if (call === 3) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { addProjectV2ItemById: { item: { id: 'PVTI_new' } } } })
				};
			}
			// 4: set Status field value
			if (call === 4) {
				expect(body.variables).toEqual({
					projectId: 'PVT_1',
					itemId: 'PVTI_new',
					fieldId: 'F_status',
					optionId: 'O_active'
				});
				return { ok: true, headers: new Headers(), json: async () => ({ data: {} }) };
			}
			// 5: set Priority field value
			expect(body.variables).toEqual({
				projectId: 'PVT_1',
				itemId: 'PVTI_new',
				fieldId: 'F_priority',
				optionId: 'O_high'
			});
			return { ok: true, headers: new Headers(), json: async () => ({ data: {} }) };
		});

		const result = await pushProjectToGithub('tok', p, []);

		expect(result.error).toBeUndefined();
		expect(result.priorityFieldFound).toBe(true);
		expect(result.tasks[0]).toMatchObject({
			text: 'Ship it',
			githubItemId: 'PVTI_new',
			githubIssueId: 'I_new',
			githubIssueNumber: 7
		});
		expect(result.tasks[0].updatedAt).toBeTruthy();
	});

	it('updates an existing linked task: title, open/closed state, and both field values', async () => {
		const previous = task({
			githubItemId: 'PVTI_1',
			githubIssueId: 'I_1',
			githubIssueNumber: 1,
			text: 'Old title',
			status: 'planning',
			priority: 'medium'
		});
		const updated = {
			...previous,
			text: 'New title',
			status: 'complete' as const,
			priority: 'high' as const,
			done: true
		};
		const p = project({ tasks: [updated] });

		const calls: { url: string; method: string; body: any }[] = [];
		globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
			const body = init?.body ? JSON.parse(init.body) : {};
			calls.push({ url, method: init?.method ?? 'POST', body });
			if (url.includes('/graphql')) {
				if (calls.length === 1) {
					return {
						ok: true,
						headers: new Headers(),
						json: async () => ({
							data: {
								node: {
									fields: {
										nodes: [
											{ id: 'F_status', name: 'Status', options: [{ id: 'O_done', name: 'Done' }] },
											{
												id: 'F_priority',
												name: 'Priority',
												options: [{ id: 'O_high', name: 'High' }]
											}
										]
									}
								}
							}
						})
					};
				}
				return { ok: true, headers: new Headers(), json: async () => ({ data: {} }) };
			}
			return { ok: true, headers: new Headers(), json: async () => ({}) };
		});

		const result = await pushProjectToGithub('tok', p, [previous]);

		expect(result.error).toBeUndefined();
		const patch = calls.find((c) => c.method === 'PATCH');
		expect(patch?.body).toEqual({ title: 'New title', state: 'closed' });
		const fieldUpdates = calls.filter((c) =>
			c.body.query?.includes('updateProjectV2ItemFieldValue')
		);
		expect(fieldUpdates).toHaveLength(2);
		expect(fieldUpdates.map((c) => c.body.variables.fieldId).sort()).toEqual([
			'F_priority',
			'F_status'
		]);
		expect(result.tasks[0]).toMatchObject({
			text: 'New title',
			status: 'complete',
			priority: 'high'
		});
		expect(result.tasks[0].updatedAt).toBeTruthy();
	});

	it('updates only the title (not status/priority) when only text changed', async () => {
		const previous = task({
			githubItemId: 'PVTI_1',
			githubIssueId: 'I_1',
			githubIssueNumber: 1,
			text: 'Old title'
		});
		const updated = { ...previous, text: 'New title only' };
		const p = project({ tasks: [updated] });

		const calls: { url: string; method: string; body: any }[] = [];
		globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
			const body = init?.body ? JSON.parse(init.body) : {};
			calls.push({ url, method: init?.method ?? 'POST', body });
			if (url.includes('/graphql')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { node: { fields: { nodes: [] } } } })
				};
			}
			return { ok: true, headers: new Headers(), json: async () => ({}) };
		});

		const result = await pushProjectToGithub('tok', p, [previous]);

		expect(result.error).toBeUndefined();
		const patch = calls.find((c) => c.method === 'PATCH');
		expect(patch?.body).toEqual({ title: 'New title only' });
		expect(result.tasks[0]).toMatchObject({ text: 'New title only' });
	});

	it('updates only the open/closed state (not title) when only status changed', async () => {
		const previous = task({
			githubItemId: 'PVTI_1',
			githubIssueId: 'I_1',
			githubIssueNumber: 1,
			text: 'Same title',
			status: 'planning'
		});
		const updated = { ...previous, status: 'complete' as const, done: true };
		const p = project({ tasks: [updated] });

		const calls: { url: string; method: string; body: any }[] = [];
		globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
			const body = init?.body ? JSON.parse(init.body) : {};
			calls.push({ url, method: init?.method ?? 'POST', body });
			if (url.includes('/graphql')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { node: { fields: { nodes: [] } } } })
				};
			}
			return { ok: true, headers: new Headers(), json: async () => ({}) };
		});

		const result = await pushProjectToGithub('tok', p, [previous]);

		expect(result.error).toBeUndefined();
		const patch = calls.find((c) => c.method === 'PATCH');
		expect(patch?.body).toEqual({ state: 'closed' });
		expect(result.tasks[0]).toMatchObject({ status: 'complete' });
	});

	it('skips a toUpdate entry with no githubIssueNumber (defensive guard)', async () => {
		const previous = task({ githubItemId: 'PVTI_1', text: 'no issue number' });
		const updated = { ...previous, text: 'changed but unresolvable' };
		const p = project({ tasks: [updated] });

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ data: { node: { fields: { nodes: [] } } } })
		});

		const result = await pushProjectToGithub('tok', p, [previous]);

		expect(result.error).toBeUndefined();
		// Task is left as-is (no updatedAt stamp) since the guard skipped it before any mutation.
		expect(result.tasks[0]).toBe(updated);
	});

	it('closes the issue and removes the board item for a locally-deleted task', async () => {
		const removed = task({ githubItemId: 'PVTI_1', githubIssueId: 'I_1', githubIssueNumber: 1 });
		const p = project({ tasks: [] });

		const calls: string[] = [];
		globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
			calls.push(`${init?.method ?? 'POST'} ${url}`);
			if (url.includes('/graphql')) {
				if (calls.length === 1) {
					return {
						ok: true,
						headers: new Headers(),
						json: async () => ({ data: { node: { fields: { nodes: [] } } } })
					};
				}
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { deleteProjectV2Item: { deletedItemId: 'PVTI_1' } } })
				};
			}
			return { ok: true, headers: new Headers(), json: async () => ({}) };
		});

		const result = await pushProjectToGithub('tok', p, [removed]);

		expect(result.error).toBeUndefined();
		expect(calls).toContain('PATCH https://api.github.com/repos/starspacegroup/NebulaKit/issues/1');
		expect(calls.filter((c) => c.includes('/graphql')).length).toBe(2);
	});

	it('surfaces a GitHub API error without losing the current tasks', async () => {
		const p = project({ tasks: [task({ text: 'Ship it' })] });
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 401, headers: new Headers() });

		const result = await pushProjectToGithub('tok', p, []);

		expect(result.error).toBeTruthy();
		expect(result.tasks).toBe(p.tasks);
	});

	it('falls back to a generic message when a non-Error is thrown', async () => {
		const p = project({ tasks: [task({ text: 'Ship it' })] });
		globalThis.fetch = vi.fn().mockRejectedValue('a plain string rejection');

		const result = await pushProjectToGithub('tok', p, []);

		expect(result.error).toBe('Unknown GitHub sync error');
	});
});

describe('pullProjectFromGithub', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns an error when the project is unlinked', async () => {
		const p = project({ githubProjectId: null });

		const result = await pullProjectFromGithub('tok', p);

		expect(result.error).toMatch(/not linked/);
	});

	it('merges remote items and reports field/appended summary', async () => {
		const p = project({ tasks: [] });
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('fields(first: 50)')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({
						data: {
							node: {
								fields: {
									nodes: [
										{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Done' }] },
										{ id: 'F_priority', name: 'Priority', options: [{ id: 'O2', name: 'High' }] }
									]
								}
							}
						}
					})
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({
					data: {
						node: {
							items: {
								pageInfo: { hasNextPage: false, endCursor: null },
								nodes: [
									{
										id: 'PVTI_1',
										fieldValues: {
											nodes: [
												{ field: { name: 'Status' }, name: 'Done' },
												{ field: { name: 'Priority' }, name: 'High' }
											]
										},
										content: {
											id: 'I_1',
											number: 1,
											title: 'From GitHub',
											closed: true,
											updatedAt: '2026-01-01T00:00:00Z'
										}
									}
								]
							}
						}
					}
				})
			};
		});

		const result = await pullProjectFromGithub('tok', p);

		expect(result.error).toBeUndefined();
		expect(result.priorityFieldFound).toBe(true);
		expect(result.tasks[0]).toMatchObject({ priority: 'high' });
		expect(result.appended).toBe(1);
		expect(result.tasks[0]).toMatchObject({ text: 'From GitHub', status: 'complete' });
	});

	it('surfaces a GitHub API error without losing the current tasks', async () => {
		const p = project({ tasks: [task({ text: 'keep me' })] });
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 500, headers: new Headers() });

		const result = await pullProjectFromGithub('tok', p);

		expect(result.error).toBeTruthy();
		expect(result.tasks).toBe(p.tasks);
	});

	it('falls back to a generic message when a non-Error is thrown', async () => {
		const p = project({ tasks: [task({ text: 'keep me' })] });
		globalThis.fetch = vi.fn().mockRejectedValue({ weird: 'not an Error instance' });

		const result = await pullProjectFromGithub('tok', p);

		expect(result.error).toBe('Unknown GitHub sync error');
	});

	it('reconciles with empty mappings when the board has no Status/Priority fields', async () => {
		const p = project({ tasks: [] });
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('fields(first: 50)')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { node: { fields: { nodes: [] } } } })
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({
					data: {
						node: {
							items: {
								pageInfo: { hasNextPage: false, endCursor: null },
								nodes: [
									{
										id: 'PVTI_1',
										fieldValues: { nodes: [] },
										content: {
											id: 'I_1',
											number: 1,
											title: 'No fields board',
											closed: false,
											updatedAt: '2026-01-01T00:00:00Z'
										}
									}
								]
							}
						}
					}
				})
			};
		});

		const result = await pullProjectFromGithub('tok', p);

		expect(result.error).toBeUndefined();
		expect(result.priorityFieldFound).toBe(false);
		expect(result.tasks[0]).toMatchObject({
			text: 'No fields board',
			status: 'planning',
			priority: 'medium'
		});
	});
});
