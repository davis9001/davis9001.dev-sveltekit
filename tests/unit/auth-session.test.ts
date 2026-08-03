/**
 * Regression guard for the session-cookie forgery fix.
 *
 * The session cookie used to be unsigned base64 JSON that hooks.server.ts
 * trusted verbatim, so anyone could forge one with isAdmin/isOwner set and take
 * over admin. Now the cookie is an opaque id and the trusted payload lives
 * server-side in sessions.data. These tests pin the two properties that make
 * forgery impossible: an id that is not in the table resolves to nobody, and a
 * stored payload round-trips faithfully.
 */
import { describe, expect, it, vi } from 'vitest';
import { createAuthSession, getAuthSession, type SessionUser } from '$lib/utils/db';
import type { D1Database } from '@cloudflare/workers-types';

/** A tiny in-memory stand-in for the sessions table. */
function makeDb() {
	const rows = new Map<string, { user_id: string; expires_at: string; data: string }>();
	const db = {
		prepare(sql: string) {
			return {
				bind(...args: any[]) {
					return {
						async run() {
							if (sql.includes('INSERT INTO sessions')) {
								const [id, user_id, expires_at, data] = args;
								rows.set(id, { user_id, expires_at, data });
							}
							return { success: true };
						},
						async first() {
							if (sql.includes('SELECT data FROM sessions')) {
								const row = rows.get(args[0]);
								if (!row) return null;
								if (new Date(row.expires_at).getTime() <= Date.now()) return null;
								return { data: row.data };
							}
							return null;
						}
					};
				}
			};
		}
	} as unknown as D1Database;
	return { db, rows };
}

const USER: SessionUser = {
	id: 'user-1',
	login: 'davis9001',
	email: 'd@example.com',
	isOwner: true,
	isAdmin: true
};

describe('server-side auth sessions', () => {
	it('round-trips a stored session payload', async () => {
		const { db } = makeDb();
		const id = await createAuthSession(db, USER);
		expect(id).toBeTruthy();

		const resolved = await getAuthSession(db, id);
		expect(resolved).toEqual(USER);
	});

	it('returns null for a cookie that names no session (the forgery case)', async () => {
		const { db } = makeDb();
		// A hand-crafted id — or an old base64 payload — matches no stored row.
		expect(await getAuthSession(db, 'anything-a-client-made-up')).toBeNull();
		const forged = btoa(JSON.stringify({ id: 'x', isOwner: true, isAdmin: true }));
		expect(await getAuthSession(db, forged)).toBeNull();
	});

	it('returns null once a session has expired', async () => {
		const { db, rows } = makeDb();
		const id = await createAuthSession(db, USER);
		// Backdate its expiry.
		const row = rows.get(id)!;
		row.expires_at = new Date(Date.now() - 1000).toISOString();
		expect(await getAuthSession(db, id)).toBeNull();
	});

	it('returns null when the stored payload is unparseable', async () => {
		const { db, rows } = makeDb();
		const id = await createAuthSession(db, USER);
		rows.get(id)!.data = '{not valid json';
		expect(await getAuthSession(db, id)).toBeNull();
	});

	it('stores the user id as the foreign key so the row references a real user', async () => {
		const { db, rows } = makeDb();
		const id = await createAuthSession(db, USER);
		expect(rows.get(id)!.user_id).toBe(USER.id);
	});

	it('gives each login a distinct, unguessable id', async () => {
		const ids = new Set<string>();
		const uuids = ['id-a', 'id-b', 'id-c'];
		let i = 0;
		vi.stubGlobal('crypto', { randomUUID: () => uuids[i++] });
		try {
			const { db } = makeDb();
			for (let n = 0; n < 3; n++) ids.add(await createAuthSession(db, USER));
		} finally {
			vi.unstubAllGlobals();
		}
		expect(ids.size).toBe(3);
	});
});
