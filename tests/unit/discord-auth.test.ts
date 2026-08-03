import { beforeEach, describe, expect, it, vi } from 'vitest';

// The session payload now lives server-side (createAuthSession stores it in
// sessions.data) instead of in the cookie, so a test that used to decode the
// cookie reads it from here — captured from the sessions INSERT the login makes.
let __lastSessionPayload: any = null;

// A permissive D1 mock: selects miss, writes succeed. Enough for the auth
// callbacks to run their user upsert and create a server-side session, which
// login now requires (the cookie is an opaque id, not a self-contained token).
function makePermissiveDB() {
	return {
		prepare: (sql: string) => {
			let boundArgs: any[] = [];
			const stmt = {
				bind: (...args: any[]) => {
					boundArgs = args;
					return stmt;
				},
				first: async () => null,
				run: async () => {
					if (typeof sql === 'string' && sql.includes('INSERT INTO sessions') && boundArgs[3]) {
						try {
							__lastSessionPayload = JSON.parse(boundArgs[3]);
						} catch {
							/* leave as-is */
						}
					}
					return { success: true };
				},
				all: async () => ({ results: [] })
			};
			return stmt;
		}
	};
}

/**
 * Tests for Discord OAuth Authentication
 * TDD: Testing the Discord OAuth flow
 */

// Mock redirect
const mockRedirect = vi.fn((status: number, location: string) => {
	const err = new Error('Redirect') as Error & { status: number; location: string };
	err.status = status;
	err.location = location;
	throw err;
});

vi.mock('@sveltejs/kit', () => ({
	redirect: (status: number, location: string) => mockRedirect(status, location),
	isRedirect: (err: unknown) => {
		return err instanceof Error && 'location' in err && 'status' in err;
	}
}));

describe('Discord OAuth - Initial Redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should redirect to setup if Discord OAuth is not configured', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord');
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: undefined,
				KV: {
					get: vi.fn().mockResolvedValue(null)
				}
			}
		};

		await expect(
			GET({
				url: mockUrl,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({ status: 302, location: '/setup?error=oauth_not_configured' });
	});

	it('should redirect to Discord OAuth when configured via env', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord');
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: 'test-discord-client-id',
				KV: null
			}
		};

		await expect(
			GET({
				url: mockUrl,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({
			status: 302
		});

		expect(mockRedirect).toHaveBeenCalled();
		const redirectUrl = mockRedirect.mock.calls[0][1];
		expect(redirectUrl).toContain('https://discord.com/api/oauth2/authorize');
		expect(redirectUrl).toContain('client_id=test-discord-client-id');
	});

	it('should redirect to Discord OAuth when configured via KV', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord');
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: undefined,
				KV: {
					get: vi.fn().mockResolvedValue(JSON.stringify({ clientId: 'kv-discord-client-id' }))
				}
			}
		};

		await expect(
			GET({
				url: mockUrl,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({
			status: 302
		});

		expect(mockRedirect).toHaveBeenCalled();
		const redirectUrl = mockRedirect.mock.calls[0][1];
		expect(redirectUrl).toContain('client_id=kv-discord-client-id');
	});

	it('should include correct Discord OAuth scopes', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord');
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: 'test-discord-client-id'
			}
		};

		await expect(
			GET({
				url: mockUrl,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({ status: 302 });

		const redirectUrl = mockRedirect.mock.calls[0][1];
		expect(redirectUrl).toContain('scope=identify+email');
	});
});

describe('Discord OAuth - Callback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('should redirect to login with error when no code provided', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord/callback');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};

		await expect(
			GET({
				url: mockUrl,
				cookies: mockCookies,
				platform: {}
			} as any)
		).rejects.toMatchObject({ status: 302, location: '/auth/login?error=no_code' });
	});

	it('should redirect to login with error when Discord OAuth not configured', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		const mockUrl = new URL('http://localhost/api/auth/discord/callback?code=test-code');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: undefined,
				DISCORD_CLIENT_SECRET: undefined,
				KV: {
					get: vi.fn().mockResolvedValue(null)
				}
			}
		};

		await expect(
			GET({
				url: mockUrl,
				cookies: mockCookies,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({ status: 302, location: '/auth/login?error=not_configured' });
	});

	it('should exchange code for token and create session on success', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		const mockDiscordUser = {
			id: '123456789',
			username: 'testuser',
			discriminator: '0',
			email: 'test@discord.com',
			avatar: 'abc123'
		};

		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ access_token: 'discord-access-token' })
			} as any)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockDiscordUser)
			} as any);

		const mockUrl = new URL('http://localhost/api/auth/discord/callback?code=test-code');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};
		const mockPlatform = {
			env: {
				DISCORD_CLIENT_ID: 'test-client-id',
				DISCORD_CLIENT_SECRET: 'test-client-secret',
				DB: {
					prepare: vi.fn().mockReturnValue({
						bind: vi.fn().mockReturnValue({
							first: vi.fn().mockResolvedValue(null),
							run: vi.fn().mockResolvedValue({})
						})
					})
				},
				KV: {
					get: vi.fn().mockResolvedValue(null),
					put: vi.fn().mockResolvedValue(undefined)
				}
			}
		};

		const response = await GET({
			url: mockUrl,
			cookies: mockCookies,
			platform: mockPlatform
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('http://localhost/');
		expect(response.headers.get('Set-Cookie')).toContain('session=');
	});

	it('should grant admin access to davis9001 without owner env config', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		const mockDiscordUser = {
			id: '999999999',
			username: 'davis9001',
			discriminator: '0',
			email: 'davis9001@discord.com',
			avatar: 'avatarhash'
		};

		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ access_token: 'discord-access-token' })
			} as any)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockDiscordUser)
			} as any);

		const mockUrl = new URL('http://localhost/api/auth/discord/callback?code=test-code');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: 'test-client-id',
				DISCORD_CLIENT_SECRET: 'test-client-secret'
			}
		};

		const response = await GET({
			url: mockUrl,
			cookies: mockCookies,
			platform: mockPlatform
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('http://localhost/admin');

		const cookie = response.headers.get('Set-Cookie');
		expect(cookie).toContain('session=');

		// The payload is stored server-side now, not encoded in the cookie.
		const session = __lastSessionPayload;
		expect(session.login).toBe('davis9001');
		expect(session.isOwner).toBe(true);
		expect(session.isAdmin).toBe(true);
	});

	it('should handle token exchange failure', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			text: () => Promise.resolve('Bad Request')
		} as any);

		const mockUrl = new URL('http://localhost/api/auth/discord/callback?code=invalid-code');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: 'test-client-id',
				DISCORD_CLIENT_SECRET: 'test-client-secret'
			}
		};

		await expect(
			GET({
				url: mockUrl,
				cookies: mockCookies,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({ status: 302, location: '/auth/login?error=token_exchange_failed' });
	});

	it('should handle user fetch failure', async () => {
		const { GET } = await import('../../src/routes/api/auth/discord/callback/+server');

		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ access_token: 'discord-access-token' })
			} as any)
			.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: () => Promise.resolve('Unauthorized')
			} as any);

		const mockUrl = new URL('http://localhost/api/auth/discord/callback?code=test-code');
		const mockCookies = {
			set: vi.fn(),
			get: vi.fn()
		};
		const mockPlatform = {
			env: {
				DB: makePermissiveDB(),
				DISCORD_CLIENT_ID: 'test-client-id',
				DISCORD_CLIENT_SECRET: 'test-client-secret'
			}
		};

		await expect(
			GET({
				url: mockUrl,
				cookies: mockCookies,
				platform: mockPlatform
			} as any)
		).rejects.toMatchObject({ status: 302, location: '/auth/login?error=user_fetch_failed' });
	});
});
