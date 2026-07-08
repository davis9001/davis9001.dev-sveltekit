/**
 * Tests for the admin Open Projects API
 * /api/admin/projects, /api/admin/projects/[id], /api/admin/projects/reorder
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as listGET, POST as createPOST } from '../../src/routes/api/admin/projects/+server';
import {
	DELETE as itemDELETE,
	GET as itemGET,
	PUT as itemPUT
} from '../../src/routes/api/admin/projects/[id]/+server';
import { POST as reorderPOST } from '../../src/routes/api/admin/projects/reorder/+server';

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'p1',
		group_name: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: '[]',
		tasks: '[]',
		blockers: '',
		sort_order: 0,
		created_at: '2026-01-01 00:00:00',
		updated_at: '2026-01-02 00:00:00',
		...overrides
	};
}

function createMockDb() {
	const first = vi.fn();
	const all = vi.fn().mockResolvedValue({ results: [] });
	const run = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
	const batch = vi.fn().mockResolvedValue([]);
	const statement = { bind: vi.fn(), first, all, run };
	statement.bind.mockReturnValue(statement);
	const prepare = vi.fn().mockReturnValue(statement);
	return { db: { prepare, batch }, prepare, bind: statement.bind, first, all, run, batch };
}

const adminUser = { id: 'u1', isOwner: true, isAdmin: true };
const plainUser = { id: 'u2', isOwner: false, isAdmin: false };

function makeEvent(options: {
	user?: unknown;
	db?: unknown;
	kv?: unknown;
	waitUntil?: (promise: Promise<unknown>) => void;
	body?: unknown;
	params?: Record<string, string>;
}) {
	const env: Record<string, unknown> = {};
	if (options.db !== undefined) env.DB = options.db;
	if (options.kv !== undefined) env.KV = options.kv;
	const hasPlatform = options.db !== undefined || options.kv !== undefined || options.waitUntil;

	return {
		locals: { user: options.user },
		platform: hasPlatform
			? { env, context: options.waitUntil ? { waitUntil: options.waitUntil } : undefined }
			: undefined,
		params: options.params ?? { id: 'p1' },
		request: {
			json: async () => {
				if (options.body === 'MALFORMED') throw new Error('bad json');
				return options.body;
			}
		}
	} as never;
}

describe('Admin Open Projects API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('auth matrix (shared by all endpoints)', () => {
		const cases: [string, (event: never) => Promise<Response>][] = [
			['GET list', listGET as never],
			['POST create', createPOST as never],
			['GET item', itemGET as never],
			['PUT item', itemPUT as never],
			['DELETE item', itemDELETE as never],
			['POST reorder', reorderPOST as never]
		];

		for (const [label, handler] of cases) {
			it(`${label} → 401 without a user`, async () => {
				await expect(
					handler(makeEvent({ user: undefined, db: createMockDb().db }))
				).rejects.toMatchObject({
					status: 401
				});
			});

			it(`${label} → 403 for non-admin users`, async () => {
				await expect(
					handler(makeEvent({ user: plainUser, db: createMockDb().db }))
				).rejects.toMatchObject({
					status: 403
				});
			});

			it(`${label} → 500 without a database`, async () => {
				await expect(handler(makeEvent({ user: adminUser }))).rejects.toMatchObject({
					status: 500
				});
			});
		}
	});

	describe('GET /api/admin/projects', () => {
		it('returns all projects', async () => {
			const { db, all } = createMockDb();
			all.mockResolvedValue({ results: [makeRow(), makeRow({ id: 'p2', name: 'Other' })] });

			const response = await listGET(makeEvent({ user: adminUser, db }));
			const body = await response.json();

			expect(body.projects).toHaveLength(2);
			expect(body.projects[0].id).toBe('p1');
		});
	});

	describe('POST /api/admin/projects', () => {
		it('creates a project and returns 201', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValueOnce({ next: 5 }).mockResolvedValueOnce(makeRow({ sort_order: 5 }));

			const response = await createPOST(
				makeEvent({ user: adminUser, db, body: { group: '*Space', name: 'NebulaKit' } })
			);

			expect(response.status).toBe(201);
			const body = await response.json();
			expect(body.project.sortOrder).toBe(5);
		});

		it('rejects a missing group', async () => {
			const { db } = createMockDb();
			await expect(
				createPOST(makeEvent({ user: adminUser, db, body: { name: 'X' } }))
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects a missing name', async () => {
			const { db } = createMockDb();
			await expect(
				createPOST(makeEvent({ user: adminUser, db, body: { group: 'G' } }))
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects invalid enums', async () => {
			const { db } = createMockDb();
			await expect(
				createPOST(
					makeEvent({ user: adminUser, db, body: { group: 'G', name: 'N', status: 'bogus' } })
				)
			).rejects.toMatchObject({ status: 400 });
			await expect(
				createPOST(
					makeEvent({ user: adminUser, db, body: { group: 'G', name: 'N', priority: 'bogus' } })
				)
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects malformed JSON', async () => {
			const { db } = createMockDb();
			await expect(
				createPOST(makeEvent({ user: adminUser, db, body: 'MALFORMED' }))
			).rejects.toMatchObject({ status: 400 });
		});
	});

	describe('GET /api/admin/projects/[id]', () => {
		it('returns the project', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(makeRow());

			const response = await itemGET(makeEvent({ user: adminUser, db }));
			const body = await response.json();

			expect(body.project.id).toBe('p1');
		});

		it('404s for unknown ids', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(null);

			await expect(itemGET(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({
				status: 404
			});
		});
	});

	describe('PUT /api/admin/projects/[id]', () => {
		it('patches fields and returns the fresh project', async () => {
			const { db, first } = createMockDb();
			first
				.mockResolvedValueOnce(makeRow()) // getOpenProject (pre-fetch for the GitHub sync hook)
				.mockResolvedValueOnce({ id: 'p1' }) // updateOpenProject existence check
				.mockResolvedValueOnce(makeRow({ name: 'Renamed' })); // updateOpenProject re-fetch

			const response = await itemPUT(makeEvent({ user: adminUser, db, body: { name: 'Renamed' } }));
			const body = await response.json();

			expect(body.project.name).toBe('Renamed');
		});

		it('does not trigger a GitHub push when sync is not enabled', async () => {
			const { db, first } = createMockDb();
			first
				.mockResolvedValueOnce(makeRow({ github_sync_enabled: 0 }))
				.mockResolvedValueOnce({ id: 'p1' })
				.mockResolvedValueOnce(makeRow({ name: 'Renamed', github_sync_enabled: 0 }));
			const waitUntil = vi.fn();

			await itemPUT(makeEvent({ user: adminUser, db, waitUntil, body: { name: 'Renamed' } }));

			expect(waitUntil).not.toHaveBeenCalled();
		});

		it('triggers a background GitHub push when sync is enabled, and persists the result', async () => {
			const { db, first } = createMockDb();
			first
				.mockResolvedValueOnce(
					makeRow({
						github_sync_enabled: 1,
						github_project_id: 'PVT_1',
						tasks: JSON.stringify([
							{ text: 'a', done: false, status: 'planning', priority: 'medium' }
						])
					})
				) // getOpenProject pre-fetch
				.mockResolvedValueOnce({ id: 'p1' }) // updateOpenProject existence check (the PUT itself)
				.mockResolvedValueOnce(
					makeRow({ name: 'Renamed', github_sync_enabled: 1, github_project_id: 'PVT_1' })
				) // updateOpenProject re-fetch (the PUT itself)
				.mockResolvedValueOnce({ id: 'p1' }) // background job's updateOpenProject existence check
				.mockResolvedValueOnce(makeRow({ name: 'Renamed', github_sync_enabled: 1 })); // background job re-fetch
			const kv = {
				get: vi.fn().mockResolvedValue(JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' }))
			};
			const waitUntilPromises: Promise<unknown>[] = [];
			const waitUntil = vi.fn((p: Promise<unknown>) => waitUntilPromises.push(p));
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { node: { fields: { nodes: [] } } } })
			});

			const response = await itemPUT(
				makeEvent({ user: adminUser, db, kv, waitUntil, body: { name: 'Renamed' } })
			);
			const body = await response.json();

			// The client's response reflects the synchronous PUT result immediately —
			// it does not wait on the background push.
			expect(body.project.name).toBe('Renamed');
			expect(waitUntil).toHaveBeenCalledTimes(1);

			await Promise.all(waitUntilPromises);
			vi.restoreAllMocks();
		});

		it('404s for unknown ids', async () => {
			const { db, first } = createMockDb();
			first.mockResolvedValue(null);

			await expect(
				itemPUT(makeEvent({ user: adminUser, db, body: { name: 'X' } }))
			).rejects.toMatchObject({ status: 404 });
		});

		it('rejects invalid enum values', async () => {
			const { db } = createMockDb();

			await expect(
				itemPUT(makeEvent({ user: adminUser, db, body: { status: 'nope' } }))
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects empty group on patch', async () => {
			const { db } = createMockDb();

			await expect(
				itemPUT(makeEvent({ user: adminUser, db, body: { group: '  ' } }))
			).rejects.toMatchObject({ status: 400 });
		});
	});

	describe('DELETE /api/admin/projects/[id]', () => {
		it('deletes and reports success', async () => {
			const { db, run } = createMockDb();
			run.mockResolvedValue({ success: true, meta: { changes: 1 } });

			const response = await itemDELETE(makeEvent({ user: adminUser, db }));
			const body = await response.json();

			expect(body.success).toBe(true);
		});

		it('404s when nothing was deleted', async () => {
			const { db, run } = createMockDb();
			run.mockResolvedValue({ success: true, meta: { changes: 0 } });

			await expect(itemDELETE(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({
				status: 404
			});
		});
	});

	describe('POST /api/admin/projects/reorder', () => {
		it('applies updates in one batch', async () => {
			const { db, batch } = createMockDb();

			const response = await reorderPOST(
				makeEvent({
					user: adminUser,
					db,
					body: {
						updates: [
							{ id: 'a', sortOrder: 0 },
							{ id: 'b', sortOrder: 1 }
						]
					}
				})
			);
			const body = await response.json();

			expect(body).toEqual({ success: true, updated: 2 });
			expect(batch).toHaveBeenCalledTimes(1);
		});

		it('rejects an empty updates array', async () => {
			const { db } = createMockDb();

			await expect(
				reorderPOST(makeEvent({ user: adminUser, db, body: { updates: [] } }))
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects malformed update entries', async () => {
			const { db } = createMockDb();

			await expect(
				reorderPOST(
					makeEvent({ user: adminUser, db, body: { updates: [{ id: 'a', sortOrder: 'x' }] } })
				)
			).rejects.toMatchObject({ status: 400 });

			await expect(
				reorderPOST(makeEvent({ user: adminUser, db, body: { updates: [{ sortOrder: 1 }] } }))
			).rejects.toMatchObject({ status: 400 });
		});

		it('rejects malformed JSON', async () => {
			const { db } = createMockDb();

			await expect(
				reorderPOST(makeEvent({ user: adminUser, db, body: 'MALFORMED' }))
			).rejects.toMatchObject({ status: 400 });
		});
	});
});
