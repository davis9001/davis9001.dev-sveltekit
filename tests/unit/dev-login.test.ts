/**
 * Tests for the dev-only simulated owner sign-in endpoint
 * (/api/auth/dev-login)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envState = vi.hoisted(() => ({ dev: true }));

vi.mock('$app/environment', () => ({
	get dev() {
		return envState.dev;
	}
}));

const mockRecordLoginActivity = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/services/user-activity', () => ({
	recordLoginActivity: mockRecordLoginActivity
}));

import { GET } from '../../src/routes/api/auth/dev-login/+server';

type MockDb = {
	prepare: ReturnType<typeof vi.fn>;
};

// The session payload is stored server-side now (createAuthSession writes it to
// sessions.data), so the mock captures it from that INSERT and tests read it
// here instead of decoding the cookie, which is just an opaque id.
let capturedSession: any = null;

function createMockDb(existingUser: unknown = null, opts: { firstRejects?: boolean } = {}): MockDb {
	const prepare = vi.fn((sql: string) => ({
		bind: vi.fn((...args: any[]) => ({
			first: vi.fn(async () => {
				if (opts.firstRejects) throw new Error('D1 exploded');
				return existingUser;
			}),
			run: vi.fn(async () => {
				if (typeof sql === 'string' && sql.includes('INSERT INTO sessions') && args[3]) {
					try {
						capturedSession = JSON.parse(args[3]);
					} catch {
						/* leave as-is */
					}
				}
				return { success: true };
			})
		}))
	}));
	return { prepare } as unknown as MockDb;
}

function createEvent(options: { origin?: string; db?: MockDb | null } = {}) {
	const origin = options.origin ?? 'http://localhost:4243';
	return {
		url: new URL(`${origin}/api/auth/dev-login`),
		platform: options.db === null ? undefined : options.db ? { env: { DB: options.db } } : undefined
	} as unknown as Parameters<typeof GET>[0];
}

/** The payload the login stored server-side for this session. */
function sessionPayload() {
	return capturedSession;
}

describe('Dev Login Endpoint', () => {
	beforeEach(() => {
		envState.dev = true;
		capturedSession = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should 404 when not running in dev mode', async () => {
		envState.dev = false;

		await expect(GET(createEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('requires a database, since the session lives server-side now', async () => {
		// The cookie is an opaque id backed by a sessions row; with no database
		// there is nothing to back it, so the login errors rather than handing
		// out a cookie the hooks would reject anyway.
		await expect(GET(createEvent({ db: null }))).rejects.toMatchObject({ status: 500 });
	});

	it('should redirect to /admin with a session cookie', async () => {
		const response = await GET(createEvent({ db: createMockDb() }));

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('http://localhost:4243/admin');

		const setCookie = response.headers.get('Set-Cookie') ?? '';
		expect(setCookie).toContain('session=');
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=Lax');
		expect(setCookie).not.toContain('Secure');
	});

	it('should issue an owner/superadmin session for davis9001', async () => {
		await GET(createEvent({ db: createMockDb() }));

		const session = sessionPayload();
		expect(session.login).toBe('davis9001');
		expect(session.isOwner).toBe(true);
		expect(session.isAdmin).toBe(true);
		expect(session.id).toBe('dev-davis9001');
	});

	it('should set the Secure flag on https origins', async () => {
		const response = await GET(
			createEvent({ origin: 'https://dev.davis9001.dev', db: createMockDb() })
		);

		expect(response.headers.get('Set-Cookie')).toContain('Secure');
		expect(response.headers.get('Location')).toBe('https://dev.davis9001.dev/admin');
	});

	it('should reuse an existing davis9001 user row and grant admin', async () => {
		const db = createMockDb({
			id: '12345',
			name: 'David M',
			email: 'real@example.com',
			github_avatar_url: 'https://avatars.example/x.png'
		});

		await GET(createEvent({ db }));

		const session = sessionPayload();
		expect(session.id).toBe('12345');
		expect(session.name).toBe('David M');
		expect(session.email).toBe('real@example.com');
		expect(session.avatarUrl).toBe('https://avatars.example/x.png');

		// UPDATE ... is_admin = 1 path, no INSERT
		const statements = db.prepare.mock.calls.map((call) => call[0] as string);
		expect(statements.some((sql) => sql.includes('UPDATE users SET is_admin = 1'))).toBe(true);
		expect(statements.some((sql) => sql.includes('INSERT INTO users'))).toBe(false);

		expect(mockRecordLoginActivity).toHaveBeenCalledWith(db, '12345', 'github');
	});

	it('should fall back to defaults when existing user row has null fields', async () => {
		const db = createMockDb({ id: '12345', name: null, email: null, github_avatar_url: null });

		await GET(createEvent({ db }));

		const session = sessionPayload();
		expect(session.id).toBe('12345');
		expect(session.name).toBe('David Monaghan');
		expect(session.email).toBe('davis9001@github.local');
		expect(session.avatarUrl).toBe('https://github.com/davis9001.png');
	});

	it('should create the user row when davis9001 does not exist yet', async () => {
		const db = createMockDb(null);

		await GET(createEvent({ db }));

		const session = sessionPayload();
		expect(session.id).toBe('dev-davis9001');

		const statements = db.prepare.mock.calls.map((call) => call[0] as string);
		expect(statements.some((sql) => sql.includes('INSERT INTO users'))).toBe(true);

		expect(mockRecordLoginActivity).toHaveBeenCalledWith(db, 'dev-davis9001', 'github');
	});

	it('still logs in when a user query throws, as long as the session store works', async () => {
		// The user-upsert is best-effort; a failure there is caught and the login
		// proceeds to create the session, which is what actually gates access.
		const db = createMockDb(null, { firstRejects: true });

		const response = await GET(createEvent({ db }));

		expect(response.status).toBe(302);
		const session = sessionPayload();
		expect(session.isAdmin).toBe(true);
	});
});
