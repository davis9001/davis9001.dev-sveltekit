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
	first: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
	bind: ReturnType<typeof vi.fn>;
};

function createMockDb(existingUser: unknown = null): MockDb {
	const first = vi.fn().mockResolvedValue(existingUser);
	const run = vi.fn().mockResolvedValue({ success: true });
	const bind = vi.fn().mockReturnValue({ first, run });
	const prepare = vi.fn().mockReturnValue({ bind });
	return { prepare, first, run, bind };
}

function createEvent(options: { origin?: string; db?: MockDb | null } = {}) {
	const origin = options.origin ?? 'http://localhost:4243';
	return {
		url: new URL(`${origin}/api/auth/dev-login`),
		platform: options.db === null ? undefined : options.db ? { env: { DB: options.db } } : undefined
	} as unknown as Parameters<typeof GET>[0];
}

function decodeSessionCookie(setCookie: string) {
	const match = setCookie.match(/session=([^;]+)/);
	if (!match) throw new Error('no session cookie');
	let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
	while (base64.length % 4) base64 += '=';
	return JSON.parse(atob(base64));
}

describe('Dev Login Endpoint', () => {
	beforeEach(() => {
		envState.dev = true;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should 404 when not running in dev mode', async () => {
		envState.dev = false;

		await expect(GET(createEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('should redirect to /admin with a session cookie when DB is unavailable', async () => {
		const response = await GET(createEvent({ db: null }));

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('http://localhost:4243/admin');

		const setCookie = response.headers.get('Set-Cookie') ?? '';
		expect(setCookie).toContain('session=');
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=Lax');
		expect(setCookie).not.toContain('Secure');
	});

	it('should issue an owner/superadmin session for davis9001', async () => {
		const response = await GET(createEvent({ db: null }));

		const session = decodeSessionCookie(response.headers.get('Set-Cookie') ?? '');
		expect(session.login).toBe('davis9001');
		expect(session.isOwner).toBe(true);
		expect(session.isAdmin).toBe(true);
		expect(session.id).toBe('dev-davis9001');
	});

	it('should set the Secure flag on https origins', async () => {
		const response = await GET(createEvent({ origin: 'https://dev.davis9001.dev', db: null }));

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

		const response = await GET(createEvent({ db }));

		const session = decodeSessionCookie(response.headers.get('Set-Cookie') ?? '');
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

		const response = await GET(createEvent({ db }));

		const session = decodeSessionCookie(response.headers.get('Set-Cookie') ?? '');
		expect(session.id).toBe('12345');
		expect(session.name).toBe('David Monaghan');
		expect(session.email).toBe('davis9001@github.local');
		expect(session.avatarUrl).toBe('https://github.com/davis9001.png');
	});

	it('should create the user row when davis9001 does not exist yet', async () => {
		const db = createMockDb(null);

		const response = await GET(createEvent({ db }));

		const session = decodeSessionCookie(response.headers.get('Set-Cookie') ?? '');
		expect(session.id).toBe('dev-davis9001');

		const statements = db.prepare.mock.calls.map((call) => call[0] as string);
		expect(statements.some((sql) => sql.includes('INSERT INTO users'))).toBe(true);

		expect(mockRecordLoginActivity).toHaveBeenCalledWith(db, 'dev-davis9001', 'github');
	});

	it('should still log in when the database throws', async () => {
		const db = createMockDb();
		db.bind.mockReturnValue({
			first: vi.fn().mockRejectedValue(new Error('D1 exploded')),
			run: vi.fn()
		});

		const response = await GET(createEvent({ db }));

		expect(response.status).toBe(302);
		const session = decodeSessionCookie(response.headers.get('Set-Cookie') ?? '');
		expect(session.isAdmin).toBe(true);
	});
});
