/**
 * Tests for the Admin Projects Dashboard logic ($lib/admin/projects-dashboard)
 * and the /admin/projects server load.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenProject } from '../../src/lib/projects/types';
import {
	computeStats,
	filterProjects,
	groupProjects,
	listGroups,
	moveProject,
	PROJECT_PRIORITIES,
	PROJECT_STATUSES,
	taskProgress
} from '../../src/lib/admin/projects-dashboard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<OpenProject> = {}): OpenProject {
	return {
		id: 'p-1',
		group: '*Space',
		name: 'Proj',
		status: 'active',
		priority: 'medium',
		description: '',
		primaryLink: null,
		githubUrl: null,
		extraLinks: [],
		tasks: [],
		blockers: '',
		sortOrder: 0,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-02',
		githubProjectUrl: null,
		githubProjectId: null,
		githubSyncEnabled: false,
		githubLastSyncedAt: null,
		githubLastSyncError: null,
		githubPriorityFieldFound: false,
		...overrides
	};
}

// ─── computeStats ─────────────────────────────────────────────────────────────

describe('computeStats', () => {
	it('returns zeros for an empty list', () => {
		const stats = computeStats([]);
		expect(stats.total).toBe(0);
		expect(stats.taskPercent).toBe(0);
		expect(stats.withBlockers).toBe(0);
		for (const s of PROJECT_STATUSES) expect(stats.byStatus[s]).toBe(0);
		for (const p of PROJECT_PRIORITIES) expect(stats.byPriority[p]).toBe(0);
	});

	it('counts statuses, priorities, tasks and blockers', () => {
		const stats = computeStats([
			makeProject({
				status: 'active',
				priority: 'high',
				tasks: [
					{ text: 'a', done: true, status: 'complete', priority: 'medium' },
					{ text: 'b', done: false, status: 'planning', priority: 'medium' }
				],
				blockers: 'stuck'
			}),
			makeProject({
				id: 'p-2',
				status: 'blocked',
				priority: 'low',
				tasks: [{ text: 'c', done: true, status: 'complete', priority: 'medium' }]
			}),
			makeProject({ id: 'p-3', status: 'active', blockers: '   ' })
		]);

		expect(stats.total).toBe(3);
		expect(stats.byStatus.active).toBe(2);
		expect(stats.byStatus.blocked).toBe(1);
		expect(stats.byPriority.high).toBe(1);
		expect(stats.byPriority.medium).toBe(1);
		expect(stats.byPriority.low).toBe(1);
		expect(stats.openTasks).toBe(1);
		expect(stats.doneTasks).toBe(2);
		expect(stats.totalTasks).toBe(3);
		expect(stats.taskPercent).toBe(67);
		expect(stats.withBlockers).toBe(1); // whitespace-only blockers don't count
	});
});

// ─── taskProgress ─────────────────────────────────────────────────────────────

describe('taskProgress', () => {
	it('returns 0% for no tasks', () => {
		expect(taskProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
	});

	it('computes rounded percent', () => {
		expect(
			taskProgress([
				{ text: 'a', done: true, status: 'complete', priority: 'medium' },
				{ text: 'b', done: false, status: 'planning', priority: 'medium' },
				{ text: 'c', done: false, status: 'planning', priority: 'medium' }
			])
		).toEqual({ done: 1, total: 3, percent: 33 });
	});
});

// ─── filterProjects ───────────────────────────────────────────────────────────

describe('filterProjects', () => {
	const projects = [
		makeProject({
			id: 'a',
			name: 'NebulaKit',
			group: '*Space',
			status: 'active',
			priority: 'high',
			description: 'CMS framework',
			tasks: [{ text: 'write docs', done: false, status: 'planning', priority: 'medium' }]
		}),
		makeProject({
			id: 'b',
			name: 'AgapeVerse',
			group: 'Personal',
			status: 'complete',
			priority: 'low',
			blockers: 'waiting on domain'
		}),
		makeProject({
			id: 'c',
			name: 'SpaceBot',
			group: '*Space',
			status: 'blocked',
			priority: 'medium'
		})
	];

	it('returns all projects with no filters', () => {
		expect(filterProjects(projects, {})).toHaveLength(3);
	});

	it('filters by status', () => {
		expect(filterProjects(projects, { status: 'blocked' }).map((p) => p.id)).toEqual(['c']);
	});

	it('filters by priority', () => {
		expect(filterProjects(projects, { priority: 'high' }).map((p) => p.id)).toEqual(['a']);
	});

	it('filters by group', () => {
		expect(filterProjects(projects, { group: 'Personal' }).map((p) => p.id)).toEqual(['b']);
	});

	it('hides complete projects', () => {
		expect(filterProjects(projects, { hideComplete: true }).map((p) => p.id)).toEqual(['a', 'c']);
	});

	it('shows only projects with blockers', () => {
		expect(filterProjects(projects, { blockersOnly: true }).map((p) => p.id)).toEqual(['b']);
	});

	it('searches across name, description, tasks, blockers and group', () => {
		expect(filterProjects(projects, { search: 'nebula' }).map((p) => p.id)).toEqual(['a']);
		expect(filterProjects(projects, { search: 'CMS FRAME' }).map((p) => p.id)).toEqual(['a']);
		expect(filterProjects(projects, { search: 'write docs' }).map((p) => p.id)).toEqual(['a']);
		expect(filterProjects(projects, { search: 'domain' }).map((p) => p.id)).toEqual(['b']);
		expect(filterProjects(projects, { search: 'personal' }).map((p) => p.id)).toEqual(['b']);
		expect(filterProjects(projects, { search: 'zzz-no-match' })).toEqual([]);
	});

	it('ignores whitespace-only search', () => {
		expect(filterProjects(projects, { search: '   ' })).toHaveLength(3);
	});

	it('combines filters', () => {
		expect(
			filterProjects(projects, { group: '*Space', status: 'active' }).map((p) => p.id)
		).toEqual(['a']);
	});
});

// ─── groupProjects / listGroups ───────────────────────────────────────────────

describe('groupProjects', () => {
	it('orders preferred groups first, extras after', () => {
		const groups = groupProjects([
			makeProject({ id: 'x', group: 'Zeta' }),
			makeProject({ id: 'y', group: 'Personal' }),
			makeProject({ id: 'z', group: '*Space' })
		]);
		expect(groups.map((g) => g.name)).toEqual(['*Space', 'Personal', 'Zeta']);
	});

	it('sorts projects within a group by sortOrder', () => {
		const groups = groupProjects([
			makeProject({ id: 'b', sortOrder: 5 }),
			makeProject({ id: 'a', sortOrder: 1 })
		]);
		expect(groups[0].projects.map((p) => p.id)).toEqual(['a', 'b']);
	});

	it('respects a custom group order', () => {
		const groups = groupProjects(
			[makeProject({ id: 'y', group: 'Personal' }), makeProject({ id: 'z', group: '*Space' })],
			['Personal']
		);
		expect(groups.map((g) => g.name)).toEqual(['Personal', '*Space']);
	});

	it('listGroups returns distinct names in display order', () => {
		expect(
			listGroups([
				makeProject({ group: 'Zeta' }),
				makeProject({ group: '*Space' }),
				makeProject({ group: '*Space' })
			])
		).toEqual(['*Space', 'Zeta']);
	});
});

// ─── moveProject ──────────────────────────────────────────────────────────────

describe('moveProject', () => {
	const group = [
		makeProject({ id: 'a', sortOrder: 0 }),
		makeProject({ id: 'b', sortOrder: 1 }),
		makeProject({ id: 'c', sortOrder: 2 })
	];

	it('returns [] for unknown id', () => {
		expect(moveProject(group, 'nope', 'up')).toEqual([]);
	});

	it('returns [] when moving the first project up', () => {
		expect(moveProject(group, 'a', 'up')).toEqual([]);
	});

	it('returns [] when moving the last project down', () => {
		expect(moveProject(group, 'c', 'down')).toEqual([]);
	});

	it('swaps neighbours when moving down', () => {
		const updates = moveProject(group, 'a', 'down');
		expect(updates).toEqual(
			expect.arrayContaining([
				{ id: 'a', sortOrder: 1 },
				{ id: 'b', sortOrder: 0 }
			])
		);
		expect(updates).toHaveLength(2);
	});

	it('swaps neighbours when moving up', () => {
		const updates = moveProject(group, 'c', 'up');
		expect(updates).toEqual(
			expect.arrayContaining([
				{ id: 'c', sortOrder: 1 },
				{ id: 'b', sortOrder: 2 }
			])
		);
	});

	it('normalises gapped sort orders (e.g. legacy 999s)', () => {
		const gapped = [
			makeProject({ id: 'a', sortOrder: 0 }),
			makeProject({ id: 'b', sortOrder: 999 }),
			makeProject({ id: 'c', sortOrder: 999 })
		];
		const updates = moveProject(gapped, 'b', 'down');
		// b and c swap; everything lands on sequential 0..2
		const byId = Object.fromEntries(updates.map((u) => [u.id, u.sortOrder]));
		expect(byId.b).toBe(2);
		expect(byId.c).toBe(1);
	});

	it('only moves within the target project group', () => {
		const mixed = [
			makeProject({ id: 'a', group: '*Space', sortOrder: 0 }),
			makeProject({ id: 'b', group: 'Personal', sortOrder: 1 }),
			makeProject({ id: 'c', group: '*Space', sortOrder: 1 })
		];
		const updates = moveProject(mixed, 'c', 'up');
		expect(updates.every((u) => u.id !== 'b')).toBe(true);
	});
});

// ─── /admin/projects +page.server.ts ─────────────────────────────────────────

const projectRow = {
	id: 'p1',
	group_name: '*Space',
	name: 'NebulaKit',
	status: 'active',
	priority: 'high',
	description: '',
	primary_link: null,
	github_url: null,
	extra_links: '[]',
	tasks: '[{"text":"Ship","done":false}]',
	blockers: '',
	sort_order: 0,
	created_at: '2026-01-01',
	updated_at: '2026-01-02'
};

describe('/admin/projects page server load', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('throws 500 when database is not available', async () => {
		const { load } = await import('../../src/routes/admin/projects/+page.server.js');
		try {
			await load({ platform: { env: {} } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it('returns mapped projects from the open_projects table', async () => {
		const { load } = await import('../../src/routes/admin/projects/+page.server.js');
		const all = vi.fn().mockResolvedValue({ results: [projectRow] });
		const db = { prepare: vi.fn().mockReturnValue({ all, bind: vi.fn() }) };

		const result = (await load({ platform: { env: { DB: db } } } as any)) as any;

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]).toMatchObject({
			id: 'p1',
			name: 'NebulaKit',
			status: 'active',
			tasks: [{ text: 'Ship', done: false, status: 'planning', priority: 'medium' }]
		});
	});
});

// ─── /admin/projects/[id] +page.server.ts ────────────────────────────────────

describe('/admin/projects/[id] page server load', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('throws 500 when database is not available', async () => {
		const { load } = await import('../../src/routes/admin/projects/[id]/+page.server.js');
		try {
			await load({ platform: { env: {} }, params: { id: 'p1' } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it('throws 404 for an unknown project', async () => {
		const { load } = await import('../../src/routes/admin/projects/[id]/+page.server.js');
		const statement = {
			bind: vi.fn().mockReturnThis(),
			first: vi.fn().mockResolvedValue(null),
			all: vi.fn().mockResolvedValue({ results: [] })
		};
		const db = { prepare: vi.fn().mockReturnValue(statement) };

		try {
			await load({ platform: { env: { DB: db } }, params: { id: 'nope' } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('returns the project and group names', async () => {
		const { load } = await import('../../src/routes/admin/projects/[id]/+page.server.js');
		const statement = {
			bind: vi.fn().mockReturnThis(),
			first: vi.fn().mockResolvedValue(projectRow),
			all: vi.fn().mockResolvedValue({
				results: [projectRow, { ...projectRow, id: 'p2', group_name: 'Personal' }]
			})
		};
		const db = { prepare: vi.fn().mockReturnValue(statement) };

		const result = (await load({
			platform: { env: { DB: db } },
			params: { id: 'p1' }
		} as any)) as any;

		expect(result.project.id).toBe('p1');
		expect(result.groups).toEqual(['*Space', 'Personal']);
	});
});

// ─── Task board helpers ───────────────────────────────────────────────────────

describe('flattenTasks', () => {
	it('flattens all project tasks into board cards with identity', async () => {
		const { flattenTasks } = await import('../../src/lib/admin/projects-dashboard');
		const tasks = flattenTasks([
			makeProject({
				id: 'a',
				name: 'Alpha',
				group: '*Space',
				tasks: [
					{ text: 't1', done: false, status: 'planning', priority: 'medium' },
					{ text: 't2', done: false, status: 'blocked', priority: 'medium' }
				]
			}),
			makeProject({ id: 'b', name: 'Beta', group: 'Personal', tasks: [] })
		]);

		expect(tasks).toEqual([
			{
				projectId: 'a',
				projectName: 'Alpha',
				group: '*Space',
				index: 0,
				text: 't1',
				status: 'planning',
				priority: 'medium'
			},
			{
				projectId: 'a',
				projectName: 'Alpha',
				group: '*Space',
				index: 1,
				text: 't2',
				status: 'blocked',
				priority: 'medium'
			}
		]);
	});
});

describe('setTaskStatus', () => {
	it('moves a task and keeps done in sync', async () => {
		const { setTaskStatus } = await import('../../src/lib/admin/projects-dashboard');
		const tasks = [
			{ text: 'a', done: false, status: 'planning' as const, priority: 'medium' as const },
			{ text: 'b', done: false, status: 'active' as const, priority: 'medium' as const }
		];

		const toDone = setTaskStatus(tasks, 0, 'complete');
		expect(toDone[0]).toEqual({ text: 'a', done: true, status: 'complete', priority: 'medium' });
		expect(toDone[1]).toBe(tasks[1] === toDone[1] ? toDone[1] : toDone[1]); // other entries preserved
		expect(toDone[1]).toEqual(tasks[1]);

		const backToActive = setTaskStatus(toDone, 0, 'active');
		expect(backToActive[0]).toEqual({
			text: 'a',
			done: false,
			status: 'active',
			priority: 'medium'
		});

		// original untouched (immutability)
		expect(tasks[0].status).toBe('planning');
	});

	it('returns the original array for invalid indexes', async () => {
		const { setTaskStatus } = await import('../../src/lib/admin/projects-dashboard');
		const tasks = [
			{ text: 'a', done: false, status: 'planning' as const, priority: 'medium' as const }
		];
		expect(setTaskStatus(tasks, -1, 'complete')).toBe(tasks);
		expect(setTaskStatus(tasks, 5, 'complete')).toBe(tasks);
	});
});

describe('computeTaskStats', () => {
	it('counts tasks by status across projects', async () => {
		const { computeTaskStats } = await import('../../src/lib/admin/projects-dashboard');
		const stats = computeTaskStats([
			makeProject({
				id: 'a',
				tasks: [
					{ text: 't1', done: false, status: 'planning', priority: 'medium' },
					{ text: 't2', done: true, status: 'complete', priority: 'medium' }
				]
			}),
			makeProject({
				id: 'b',
				tasks: [{ text: 't3', done: false, status: 'blocked', priority: 'medium' }]
			})
		]);

		expect(stats.total).toBe(3);
		expect(stats.byStatus.planning).toBe(1);
		expect(stats.byStatus.blocked).toBe(1);
		expect(stats.byStatus.complete).toBe(1);
		expect(stats.byStatus.active).toBe(0);
	});
});
