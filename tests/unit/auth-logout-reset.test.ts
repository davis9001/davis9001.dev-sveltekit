/**
 * Logout and reset must revoke the server-side session, not just drop the
 * cookie — otherwise a copied cookie would keep working until it expired. These
 * cover the DB-revocation path added alongside the session-forgery fix.
 */
import { describe, expect, it, vi } from 'vitest';

/** A D1 mock that records DELETE FROM sessions calls. */
function makeDb(runImpl?: () => Promise<unknown>) {
	const deletes: string[] = [];
	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((id: string) => ({
				run: vi.fn(async () => {
					if (sql.includes('DELETE FROM sessions')) deletes.push(id);
					return runImpl ? runImpl() : { success: true };
				})
			}))
		}))
	};
	return { db, deletes };
}

describe('logout revokes the server-side session', () => {
	it('deletes the session row and clears the cookie (GET)', async () => {
		const { db, deletes } = makeDb();
		const cookies = { get: vi.fn().mockReturnValue('sess-123'), delete: vi.fn() };
		const { GET } = await import('../../src/routes/api/auth/logout/+server');

		await expect(GET({ cookies, platform: { env: { DB: db } } } as any)).rejects.toMatchObject({
			status: 302,
			location: '/auth/login'
		});

		expect(deletes).toEqual(['sess-123']);
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});

	it('deletes the session row and clears the cookie (POST)', async () => {
		const { db, deletes } = makeDb();
		const cookies = { get: vi.fn().mockReturnValue('sess-456'), delete: vi.fn() };
		const { POST } = await import('../../src/routes/api/auth/logout/+server');

		await expect(POST({ cookies, platform: { env: { DB: db } } } as any)).rejects.toMatchObject({
			status: 302
		});

		expect(deletes).toEqual(['sess-456']);
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});

	it('still clears the cookie when the delete throws', async () => {
		const { db } = makeDb(() => Promise.reject(new Error('D1 down')));
		const cookies = { get: vi.fn().mockReturnValue('sess-789'), delete: vi.fn() };
		const { GET } = await import('../../src/routes/api/auth/logout/+server');

		await expect(GET({ cookies, platform: { env: { DB: db } } } as any)).rejects.toMatchObject({
			status: 302
		});

		// The revocation failed but the cookie is gone and the row expires on its own.
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});

	it('clears the cookie even with no database', async () => {
		const cookies = { get: vi.fn().mockReturnValue('sess-x'), delete: vi.fn() };
		const { GET } = await import('../../src/routes/api/auth/logout/+server');

		await expect(GET({ cookies, platform: undefined } as any)).rejects.toMatchObject({
			status: 302
		});
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});
});

describe('reset revokes the session too', () => {
	function makeKv() {
		return {
			get: vi.fn().mockResolvedValue(null),
			delete: vi.fn().mockResolvedValue(undefined)
		};
	}

	it('deletes the session row on reset', async () => {
		const { db, deletes } = makeDb();
		const cookies = { get: vi.fn().mockReturnValue('sess-reset'), delete: vi.fn() };
		const { POST } = await import('../../src/routes/api/reset/+server');

		const res = await POST({
			platform: { env: { KV: makeKv(), DB: db } },
			cookies
		} as any);

		expect((await res.json()).success).toBe(true);
		expect(deletes).toEqual(['sess-reset']);
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});

	it('still succeeds when the session delete throws', async () => {
		const { db } = makeDb(() => Promise.reject(new Error('D1 down')));
		const cookies = { get: vi.fn().mockReturnValue('sess-reset'), delete: vi.fn() };
		const { POST } = await import('../../src/routes/api/reset/+server');

		const res = await POST({
			platform: { env: { KV: makeKv(), DB: db } },
			cookies
		} as any);

		expect((await res.json()).success).toBe(true);
		expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
	});
});
