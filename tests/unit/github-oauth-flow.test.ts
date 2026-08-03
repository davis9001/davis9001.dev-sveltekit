import { beforeEach, describe, expect, it, vi } from 'vitest';

// The session payload lives server-side now (createAuthSession stores it in
// sessions.data); tests read it here, captured from the sessions INSERT, rather
// than decoding the cookie, which is just an opaque id.
let __lastSessionPayload: any = null;

function captureSession(sql: string, args: any[]) {
	if (typeof sql === 'string' && sql.includes('INSERT INTO sessions') && args[3]) {
		try {
			__lastSessionPayload = JSON.parse(args[3]);
		} catch {
			/* leave as-is */
		}
	}
}

// A permissive D1 mock: selects miss, writes succeed, session payload captured.
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
					captureSession(sql, boundArgs);
					return { success: true };
				},
				all: async () => ({ results: [] })
			};
			return stmt;
		}
	};
}

/**
 * Tests for GitHub OAuth Endpoints
 * TDD: Tests for GitHub authentication flow
 */

describe('GitHub Auth API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	describe('GET /api/auth/github', () => {
		it('should redirect to setup when client ID not configured', async () => {
			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					KV: {
						get: vi.fn().mockResolvedValue(null)
					}
				}
			};

			const { GET } = await import('../../src/routes/api/auth/github/+server');

			try {
				await GET({
					platform: mockPlatform,
					url: new URL('http://localhost:4220/api/auth/github')
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('/setup');
			}
		});

		it('should redirect to GitHub OAuth when configured via env', async () => {
			vi.stubGlobal('crypto', { randomUUID: () => 'state-uuid' });

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'env-client-id'
				}
			};

			const { GET } = await import('../../src/routes/api/auth/github/+server');

			try {
				await GET({
					platform: mockPlatform,
					url: new URL('http://localhost:4220/api/auth/github')
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('github.com/login/oauth/authorize');
				expect(err.location).toContain('client_id=env-client-id');
			}
		});

		it('should redirect to GitHub OAuth when configured via KV', async () => {
			vi.stubGlobal('crypto', { randomUUID: () => 'state-uuid' });

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					KV: {
						get: vi.fn().mockResolvedValue(JSON.stringify({ clientId: 'kv-client-id' }))
					}
				}
			};

			const { GET } = await import('../../src/routes/api/auth/github/+server');

			try {
				await GET({
					platform: mockPlatform,
					url: new URL('http://localhost:4220/api/auth/github')
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('client_id=kv-client-id');
			}
		});
	});

	describe('GET /api/auth/github/callback', () => {
		it('should redirect to login with error when no code provided', async () => {
			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			try {
				await GET({
					url: new URL('http://localhost:4220/api/auth/github/callback'),
					cookies: { set: vi.fn(), delete: vi.fn() },
					platform: {}
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('error=no_code');
			}
		});

		it('should redirect to login when OAuth not configured', async () => {
			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					KV: {
						get: vi.fn().mockResolvedValue(null)
					}
				}
			};

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			try {
				await GET({
					url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
					cookies: { set: vi.fn(), delete: vi.fn() },
					platform: mockPlatform
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('error=not_configured');
			}
		});

		it('should handle token exchange failure', async () => {
			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret'
				}
			};

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				text: vi.fn().mockResolvedValue('Bad Request')
			});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			try {
				await GET({
					url: new URL('http://localhost:4220/api/auth/github/callback?code=invalid-code'),
					cookies: { set: vi.fn(), delete: vi.fn() },
					platform: mockPlatform
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('error=token_exchange_failed');
			}
		});

		it('should handle missing access token in response', async () => {
			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret'
				}
			};

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ error: 'no token' })
			});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			try {
				await GET({
					url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
					cookies: { set: vi.fn(), delete: vi.fn() },
					platform: mockPlatform
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('error=no_access_token');
			}
		});

		it('should handle user fetch failure', async () => {
			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret'
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 401,
					text: vi.fn().mockResolvedValue('Unauthorized')
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			try {
				await GET({
					url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
					cookies: { set: vi.fn(), delete: vi.fn() },
					platform: mockPlatform
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toContain('error=user_fetch_failed');
			}
		});

		it('should complete OAuth flow and set session cookie', async () => {
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					GITHUB_OWNER_ID: '12345'
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'testuser',
						name: 'Test User',
						email: 'test@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			// Should return a redirect response with cookie header
			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe('http://localhost:4220/admin'); // Owner goes to admin
			expect(response.headers.get('Set-Cookie')).toContain('session=');
			expect(response.headers.get('Set-Cookie')).toContain('Path=/');
			expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
		});

		it('should redirect non-owner to home', async () => {
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					GITHUB_OWNER_ID: '99999' // Different from user ID
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'regularuser',
						name: 'Regular User',
						email: 'regular@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			// Should return a redirect response
			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe('http://localhost:4220/'); // Non-owner goes to home
		});

		it('should grant admin access to davis9001 without owner env config', async () => {
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret'
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 777,
						login: 'davis9001',
						name: 'Davis',
						email: 'davis9001@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe('http://localhost:4220/admin');

			const cookie = response.headers.get('Set-Cookie');
			expect(cookie).toContain('session=');

			// Payload is stored server-side now, captured from the sessions INSERT.
			const session = __lastSessionPayload;
			expect(session.login).toBe('davis9001');
			expect(session.isOwner).toBe(true);
			expect(session.isAdmin).toBe(true);
		});

		it('should store user in database when available', async () => {
			const mockDbRun = vi.fn().mockResolvedValue({});
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					DB: {
						prepare: vi.fn().mockReturnValue({
							bind: vi.fn().mockReturnValue({
								first: vi.fn().mockResolvedValue(null), // New user
								run: mockDbRun
							})
						})
					}
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'newuser',
						name: 'New User',
						email: 'new@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(302);
			expect(mockPlatform.env.DB.prepare).toHaveBeenCalled();
		});

		it('should update existing user in database', async () => {
			const mockDbRun = vi.fn().mockResolvedValue({});
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			// Track call order to return different results for different queries
			let callCount = 0;
			const mockPlatform = {
				env: {
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					DB: {
						prepare: vi.fn().mockImplementation(() => ({
							bind: vi.fn().mockImplementation(() => ({
								first: vi.fn().mockImplementation(() => {
									callCount++;
									// Call 1: Check for linked oauth account - not linked
									if (callCount === 1) return Promise.resolve(null);
									// Call 2: Check if user exists - exists
									if (callCount === 2) return Promise.resolve({ id: '12345', is_admin: 1 });
									// Call 3: Check if oauth_accounts record exists - not exists
									if (callCount === 3) return Promise.resolve(null);
									return Promise.resolve(null);
								}),
								run: mockDbRun
							}))
						}))
					}
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'existinguser',
						name: 'Existing User',
						email: 'existing@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(302);
			// Should have called prepare for various DB operations
			expect(mockPlatform.env.DB.prepare).toHaveBeenCalled();
		});

		it('should mark first admin login as completed', async () => {
			const mockKVPut = vi.fn().mockResolvedValue(undefined);
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					DB: makePermissiveDB(),
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					GITHUB_OWNER_ID: '12345',
					KV: {
						get: vi.fn().mockResolvedValue(null), // Not logged in before
						put: mockKVPut
					}
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'owner',
						name: 'Owner',
						email: 'owner@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(302);
			expect(mockKVPut).toHaveBeenCalledWith('admin_first_login_completed', 'true');
		});

		it('should promote an existing owner-matching GitHub user to admin', async () => {
			const mockDbRun = vi.fn().mockResolvedValue({});
			const mockCookies = {
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(null)
			};

			const mockPlatform = {
				env: {
					GITHUB_CLIENT_ID: 'test-client',
					GITHUB_CLIENT_SECRET: 'test-secret',
					GITHUB_OWNER_USERNAME: 'davis9001',
					DB: {
						prepare: vi.fn().mockImplementation((sql: string) => {
							if (
								sql.includes(
									'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?'
								)
							) {
								return {
									bind: vi.fn().mockReturnValue({
										first: vi.fn().mockResolvedValue(null)
									})
								};
							}
							if (sql.includes('SELECT id, is_admin FROM users WHERE id = ?')) {
								return {
									bind: vi.fn().mockReturnValue({
										first: vi.fn().mockResolvedValue({ id: '12345', is_admin: 0 })
									})
								};
							}
							if (
								sql.includes('SELECT id FROM oauth_accounts WHERE user_id = ? AND provider = ?')
							) {
								return {
									bind: vi.fn().mockReturnValue({
										first: vi.fn().mockResolvedValue({ id: 'oauth-123' })
									})
								};
							}
							if (sql.includes('UPDATE users')) {
								return {
									bind: vi.fn().mockReturnValue({
										run: mockDbRun
									})
								};
							}
							return {
								bind: vi.fn((...args: any[]) => ({
									first: vi.fn().mockResolvedValue(null),
									run: vi.fn(async () => {
										captureSession(sql, args);
										return mockDbRun();
									})
								}))
							};
						})
					}
				}
			};

			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ access_token: 'valid-token' })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: 12345,
						login: 'davis9001',
						name: 'Davis',
						email: 'davis@example.com',
						avatar_url: 'https://example.com/avatar.png'
					})
				});

			const { GET } = await import('../../src/routes/api/auth/github/callback/+server');

			const response = await GET({
				url: new URL('http://localhost:4220/api/auth/github/callback?code=test-code'),
				cookies: mockCookies,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe('http://localhost:4220/admin');
			// Payload is stored server-side now, captured from the sessions INSERT.
			const session = __lastSessionPayload;
			expect(session.isOwner).toBe(true);
			expect(session.isAdmin).toBe(true);
			expect(mockDbRun).toHaveBeenCalled();
		});
	});

	describe('GET/POST /api/auth/logout', () => {
		it('should clear session cookie on GET logout', async () => {
			const mockCookies = {
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(undefined)
			};

			const { GET } = await import('../../src/routes/api/auth/logout/+server');

			try {
				await GET({
					cookies: mockCookies
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toBe('/auth/login');
				expect(mockCookies.delete).toHaveBeenCalledWith('session', { path: '/' });
			}
		});

		it('should clear session cookie on POST logout', async () => {
			const mockCookies = {
				delete: vi.fn(),
				get: vi.fn().mockReturnValue(undefined)
			};

			const { POST } = await import('../../src/routes/api/auth/logout/+server');

			try {
				await POST({
					cookies: mockCookies
				} as any);
				expect.fail('Should have thrown redirect');
			} catch (err: any) {
				expect(err.status).toBe(302);
				expect(err.location).toBe('/auth/login');
				expect(mockCookies.delete).toHaveBeenCalledWith('session', { path: '/' });
			}
		});
	});
});
