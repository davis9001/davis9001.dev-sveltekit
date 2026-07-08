/**
 * Tests for the GitHub sync admin routes:
 * /api/admin/github-sync-config, /api/admin/projects/[id]/github/{link,unlink,sync}
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 'u1', isOwner: true, isAdmin: true };
const nonOwnerAdmin = { id: 'u2', isOwner: false, isAdmin: true };
const plainUser = { id: 'u3', isOwner: false, isAdmin: false };

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'p1',
		group_name: '*Space',
		name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: null,
		github_url: 'https://github.com/starspacegroup/NebulaKit',
		extra_links: '[]',
		tasks: '[]',
		blockers: '',
		sort_order: 0,
		created_at: '2026-01-01 00:00:00',
		updated_at: '2026-01-02 00:00:00',
		github_project_url: null,
		github_project_id: null,
		github_sync_enabled: 0,
		github_last_synced_at: null,
		github_last_sync_error: null,
		github_priority_field_found: 0,
		...overrides
	};
}

function createMockDb() {
	const first = vi.fn();
	const all = vi.fn().mockResolvedValue({ results: [] });
	const run = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
	const statement = { bind: vi.fn(), first, all, run };
	statement.bind.mockReturnValue(statement);
	const prepare = vi.fn().mockReturnValue(statement);
	return { db: { prepare }, prepare, bind: statement.bind, first, all, run };
}

function makeKv(initial: Record<string, string> = {}) {
	const store = { ...initial };
	return {
		get: vi.fn(async (key: string) => store[key] ?? null),
		put: vi.fn(async (key: string, value: string) => {
			store[key] = value;
		}),
		delete: vi.fn(async (key: string) => {
			delete store[key];
		}),
		_store: store
	};
}

function makeEvent(options: {
	user?: unknown;
	db?: unknown;
	kv?: unknown;
	body?: unknown;
	params?: Record<string, string>;
}) {
	const env: Record<string, unknown> = {};
	if (options.db !== undefined) env.DB = options.db;
	if (options.kv !== undefined) env.KV = options.kv;

	return {
		locals: { user: options.user },
		platform: options.db === undefined && options.kv === undefined ? undefined : { env },
		params: options.params ?? { id: 'p1' },
		request: {
			json: async () => {
				if (options.body === 'MALFORMED') throw new Error('bad json');
				return options.body;
			}
		}
	} as never;
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('GET/PUT/DELETE /api/admin/github-sync-config', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects a non-owner admin with 403 on every verb', async () => {
		const { GET, PUT, DELETE } =
			await import('../../src/routes/api/admin/github-sync-config/+server');
		const kv = makeKv();

		await expect(GET(makeEvent({ user: nonOwnerAdmin, kv }))).rejects.toMatchObject({
			status: 403
		});
		await expect(
			PUT(makeEvent({ user: nonOwnerAdmin, kv, body: { token: 'x' } }))
		).rejects.toMatchObject({
			status: 403
		});
		await expect(DELETE(makeEvent({ user: nonOwnerAdmin, kv }))).rejects.toMatchObject({
			status: 403
		});
	});

	it('rejects a plain (non-admin) user with 403', async () => {
		const { GET } = await import('../../src/routes/api/admin/github-sync-config/+server');
		await expect(GET(makeEvent({ user: plainUser, kv: makeKv() }))).rejects.toMatchObject({
			status: 403
		});
	});

	it('GET reports unconfigured when nothing is stored', async () => {
		const { GET } = await import('../../src/routes/api/admin/github-sync-config/+server');
		const response = await GET(makeEvent({ user: adminUser, kv: makeKv() }));
		const body = await response.json();

		expect(body).toEqual({ configured: false, maskedToken: null });
	});

	it('GET reports unconfigured when KV itself is unavailable', async () => {
		const { GET } = await import('../../src/routes/api/admin/github-sync-config/+server');
		const response = await GET(makeEvent({ user: adminUser }));
		const body = await response.json();

		expect(body).toEqual({ configured: false, maskedToken: null });
	});

	it('GET masks a stored token', async () => {
		const { GET } = await import('../../src/routes/api/admin/github-sync-config/+server');
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'ghp_abcd1234', login: 'davis9001', updatedAt: 'x' })
		});

		const response = await GET(makeEvent({ user: adminUser, kv }));
		const body = await response.json();

		expect(body).toEqual({ configured: true, maskedToken: '••••1234', login: 'davis9001' });
	});

	it('PUT validates the token against GitHub before saving', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ data: { viewer: { login: 'davis9001' } } })
		});
		const { PUT } = await import('../../src/routes/api/admin/github-sync-config/+server');
		const kv = makeKv();

		const response = await PUT(makeEvent({ user: adminUser, kv, body: { token: 'ghp_new' } }));
		const body = await response.json();

		expect(body).toEqual({ success: true, login: 'davis9001' });
		expect(JSON.parse(kv._store.github_sync_pat)).toMatchObject({
			token: 'ghp_new',
			login: 'davis9001'
		});
	});

	it('PUT rejects a missing token with 400', async () => {
		const { PUT } = await import('../../src/routes/api/admin/github-sync-config/+server');
		await expect(PUT(makeEvent({ user: adminUser, kv: makeKv(), body: {} }))).rejects.toMatchObject(
			{ status: 400 }
		);
	});

	it('PUT surfaces a GitHub validation failure as 400', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 401, headers: new Headers() });
		const { PUT } = await import('../../src/routes/api/admin/github-sync-config/+server');

		await expect(
			PUT(makeEvent({ user: adminUser, kv: makeKv(), body: { token: 'bad' } }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('PUT falls back to a generic message when a non-GithubApiError is thrown', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('network is down'));
		const { PUT } = await import('../../src/routes/api/admin/github-sync-config/+server');

		await expect(
			PUT(makeEvent({ user: adminUser, kv: makeKv(), body: { token: 'bad' } }))
		).rejects.toMatchObject({
			status: 400,
			body: { message: 'Failed to validate token with GitHub' }
		});
	});

	it('PUT without KV returns 500', async () => {
		const { PUT } = await import('../../src/routes/api/admin/github-sync-config/+server');
		await expect(PUT(makeEvent({ user: adminUser, body: { token: 'x' } }))).rejects.toMatchObject({
			status: 500
		});
	});

	it('DELETE clears the stored token', async () => {
		const { DELETE } = await import('../../src/routes/api/admin/github-sync-config/+server');
		const kv = makeKv({ github_sync_pat: '{"token":"x"}' });

		const response = await DELETE(makeEvent({ user: adminUser, kv }));

		expect(await response.json()).toEqual({ success: true });
		expect(kv.delete).toHaveBeenCalledWith('github_sync_pat');
	});
});

describe('POST /api/admin/projects/[id]/github/link', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects unauthenticated/forbidden/no-db as usual', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db } = createMockDb();

		await expect(POST(makeEvent({ user: undefined, db }))).rejects.toMatchObject({ status: 401 });
		await expect(POST(makeEvent({ user: plainUser, db }))).rejects.toMatchObject({ status: 403 });
		await expect(POST(makeEvent({ user: adminUser }))).rejects.toMatchObject({ status: 500 });
	});

	it('rejects a missing or malformed projectUrl', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db } = createMockDb();

		await expect(POST(makeEvent({ user: adminUser, db, body: {} }))).rejects.toMatchObject({
			status: 400
		});
		await expect(
			POST(makeEvent({ user: adminUser, db, body: { projectUrl: 'not a github url' } }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('404s when the project does not exist', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(null);

		await expect(
			POST(
				makeEvent({
					user: adminUser,
					db,
					body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
				})
			)
		).rejects.toMatchObject({ status: 404 });
	});

	it('409s when another project already links the same board', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(makeRow()).mockResolvedValueOnce({ id: 'other-project' });

		await expect(
			POST(
				makeEvent({
					user: adminUser,
					db,
					body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
				})
			)
		).rejects.toMatchObject({ status: 409 });
	});

	it('400s when no GitHub sync token is configured', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(makeRow()).mockResolvedValueOnce(null);

		await expect(
			POST(
				makeEvent({
					user: adminUser,
					db,
					kv: makeKv(),
					body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
				})
			)
		).rejects.toMatchObject({ status: 400 });
	});

	it('404s when the GitHub board cannot be resolved', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(makeRow()).mockResolvedValueOnce(null);
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ data: { organization: { projectV2: null }, user: null } })
		});

		await expect(
			POST(
				makeEvent({
					user: adminUser,
					db,
					kv,
					body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
				})
			)
		).rejects.toMatchObject({ status: 404 });
	});

	it('falls back to a generic message when board resolution throws a non-GithubApiError', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(makeRow()).mockResolvedValueOnce(null);
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('network is down'));

		await expect(
			POST(
				makeEvent({
					user: adminUser,
					db,
					kv,
					body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
				})
			)
		).rejects.toMatchObject({
			status: 400,
			body: { message: 'Failed to resolve the GitHub board' }
		});
	});

	it('links successfully and reports which fields were found', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/link/+server');
		const { db, first } = createMockDb();
		first
			.mockResolvedValueOnce(makeRow()) // getOpenProject
			.mockResolvedValueOnce(null) // existingLink check
			.mockResolvedValueOnce({ id: 'p1' }) // updateOpenProject existence check
			.mockResolvedValueOnce(
				makeRow({
					github_project_url: 'https://github.com/orgs/starspacegroup/projects/3',
					github_project_id: 'PVT_1',
					github_sync_enabled: 1,
					github_priority_field_found: 1
				})
			); // updateOpenProject re-fetch
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({
				data: {
					organization: {
						projectV2: {
							id: 'PVT_1',
							title: 'Roadmap',
							fields: {
								nodes: [
									{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Todo' }] },
									{ id: 'F_priority', name: 'Priority', options: [{ id: 'O2', name: 'High' }] }
								]
							}
						}
					},
					user: null
				}
			})
		});

		const response = await POST(
			makeEvent({
				user: adminUser,
				db,
				kv,
				body: { projectUrl: 'https://github.com/orgs/starspacegroup/projects/3' }
			})
		);
		const body = await response.json();

		expect(body.fieldsFound).toEqual({ status: true, priority: true });
		expect(body.project.githubSyncEnabled).toBe(true);
	});
});

describe('POST /api/admin/projects/[id]/github/unlink', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects unauthenticated/forbidden/no-db as usual', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/unlink/+server');
		const { db } = createMockDb();

		await expect(POST(makeEvent({ user: undefined, db }))).rejects.toMatchObject({ status: 401 });
		await expect(POST(makeEvent({ user: plainUser, db }))).rejects.toMatchObject({ status: 403 });
		await expect(POST(makeEvent({ user: adminUser }))).rejects.toMatchObject({ status: 500 });
	});

	it('404s when the project does not exist', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/unlink/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(null);

		await expect(POST(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({ status: 404 });
	});

	it('clears github project fields and strips task-level github ids', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/unlink/+server');
		const { db, first, run } = createMockDb();
		first
			.mockResolvedValueOnce(
				makeRow({
					github_project_url: 'https://github.com/orgs/starspacegroup/projects/3',
					github_project_id: 'PVT_1',
					github_sync_enabled: 1,
					tasks: JSON.stringify([
						{
							text: 'a',
							done: false,
							status: 'planning',
							priority: 'medium',
							githubItemId: 'PVTI_1',
							githubIssueId: 'I_1',
							githubIssueNumber: 1,
							updatedAt: '2026-01-01T00:00:00Z'
						}
					])
				})
			) // getOpenProject
			.mockResolvedValueOnce({ id: 'p1' }) // updateOpenProject existence check
			.mockResolvedValueOnce(makeRow()); // updateOpenProject re-fetch

		const response = await POST(makeEvent({ user: adminUser, db }));
		const body = await response.json();

		expect(body.project.githubSyncEnabled).toBe(false);
		expect(body.project.githubProjectId).toBeNull();
		// The UPDATE call's bound tasks JSON should have no github* keys
		const updateCall = run.mock.calls;
		expect(updateCall.length).toBeGreaterThan(0);
	});
});

describe('POST /api/admin/projects/[id]/github/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects unauthenticated/forbidden/no-db as usual', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/sync/+server');
		const { db } = createMockDb();

		await expect(POST(makeEvent({ user: undefined, db }))).rejects.toMatchObject({ status: 401 });
		await expect(POST(makeEvent({ user: plainUser, db }))).rejects.toMatchObject({ status: 403 });
		await expect(POST(makeEvent({ user: adminUser }))).rejects.toMatchObject({ status: 500 });
	});

	it('404s when the project does not exist', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/sync/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(null);

		await expect(POST(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({ status: 404 });
	});

	it('400s when the project is not linked', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/sync/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(makeRow({ github_sync_enabled: 0 }));

		await expect(POST(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({ status: 400 });
	});

	it('400s when no GitHub sync token is configured', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/sync/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(makeRow({ github_sync_enabled: 1, github_project_id: 'PVT_1' }));

		await expect(POST(makeEvent({ user: adminUser, db, kv: makeKv() }))).rejects.toMatchObject({
			status: 400
		});
	});

	it('pushes then pulls, merges results, and persists the outcome', async () => {
		const { POST } = await import('../../src/routes/api/admin/projects/[id]/github/sync/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(
			makeRow({
				github_sync_enabled: 1,
				github_project_id: 'PVT_1',
				github_project_url: 'https://github.com/orgs/starspacegroup/projects/3'
			})
		);
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		// Board has no fields and no items — cheapest possible fetch stub that
		// satisfies both the push (fetchProjectV2Fields) and pull
		// (fetchProjectV2Fields + listProjectItems) round trips.
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({
				data: {
					node: {
						fields: { nodes: [] },
						items: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] }
					}
				}
			})
		});

		const response = await POST(makeEvent({ user: adminUser, db, kv }));
		const body = await response.json();

		expect(body.summary).toMatchObject({ appended: 0, unlinked: 0, error: null });
		expect(body.project).toBeTruthy();
	});
});

describe('GET /api/admin/projects/[id]/github/boards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects unauthenticated/forbidden/no-db as usual', async () => {
		const { GET } = await import('../../src/routes/api/admin/projects/[id]/github/boards/+server');
		const { db } = createMockDb();

		await expect(GET(makeEvent({ user: undefined, db }))).rejects.toMatchObject({ status: 401 });
		await expect(GET(makeEvent({ user: plainUser, db }))).rejects.toMatchObject({ status: 403 });
		await expect(GET(makeEvent({ user: adminUser }))).rejects.toMatchObject({ status: 500 });
	});

	it('404s when the project does not exist', async () => {
		const { GET } = await import('../../src/routes/api/admin/projects/[id]/github/boards/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValueOnce(null);

		await expect(GET(makeEvent({ user: adminUser, db }))).rejects.toMatchObject({ status: 404 });
	});

	it('400s when no GitHub sync token is configured', async () => {
		const { GET } = await import('../../src/routes/api/admin/projects/[id]/github/boards/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(makeRow());

		await expect(GET(makeEvent({ user: adminUser, db, kv: makeKv() }))).rejects.toMatchObject({
			status: 400
		});
	});

	it('returns discovered boards, parsing the repo from githubUrl', async () => {
		const { GET } = await import('../../src/routes/api/admin/projects/[id]/github/boards/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(makeRow({ github_url: 'https://github.com/starspacegroup/NebulaKit' }));
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('repository(')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({
						data: {
							repository: {
								projectsV2: {
									nodes: [
										{
											id: 'PVT_1',
											number: 1,
											title: 'Roadmap',
											url: 'https://github.com/orgs/starspacegroup/projects/1'
										}
									]
								}
							}
						}
					})
				};
			}
			if (body.query.includes('organizations(')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { viewer: { organizations: { nodes: [] } } } })
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { viewer: { projectsV2: { nodes: [] } } } })
			};
		});

		const response = await GET(makeEvent({ user: adminUser, db, kv }));
		const body = await response.json();

		expect(body.boards).toEqual([
			{
				id: 'PVT_1',
				number: 1,
				title: 'Roadmap',
				url: 'https://github.com/orgs/starspacegroup/projects/1',
				source: 'repository'
			}
		]);
	});

	it('skips the repo lookup when githubUrl is not set', async () => {
		const { GET } = await import('../../src/routes/api/admin/projects/[id]/github/boards/+server');
		const { db, first } = createMockDb();
		first.mockResolvedValue(makeRow({ github_url: null }));
		const kv = makeKv({
			github_sync_pat: JSON.stringify({ token: 'tok', login: 'x', updatedAt: 'x' })
		});
		const fetchMock = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('organizations(')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { viewer: { organizations: { nodes: [] } } } })
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { viewer: { projectsV2: { nodes: [] } } } })
			};
		});
		globalThis.fetch = fetchMock;

		const response = await GET(makeEvent({ user: adminUser, db, kv }));

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(2); // viewer + org, no repo call
	});
});
