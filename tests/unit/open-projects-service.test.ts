/**
 * Tests for the Open Projects D1 service and shared utils
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createOpenProject,
	deleteOpenProject,
	getOpenProject,
	listOpenProjects,
	reorderOpenProjects,
	updateOpenProject
} from '../../src/lib/services/open-projects';
import {
	asPriority,
	asProjectStatus,
	groupProjects,
	latestUpdatedAt,
	normalizeExtraLinks,
	normalizeTasks,
	toPublicGroups
} from '../../src/lib/projects/utils';
import type { OpenProject } from '../../src/lib/projects/types';

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'p1',
		group_name: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: 'A kit',
		primary_link: 'https://example.com',
		github_url: null,
		extra_links: '[{"label":"Docs","href":"https://docs.example.com"}]',
		tasks: '[{"text":"Ship it","done":false}]',
		blockers: '',
		sort_order: 0,
		created_at: '2026-01-01 00:00:00',
		updated_at: '2026-01-02 00:00:00',
		...overrides
	};
}

function makeProject(overrides: Partial<OpenProject> = {}): OpenProject {
	return {
		id: 'p1',
		group: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primaryLink: null,
		githubUrl: null,
		extraLinks: [],
		tasks: [],
		blockers: '',
		sortOrder: 0,
		createdAt: '2026-01-01 00:00:00',
		updatedAt: '2026-01-02 00:00:00',
		...overrides
	};
}

function createMockDb() {
	const first = vi.fn();
	const all = vi.fn();
	const run = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
	const batch = vi.fn().mockResolvedValue([]);
	const bind = vi.fn();
	const prepare = vi.fn();
	const statement = { bind, first, all, run };
	bind.mockReturnValue(statement);
	prepare.mockReturnValue(statement);
	return { db: { prepare, batch } as any, prepare, bind, first, all, run, batch };
}

describe('Open Projects utils', () => {
	describe('normalizeTasks', () => {
		it('normalizes legacy string tasks and object tasks', () => {
			expect(normalizeTasks(['a', { text: 'b', done: true, status: 'complete' }])).toEqual([
				{ text: 'a', done: false, status: 'planning' },
				{ text: 'b', done: true, status: 'complete' }
			]);
		});

		it('appends completed_tasks as done', () => {
			expect(normalizeTasks([], ['x', { text: 'y' }])).toEqual([
				{ text: 'x', done: true, status: 'complete' },
				{ text: 'y', done: true, status: 'complete' }
			]);
		});

		it('handles non-array inputs and malformed entries', () => {
			expect(normalizeTasks('junk', 42)).toEqual([]);
			expect(normalizeTasks([{}])).toEqual([{ text: '', done: false, status: 'planning' }]);
			expect(normalizeTasks([null])).toEqual([{ text: '', done: false, status: 'planning' }]);
		});
	});

	describe('normalizeExtraLinks', () => {
		it('keeps only well-formed entries', () => {
			expect(
				normalizeExtraLinks([
					{ label: 'Docs', href: 'https://d' },
					{ label: 42, href: 'https://x' },
					'junk',
					null,
					{ label: 'Extra', href: 'https://e', junk: true }
				])
			).toEqual([
				{ label: 'Docs', href: 'https://d' },
				{ label: 'Extra', href: 'https://e' }
			]);
		});

		it('returns [] for non-arrays', () => {
			expect(normalizeExtraLinks('nope')).toEqual([]);
			expect(normalizeExtraLinks(undefined)).toEqual([]);
		});
	});

	describe('coercers', () => {
		it('coerces invalid statuses and priorities to defaults', () => {
			expect(asProjectStatus('blocked')).toBe('blocked');
			expect(asProjectStatus('draft')).toBe('active');
			expect(asPriority('low')).toBe('low');
			expect(asPriority('urgent')).toBe('medium');
		});
	});

	describe('groupProjects', () => {
		it('orders preferred groups first, sorts within group by sortOrder', () => {
			const projects = [
				makeProject({ id: 'a', group: 'Other', sortOrder: 0 }),
				makeProject({ id: 'b', group: 'Personal', sortOrder: 1 }),
				makeProject({ id: 'c', group: 'Personal', sortOrder: 0 }),
				makeProject({ id: 'd', group: '*Space', sortOrder: 5 })
			];
			const groups = groupProjects(projects);
			expect(groups.map((g) => g.name)).toEqual(['*Space', 'Personal', 'Other']);
			expect(groups[1].projects.map((p) => p.id)).toEqual(['c', 'b']);
		});
	});

	describe('toPublicGroups', () => {
		it('strips internal fields and keeps the public key set', () => {
			const groups = toPublicGroups([makeProject({ tasks: [{ text: 't', done: true, status: 'complete' }] })]);
			const project = groups[0].projects[0] as unknown as Record<string, unknown>;
			expect(Object.keys(project).sort()).toEqual([
				'blockers',
				'description',
				'extraLinks',
				'githubUrl',
				'name',
				'primaryLink',
				'priority',
				'status',
				'tasks'
			]);
			expect(project.id).toBeUndefined();
			expect(project.sortOrder).toBeUndefined();
		});
	});

	describe('latestUpdatedAt', () => {
		it('returns the max raw datetime string', () => {
			expect(
				latestUpdatedAt([
					makeProject({ updatedAt: '2026-01-02 00:00:00' }),
					makeProject({ updatedAt: '2026-03-01 12:00:00' }),
					makeProject({ updatedAt: '2026-02-01 00:00:00' })
				])
			).toBe('2026-03-01 12:00:00');
		});

		it('returns null for empty lists', () => {
			expect(latestUpdatedAt([])).toBeNull();
		});
	});
});

describe('Open Projects service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listOpenProjects', () => {
		it('maps rows to projects', async () => {
			const { db, all } = createMockDb();
			all.mockResolvedValue({ results: [makeRow()] });

			const projects = await listOpenProjects(db);

			expect(projects).toHaveLength(1);
			expect(projects[0]).toMatchObject({
				id: 'p1',
				group: '*Space',
				name: 'NebulaKit',
				status: 'active',
				priority: 'high',
				primaryLink: 'https://example.com',
				extraLinks: [{ label: 'Docs', href: 'https://docs.example.com' }],
				tasks: [{ text: 'Ship it', done: false, status: 'planning' }]
			});
		});

		it('degrades malformed JSON columns to empty arrays', async () => {
			const { db, all } = createMockDb();
			all.mockResolvedValue({
				results: [makeRow({ tasks: '{broken', extra_links: 'not json' })]
			});

			const [project] = await listOpenProjects(db);
			expect(project.tasks).toEqual([]);
			expect(project.extraLinks).toEqual([]);
		});

		it('coerces invalid enum values in rows', async () => {
			const { db, all } = createMockDb();
			all.mockResolvedValue({
				results: [makeRow({ status: 'bogus', priority: 'bogus' })]
			});

			const [project] = await listOpenProjects(db);
			expect(project.status).toBe('active');
			expect(project.priority).toBe('medium');
		});

		it('handles empty results', async () => {
			const { db, all } = createMockDb();
			all.mockResolvedValue({ results: undefined });

			expect(await listOpenProjects(db)).toEqual([]);
		});
	});

	describe('getOpenProject', () => {
		it('returns null when missing', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(null);

			expect(await getOpenProject(db, 'nope')).toBeNull();
		});

		it('returns the mapped project', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(makeRow());

			const project = await getOpenProject(db, 'p1');
			expect(project?.name).toBe('NebulaKit');
		});
	});

	describe('createOpenProject', () => {
		it('appends to the end of the group when sortOrder omitted', async () => {
			const { db, prepare, bind, first } = createMockDb();
			first
				.mockResolvedValueOnce({ next: 7 }) // MAX+1 query
				.mockResolvedValueOnce(makeRow({ sort_order: 7 })); // re-fetch

			const project = await createOpenProject(db, { group: '*Space', name: 'New' });

			expect(project.sortOrder).toBe(7);
			const insertSql = prepare.mock.calls
				.map((c) => c[0] as string)
				.find((s) => s.includes('INSERT INTO open_projects'));
			expect(insertSql).toBeTruthy();
			// INSERT bind: sortOrder is the last value
			const insertBind = bind.mock.calls.find((args) => args.length === 12);
			expect(insertBind?.[11]).toBe(7);
		});

		it('uses the provided sortOrder and serializes JSON fields', async () => {
			const { db, bind, first, prepare } = createMockDb();
			first.mockResolvedValueOnce(makeRow());

			await createOpenProject(db, {
				group: '*Space',
				name: 'New',
				sortOrder: 3,
				tasks: [{ text: 'a', done: false, status: 'planning' }],
				extraLinks: [{ label: 'L', href: 'H' }]
			});

			// No MAX query when sortOrder provided
			const maxSql = prepare.mock.calls
				.map((c) => c[0] as string)
				.find((s) => s.includes('MAX(sort_order)'));
			expect(maxSql).toBeUndefined();
			const insertBind = bind.mock.calls.find((args) => args.length === 12);
			expect(insertBind?.[8]).toBe('[{"label":"L","href":"H"}]');
			expect(insertBind?.[9]).toBe('[{"text":"a","done":false,"status":"planning"}]');
			expect(insertBind?.[11]).toBe(3);
		});

		it('throws when the created row cannot be re-fetched', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValueOnce({ next: 0 }).mockResolvedValueOnce(null);

			await expect(createOpenProject(db, { group: 'G', name: 'N' })).rejects.toThrow(
				'Failed to create project'
			);
		});
	});

	describe('updateOpenProject', () => {
		it('returns null when the id does not exist', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(null);

			expect(await updateOpenProject(db, 'nope', { name: 'X' })).toBeNull();
		});

		it('updates only provided fields and bumps updated_at', async () => {
			const { db, prepare, bind, first } = createMockDb();
			first
				.mockResolvedValueOnce({ id: 'p1' }) // existence check
				.mockResolvedValueOnce(makeRow({ name: 'Renamed' })); // re-fetch

			const project = await updateOpenProject(db, 'p1', {
				name: 'Renamed',
				tasks: [{ text: 'x', done: true, status: 'complete' }]
			});

			expect(project?.name).toBe('Renamed');
			const updateSql = prepare.mock.calls
				.map((c) => c[0] as string)
				.find((s) => s.startsWith('UPDATE open_projects SET'));
			expect(updateSql).toContain('name = ?');
			expect(updateSql).toContain('tasks = ?');
			expect(updateSql).toContain('updated_at = CURRENT_TIMESTAMP');
			expect(updateSql).not.toContain('group_name = ?');
			const updateBind = bind.mock.calls.find((args) => args.includes('Renamed'));
			expect(updateBind).toEqual(['Renamed', '[{"text":"x","done":true,"status":"complete"}]', 'p1']);
		});

		it('maps camelCase keys to snake_case columns', async () => {
			const { db, prepare, first } = createMockDb();
			first.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(makeRow());

			await updateOpenProject(db, 'p1', {
				group: 'Personal',
				primaryLink: 'https://x',
				githubUrl: null,
				sortOrder: 2
			});

			const updateSql = prepare.mock.calls
				.map((c) => c[0] as string)
				.find((s) => s.startsWith('UPDATE open_projects SET'));
			expect(updateSql).toContain('group_name = ?');
			expect(updateSql).toContain('primary_link = ?');
			expect(updateSql).toContain('github_url = ?');
			expect(updateSql).toContain('sort_order = ?');
		});

		it('ignores undefined patch values', async () => {
			const { db, prepare, first } = createMockDb();
			first.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(makeRow());

			await updateOpenProject(db, 'p1', { name: undefined });

			const updateSql = prepare.mock.calls
				.map((c) => c[0] as string)
				.find((s) => s.startsWith('UPDATE open_projects SET'));
			expect(updateSql).not.toContain('name = ?');
			expect(updateSql).toContain('updated_at = CURRENT_TIMESTAMP');
		});
	});

	describe('deleteOpenProject', () => {
		it('returns true when a row was deleted', async () => {
			const { db, run } = createMockDb();
			run.mockResolvedValue({ success: true, meta: { changes: 1 } });

			expect(await deleteOpenProject(db, 'p1')).toBe(true);
		});

		it('returns false when nothing was deleted', async () => {
			const { db, run } = createMockDb();
			run.mockResolvedValue({ success: true, meta: { changes: 0 } });

			expect(await deleteOpenProject(db, 'nope')).toBe(false);
		});
	});

	describe('reorderOpenProjects', () => {
		it('is a no-op for empty updates', async () => {
			const { db, batch } = createMockDb();

			expect(await reorderOpenProjects(db, [])).toBe(0);
			expect(batch).not.toHaveBeenCalled();
		});

		it('issues one batch with one statement per update', async () => {
			const { db, batch, bind } = createMockDb();

			const count = await reorderOpenProjects(db, [
				{ id: 'a', sortOrder: 0 },
				{ id: 'b', sortOrder: 1 }
			]);

			expect(count).toBe(2);
			expect(batch).toHaveBeenCalledTimes(1);
			expect((batch.mock.calls[0][0] as unknown[]).length).toBe(2);
			expect(bind).toHaveBeenCalledWith(0, 'a');
			expect(bind).toHaveBeenCalledWith(1, 'b');
		});
	});
});

describe('normalizeTasks status derivation', () => {
	it('derives status from done for legacy tasks', () => {
		expect(normalizeTasks([{ text: 'a', done: true }])).toEqual([
			{ text: 'a', done: true, status: 'complete' }
		]);
		expect(normalizeTasks([{ text: 'a', done: false }])).toEqual([
			{ text: 'a', done: false, status: 'planning' }
		]);
	});

	it('prefers an explicit valid status and recomputes done', () => {
		expect(normalizeTasks([{ text: 'a', done: true, status: 'blocked' }])).toEqual([
			{ text: 'a', done: false, status: 'blocked' }
		]);
		expect(normalizeTasks([{ text: 'a', done: false, status: 'complete' }])).toEqual([
			{ text: 'a', done: true, status: 'complete' }
		]);
	});

	it('falls back on invalid statuses', () => {
		expect(normalizeTasks([{ text: 'a', done: true, status: 'bogus' }])).toEqual([
			{ text: 'a', done: true, status: 'complete' }
		]);
	});

	it('forces complete for legacy completed_tasks regardless of status', () => {
		expect(normalizeTasks([], [{ text: 'x', status: 'planning' }])).toEqual([
			{ text: 'x', done: true, status: 'complete' }
		]);
	});
});
