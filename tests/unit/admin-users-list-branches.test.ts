/**
 * Branch coverage for api/admin/users/+server.ts
 *
 * Covers the legacy-schema detection arms: a thrown non-Error value, an error
 * naming discord_avatar_url rather than discord_username, and a result set
 * with no `results` property.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROUTE = '../../src/routes/api/admin/users/+server';

const adminLocals = { user: { id: 'admin-1', isOwner: true, isAdmin: true } };

/** First .all() rejects with `failWith`; the legacy retry resolves with `retryResult`. */
function makeDB(failWith: unknown, retryResult: any = { results: [] }) {
	let calls = 0;
	return {
		prepare: vi.fn(() => ({
			all: vi.fn(async () => {
				calls += 1;
				if (calls === 1) throw failWith;
				return retryResult;
			}),
			bind: vi.fn(() => ({ all: vi.fn(async () => retryResult) }))
		}))
	};
}

describe('Admin users list — branch coverage', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('falls back to the legacy query when discord_avatar_url is missing', async () => {
		// The second arm of the discord-column check.
		const db = makeDB(new Error('no such column: discord_avatar_url'), {
			results: [{ id: 'u1', email: 'a@b.c' }]
		});

		const { GET } = await import(ROUTE);
		const res = await GET({ platform: { env: { DB: db } }, locals: adminLocals } as any);
		const data = await res.json();

		expect(data.users).toHaveLength(1);
	});

	it('coerces a non-Error rejection before inspecting it', async () => {
		// queryErr?.message is undefined for a thrown string, so String(queryErr) is used.
		const db = makeDB('no such column: discord_username', {
			results: [{ id: 'u2', email: 'x@y.z' }]
		});

		const { GET } = await import(ROUTE);
		const res = await GET({ platform: { env: { DB: db } }, locals: adminLocals } as any);
		const data = await res.json();

		expect(data.users).toHaveLength(1);
	});

	it('rethrows an unrelated query failure as a 500', async () => {
		const db = makeDB(new Error('database is locked'));

		const { GET } = await import(ROUTE);
		await expect(
			GET({ platform: { env: { DB: db } }, locals: adminLocals } as any)
		).rejects.toMatchObject({ status: 500 });
	});

	it('returns an empty list when the query yields no results property', async () => {
		// result.results || []
		const db = {
			prepare: vi.fn(() => ({
				all: vi.fn(async () => ({})),
				bind: vi.fn(() => ({ all: vi.fn(async () => ({})) }))
			}))
		};

		const { GET } = await import(ROUTE);
		const res = await GET({ platform: { env: { DB: db } }, locals: adminLocals } as any);
		const data = await res.json();

		expect(data.users).toEqual([]);
	});
});
