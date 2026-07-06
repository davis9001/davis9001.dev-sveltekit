/**
 * Tests for the Admin Projects Dashboard logic ($lib/admin/projects-dashboard)
 * and the /admin/projects server load.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminProject } from '../../src/lib/admin/projects-dashboard';
import {
	buildFieldsUpdate,
	computeStats,
	filterProjects,
	groupProjects,
	listGroups,
	mapItemToAdminProject,
	moveProject,
	normalizeTasks,
	PROJECT_PRIORITIES,
	PROJECT_STATUSES,
	taskProgress
} from '../../src/lib/admin/projects-dashboard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<AdminProject> = {}): AdminProject {
	return {
		id: 'p-1',
		slug: 'proj',
		title: 'Proj',
		itemStatus: 'published',
		group: '*Space',
		name: 'Proj',
		projectStatus: 'active',
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
		rawFields: {},
		...overrides
	};
}

// ─── normalizeTasks ───────────────────────────────────────────────────────────

describe('normalizeTasks', () => {
	it('normalizes legacy string[] tasks as not done', () => {
		expect(normalizeTasks(['a', 'b'])).toEqual([
			{ text: 'a', done: false },
			{ text: 'b', done: false }
		]);
	});

	it('passes through {text,done} tasks', () => {
		expect(normalizeTasks([{ text: 'a', done: true }])).toEqual([{ text: 'a', done: true }]);
	});

	it('handles malformed task objects', () => {
		expect(normalizeTasks([{}, { text: 42, done: 'yes' }])).toEqual([
			{ text: '', done: false },
			{ text: '42', done: true }
		]);
	});

	it('returns empty array for non-array input', () => {
		expect(normalizeTasks(undefined)).toEqual([]);
		expect(normalizeTasks('nope')).toEqual([]);
		expect(normalizeTasks(null)).toEqual([]);
	});

	it('merges legacy completed_tasks as done', () => {
		expect(normalizeTasks(['open'], ['done-str', { text: 'done-obj' }])).toEqual([
			{ text: 'open', done: false },
			{ text: 'done-str', done: true },
			{ text: 'done-obj', done: true }
		]);
	});

	it('ignores non-array completedTasks', () => {
		expect(normalizeTasks(['a'], 'nope')).toEqual([{ text: 'a', done: false }]);
	});
});

// ─── mapItemToAdminProject ────────────────────────────────────────────────────

describe('mapItemToAdminProject', () => {
	const baseItem = {
		id: 'item-1',
		contentTypeId: 'ct-1',
		slug: 'nebulakit',
		title: 'NebulaKit',
		status: 'published' as const,
		fields: {} as Record<string, unknown>,
		seoTitle: null,
		seoDescription: null,
		seoImage: null,
		authorId: null,
		publishedAt: '2026-01-01',
		createdAt: '2026-01-01',
		updatedAt: '2026-01-02'
	};

	it('maps a fully-populated item', () => {
		const item = {
			...baseItem,
			fields: {
				group: '*Space',
				project_name: 'NebulaKit',
				status: 'blocked',
				priority: 'high',
				description: 'CMS framework',
				primary_link: 'https://nebulakit.starspace.group/',
				github_url: 'https://github.com/starspacegroup/NebulaKit',
				extra_links: [{ label: 'Docs', href: 'https://docs.example.com' }],
				tasks: [{ text: 'Ship it', done: false }],
				blockers: 'Waiting on review',
				sort_order: 3
			}
		};

		const p = mapItemToAdminProject(item);
		expect(p.id).toBe('item-1');
		expect(p.group).toBe('*Space');
		expect(p.name).toBe('NebulaKit');
		expect(p.projectStatus).toBe('blocked');
		expect(p.priority).toBe('high');
		expect(p.description).toBe('CMS framework');
		expect(p.primaryLink).toBe('https://nebulakit.starspace.group/');
		expect(p.githubUrl).toBe('https://github.com/starspacegroup/NebulaKit');
		expect(p.extraLinks).toHaveLength(1);
		expect(p.tasks).toEqual([{ text: 'Ship it', done: false }]);
		expect(p.blockers).toBe('Waiting on review');
		expect(p.sortOrder).toBe(3);
		expect(p.itemStatus).toBe('published');
		expect(p.rawFields).toBe(item.fields);
	});

	it('applies safe defaults for empty fields', () => {
		const p = mapItemToAdminProject(baseItem);
		expect(p.group).toBe('Other');
		expect(p.name).toBe('NebulaKit'); // falls back to title
		expect(p.projectStatus).toBe('active');
		expect(p.priority).toBe('medium');
		expect(p.extraLinks).toEqual([]);
		expect(p.tasks).toEqual([]);
		expect(p.blockers).toBe('');
		expect(p.sortOrder).toBe(999);
	});

	it('sanitises invalid status/priority and non-array extra_links', () => {
		const p = mapItemToAdminProject({
			...baseItem,
			fields: { status: 'bogus', priority: 'urgent', extra_links: 'nope' }
		});
		expect(p.projectStatus).toBe('active');
		expect(p.priority).toBe('medium');
		expect(p.extraLinks).toEqual([]);
	});

	it('handles null fields object', () => {
		const p = mapItemToAdminProject({ ...baseItem, fields: null as any });
		expect(p.group).toBe('Other');
		expect(p.tasks).toEqual([]);
	});
});

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
				projectStatus: 'active',
				priority: 'high',
				tasks: [
					{ text: 'a', done: true },
					{ text: 'b', done: false }
				],
				blockers: 'stuck'
			}),
			makeProject({
				id: 'p-2',
				projectStatus: 'blocked',
				priority: 'low',
				tasks: [{ text: 'c', done: true }]
			}),
			makeProject({ id: 'p-3', projectStatus: 'active', blockers: '   ' })
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
				{ text: 'a', done: true },
				{ text: 'b', done: false },
				{ text: 'c', done: false }
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
			projectStatus: 'active',
			priority: 'high',
			description: 'CMS framework',
			tasks: [{ text: 'write docs', done: false }]
		}),
		makeProject({
			id: 'b',
			name: 'AgapeVerse',
			group: 'Personal',
			projectStatus: 'complete',
			priority: 'low',
			blockers: 'waiting on domain'
		}),
		makeProject({
			id: 'c',
			name: 'SpaceBot',
			group: '*Space',
			projectStatus: 'blocked',
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

// ─── buildFieldsUpdate ────────────────────────────────────────────────────────

describe('buildFieldsUpdate', () => {
	it('merges a patch over raw fields', () => {
		const project = makeProject({
			rawFields: { group: '*Space', project_name: 'Old', status: 'active', tasks: [] }
		});
		const fields = buildFieldsUpdate(project, { status: 'paused' });
		expect(fields.status).toBe('paused');
		expect(fields.group).toBe('*Space');
		expect(fields.project_name).toBe('Old');
	});

	it('canonicalises legacy tasks and drops completed_tasks', () => {
		const project = makeProject({
			rawFields: { tasks: ['open task'], completed_tasks: ['done task'] }
		});
		const fields = buildFieldsUpdate(project, { blockers: 'x' });
		expect(fields.tasks).toEqual([
			{ text: 'open task', done: false },
			{ text: 'done task', done: true }
		]);
		expect('completed_tasks' in fields).toBe(false);
	});

	it('prefers patched tasks over raw fields', () => {
		const project = makeProject({ rawFields: { tasks: ['old'] } });
		const fields = buildFieldsUpdate(project, { tasks: [{ text: 'new', done: true }] });
		expect(fields.tasks).toEqual([{ text: 'new', done: true }]);
	});

	it('does not mutate the original rawFields', () => {
		const raw = { status: 'active', completed_tasks: ['x'] };
		const project = makeProject({ rawFields: raw });
		buildFieldsUpdate(project, { status: 'complete' });
		expect(raw.status).toBe('active');
		expect(raw.completed_tasks).toEqual(['x']);
	});
});

// ─── /admin/projects +page.server.ts ─────────────────────────────────────────

function createMockDB(): any {
	const db: any = {
		_firstQueue: [] as any[],
		_allQueue: [] as any[],
		prepare: vi.fn().mockReturnThis(),
		bind: vi.fn().mockReturnThis(),
		first: vi.fn(() => Promise.resolve(db._firstQueue.shift() ?? null)),
		all: vi.fn(() => Promise.resolve(db._allQueue.shift() ?? { results: [] })),
		run: vi.fn(() => Promise.resolve({ meta: { changes: 1 } })),
		batch: vi.fn(() => Promise.resolve([]))
	};
	return db;
}

const openProjectsTypeRow = {
	id: 'ct-op',
	slug: 'open-projects',
	name: 'Open Projects',
	description: 'Projects',
	fields: '[]',
	settings: '{"listPageSize":100}',
	icon: 'rocket',
	sort_order: 1,
	is_system: 1,
	created_at: '2026-01-01',
	updated_at: '2026-01-01'
};

const projectItemRow = {
	id: 'item-1',
	content_type_id: 'ct-op',
	slug: 'nebulakit',
	title: 'NebulaKit',
	status: 'published',
	fields:
		'{"group":"*Space","project_name":"NebulaKit","status":"active","priority":"high","tasks":[{"text":"Ship","done":false}],"sort_order":0}',
	seo_title: null,
	seo_description: null,
	seo_image: null,
	author_id: null,
	published_at: '2026-01-01',
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

	it('throws 500 when the open-projects content type is missing', async () => {
		const { load } = await import('../../src/routes/admin/projects/+page.server.js');
		const db = createMockDB();
		// syncContentTypes reads existing types
		db._allQueue.push({ results: [] });
		// getContentTypeBySlug → null
		db._firstQueue.push(null);

		try {
			await load({ platform: { env: { DB: db } } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it('returns mapped projects including drafts', async () => {
		const { load } = await import('../../src/routes/admin/projects/+page.server.js');
		const db = createMockDB();
		// syncContentTypes reads existing types
		db._allQueue.push({ results: [] });
		// getContentTypeBySlug
		db._firstQueue.push(openProjectsTypeRow);
		// listContentItems: count then items
		db._firstQueue.push({ count: 2 });
		db._allQueue.push({
			results: [projectItemRow, { ...projectItemRow, id: 'item-2', status: 'draft', fields: '{}' }]
		});

		const result = (await load({ platform: { env: { DB: db } } } as any)) as any;

		expect(result.projects).toHaveLength(2);
		expect(result.projects[0].name).toBe('NebulaKit');
		expect(result.projects[0].projectStatus).toBe('active');
		expect(result.projects[0].tasks).toEqual([{ text: 'Ship', done: false }]);
		expect(result.projects[1].itemStatus).toBe('draft');
		expect(result.projects[1].group).toBe('Other');
	});
});
