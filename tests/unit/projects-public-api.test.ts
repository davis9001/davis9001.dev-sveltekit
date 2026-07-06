/**
 * Contract tests for the public GET /api/projects endpoint (consumed by Iris).
 * The response shape is frozen: { updatedAt, groups: [{ name, projects }] }
 * where each project exposes exactly name/status/priority/description/
 * primaryLink/githubUrl/extraLinks/tasks/blockers — no id, no sortOrder.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../src/routes/api/projects/+server';

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'p1',
		group_name: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: 'https://nebulakit.example',
		github_url: null,
		extra_links: '[]',
		tasks: '[{"text":"Ship","done":false}]',
		blockers: '',
		sort_order: 0,
		created_at: '2026-01-01 00:00:00',
		updated_at: '2026-06-22 10:42:06',
		...overrides
	};
}

function createEvent(rows: unknown[] | null) {
	const all = vi.fn().mockResolvedValue({ results: rows ?? [] });
	const statement = { bind: vi.fn().mockReturnThis(), all, first: vi.fn(), run: vi.fn() };
	const db = { prepare: vi.fn().mockReturnValue(statement), batch: vi.fn() };
	return {
		event: { platform: { env: { DB: db } } } as unknown as Parameters<typeof GET>[0],
		db
	};
}

describe('GET /api/projects (public contract)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('throws 500 when the database is unavailable', async () => {
		await expect(
			GET({ platform: undefined } as unknown as Parameters<typeof GET>[0])
		).rejects.toMatchObject({ status: 500 });
	});

	it('returns the frozen per-project key set — no id or sortOrder leak', async () => {
		const { event } = createEvent([makeRow()]);

		const response = await GET(event);
		const body = await response.json();

		const project = body.groups[0].projects[0];
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
		expect(project).toEqual({
			name: 'NebulaKit',
			status: 'active',
			priority: 'high',
			description: '',
			primaryLink: 'https://nebulakit.example',
			githubUrl: null,
			extraLinks: [],
			tasks: [{ text: 'Ship', done: false }],
			blockers: ''
		});
	});

	it('orders groups *Space, Personal, then others', async () => {
		const { event } = createEvent([
			makeRow({ id: 'a', group_name: 'Zeta' }),
			makeRow({ id: 'b', group_name: 'Personal' }),
			makeRow({ id: 'c', group_name: '*Space' })
		]);

		const response = await GET(event);
		const body = await response.json();

		expect(body.groups.map((g: { name: string }) => g.name)).toEqual([
			'*Space',
			'Personal',
			'Zeta'
		]);
	});

	it('sorts projects within a group by sort order', async () => {
		const { event } = createEvent([
			makeRow({ id: 'a', name: 'Second', sort_order: 1 }),
			makeRow({ id: 'b', name: 'First', sort_order: 0 })
		]);

		const response = await GET(event);
		const body = await response.json();

		expect(body.groups[0].projects.map((p: { name: string }) => p.name)).toEqual([
			'First',
			'Second'
		]);
	});

	it('sets updatedAt to the latest raw updated_at string', async () => {
		const { event } = createEvent([
			makeRow({ id: 'a', updated_at: '2026-06-22 10:42:06' }),
			makeRow({ id: 'b', updated_at: '2026-07-01 08:00:00' })
		]);

		const response = await GET(event);
		const body = await response.json();

		expect(body.updatedAt).toBe('2026-07-01 08:00:00');
	});

	it('falls back to an ISO timestamp when there are no projects', async () => {
		const { event } = createEvent([]);

		const response = await GET(event);
		const body = await response.json();

		expect(body.groups).toEqual([]);
		expect(new Date(body.updatedAt).getTime()).not.toBeNaN();
	});

	it('sends the public cache header', async () => {
		const { event } = createEvent([makeRow()]);

		const response = await GET(event);

		expect(response.headers.get('Cache-Control')).toBe(
			'public, max-age=60, stale-while-revalidate=300'
		);
	});
});
