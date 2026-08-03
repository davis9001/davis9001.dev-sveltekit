/**
 * Branch coverage for api/auth/github/callback/+server.ts
 *
 * Targets the linked-account login path: account merging when the GitHub
 * identity already belongs to a different user, the `linkedUser.x || githubUser.x`
 * fallbacks for a sparsely-populated user row, the owner-admin grant, the
 * Secure-cookie arm on HTTPS, and the owner vs non-owner redirect split.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The session payload now lives server-side (createAuthSession stores it in
// sessions.data) instead of in the cookie, so tests read it from here — makeDB
// captures it from the sessions INSERT the login performs.
let __lastSessionPayload: any = null;

const ROUTE = '../../src/routes/api/auth/github/callback/+server';

const mergeAccounts = vi.fn().mockResolvedValue(undefined);
const recordLoginActivity = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/services/account-merge', () => ({
	mergeAccounts: (...args: unknown[]) => mergeAccounts(...args)
}));
vi.mock('$lib/services/user-activity', () => ({
	recordLoginActivity: (...args: unknown[]) => recordLoginActivity(...args)
}));

const GITHUB_USER = {
	id: 4242,
	login: 'gh-login',
	name: 'GH Name',
	email: 'gh@example.com',
	avatar_url: 'https://avatars.example/gh.png'
};

function okJson(body: unknown) {
	return { ok: true, json: () => Promise.resolve(body) };
}

/**
 * DB double for the linked-account path.
 * `existingOAuthUserId` non-null and different from the user id triggers the merge.
 */
function makeDB(opts: {
	existingUser: any;
	existingOAuthUserId?: string | null;
	linkedUser: any;
	onRun?: (sql: string) => void;
}) {
	return {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: any[]) => ({
				first: vi.fn(async () => {
					if (sql.includes('FROM oauth_accounts')) {
						return opts.existingOAuthUserId ? { user_id: opts.existingOAuthUserId } : null;
					}
					// The linked-account login path uses this exact statement.
					if (sql === 'SELECT * FROM users WHERE id = ?') {
						return opts.linkedUser;
					}
					if (sql.includes('FROM users')) {
						return opts.existingUser;
					}
					return null;
				}),
				all: vi.fn(async () => ({ results: [] })),
				run: vi.fn(async () => {
					// The session payload lives server-side now; capture it from the
					// sessions INSERT so a test can read what was stored.
					if (sql.includes('INSERT INTO sessions') && args[3]) {
						try {
							__lastSessionPayload = JSON.parse(args[3]);
						} catch {
							/* leave as-is */
						}
					}
					opts.onRun?.(sql);
					return { success: true };
				})
			}))
		}))
	};
}

function makeEvent(db: any, protocol: 'http:' | 'https:', env: Record<string, unknown> = {}) {
	return {
		url: new URL(`${protocol}//localhost/api/auth/github/callback?code=abc`),
		cookies: { get: vi.fn().mockReturnValue(null), set: vi.fn(), delete: vi.fn() },
		platform: {
			env: {
				GITHUB_CLIENT_ID: 'cid',
				GITHUB_CLIENT_SECRET: 'secret',
				DB: db,
				...env
			}
		},
		locals: {}
	} as any;
}

describe('GitHub callback — linked account branches', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		vi.stubGlobal('crypto', { randomUUID: () => 'uuid-fixed' });
		mockFetch = vi.fn();
		mockFetch.mockResolvedValueOnce(okJson({ access_token: 'token' }));
		mockFetch.mockResolvedValueOnce(okJson(GITHUB_USER));
		vi.stubGlobal('fetch', mockFetch);
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('falls back to the GitHub profile when the stored row is sparse', async () => {
		// Every `linkedUser.x || githubUser.x` fallback fires at once.
		const db = makeDB({
			existingUser: { id: 'user-2', email: null },
			existingOAuthUserId: 'user-2',
			linkedUser: {
				id: 'user-2',
				email: null,
				name: null,
				github_login: null,
				github_avatar_url: null,
				is_admin: 0
			}
		});

		const { GET } = await import(ROUTE);
		const res = await GET(makeEvent(db, 'http:'));
		expect(res.status).toBe(302);

		// Payload is stored server-side now, captured from the sessions INSERT.
		const session = __lastSessionPayload;

		expect(session.login).toBe(GITHUB_USER.login);
		expect(session.name).toBe(GITHUB_USER.name);
		expect(session.email).toBe(GITHUB_USER.email);
		expect(session.avatarUrl).toBe(GITHUB_USER.avatar_url);
	});

	it('sends a non-owner to the site root without a Secure cookie over http', async () => {
		const db = makeDB({
			existingUser: { id: 'user-3', email: 'gh@example.com' },
			existingOAuthUserId: 'user-3',
			linkedUser: {
				id: 'user-3',
				email: 'gh@example.com',
				name: 'Plain',
				github_login: 'plain',
				github_avatar_url: 'https://avatars.example/p.png',
				is_admin: 0
			}
		});

		const { GET } = await import(ROUTE);
		const res = await GET(makeEvent(db, 'http:'));

		expect(res.headers.get('Location')).toBe('http://localhost/');
		expect(res.headers.get('Set-Cookie')).not.toContain('Secure');
	});

	it('sends an admin to /admin and marks the cookie Secure over https', async () => {
		const db = makeDB({
			existingUser: { id: 'user-4', email: 'gh@example.com' },
			existingOAuthUserId: 'user-4',
			linkedUser: {
				id: 'user-4',
				email: 'gh@example.com',
				name: 'Admin',
				github_login: 'adminlogin',
				github_avatar_url: 'https://avatars.example/a.png',
				is_admin: 1
			}
		});

		const { GET } = await import(ROUTE);
		const res = await GET(makeEvent(db, 'https:'));

		expect(res.headers.get('Location')).toBe('https://localhost/admin');
		expect(res.headers.get('Set-Cookie')).toContain('Secure');
	});

	it('grants admin to the configured owner when their row is not yet admin', async () => {
		const runSql: string[] = [];
		const db = makeDB({
			existingUser: { id: 'owner-1', email: 'gh@example.com' },
			existingOAuthUserId: 'owner-1',
			linkedUser: {
				id: 'owner-1',
				email: 'gh@example.com',
				name: 'Owner',
				github_login: 'gh-login',
				github_avatar_url: 'https://avatars.example/o.png',
				is_admin: 0
			},
			onRun: (sql) => runSql.push(sql)
		});

		const { GET } = await import(ROUTE);
		const res = await GET(makeEvent(db, 'https:', { GITHUB_OWNER_ID: '4242' }));

		// isOwner && linkedUser.is_admin !== 1 -> grantOwnerAdmin runs an UPDATE
		expect(runSql.some((s) => s.includes('UPDATE users') && s.includes('is_admin'))).toBe(true);
		expect(res.headers.get('Location')).toBe('https://localhost/admin');
	});
});
