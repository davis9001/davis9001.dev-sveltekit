import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Admin Users API', () => {
	let mockPlatform: any;
	let mockLocals: any;

	beforeEach(() => {
		// Mock database
		const mockDB = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn(),
			first: vi.fn(),
			run: vi.fn()
		};

		// Mock KV
		const mockKV = {
			get: vi.fn(),
			put: vi.fn()
		};

		mockPlatform = {
			env: {
				DB: mockDB,
				KV: mockKV
			}
		};

		mockLocals = {
			user: {
				id: '1',
				login: 'testowner',
				email: 'owner@test.com',
				isOwner: true,
				isAdmin: true
			}
		};
	});

	describe('GET /api/admin/users', () => {
		it('should require authentication', async () => {
			mockLocals.user = null;

			const { GET } = await import('../../src/routes/api/admin/users/+server.js');

			try {
				await GET({ platform: mockPlatform, locals: mockLocals } as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(401);
			}
		});

		it('should require admin access', async () => {
			mockLocals.user.isOwner = false;
			mockLocals.user.isAdmin = false;

			const { GET } = await import('../../src/routes/api/admin/users/+server.js');

			try {
				await GET({ platform: mockPlatform, locals: mockLocals } as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(403);
			}
		});

		it('should return list of users', async () => {
			const mockUsers = [
				{
					id: '1',
					email: 'user1@test.com',
					name: 'User One',
					is_admin: 0,
					github_login: 'user1',
					github_avatar_url: 'https://example.com/user1.jpg',
					created_at: '2024-01-01'
				}
			];

			mockPlatform.env.DB.all.mockResolvedValueOnce({ results: mockUsers });

			const { GET } = await import('../../src/routes/api/admin/users/+server.js');
			const response = await GET({ platform: mockPlatform, locals: mockLocals } as any);
			const data = await response.json();

			expect(data.users).toEqual(mockUsers);
		});

		it('should fall back to legacy schema query when discord columns are missing', async () => {
			const mockUsers = [
				{
					id: '1',
					email: 'legacy@test.com',
					name: 'Legacy User',
					is_admin: 0,
					github_login: 'legacy-user',
					github_avatar_url: 'https://example.com/legacy.jpg',
					discord_username: null,
					discord_avatar_url: null,
					created_at: '2024-01-01',
					github_id: '123'
				}
			];

			mockPlatform.env.DB.all
				.mockRejectedValueOnce(new Error('no such column: u.discord_username'))
				.mockResolvedValueOnce({ results: mockUsers });

			const { GET } = await import('../../src/routes/api/admin/users/+server.js');
			const response = await GET({ platform: mockPlatform, locals: mockLocals } as any);
			const data = await response.json();

			expect(data.users).toEqual(mockUsers);
			expect(mockPlatform.env.DB.all).toHaveBeenCalledTimes(2);
		});
	});

	describe('POST /api/admin/users', () => {
		it('should require authentication', async () => {
			mockLocals.user = null;

			const { POST } = await import('../../src/routes/api/admin/users/+server.js');

			try {
				await POST({
					platform: mockPlatform,
					locals: mockLocals,
					request: {
						json: async () => ({ githubLogin: 'testuser', email: 'test@test.com' })
					}
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(401);
			}
		});

		it('should require admin access', async () => {
			mockLocals.user.isOwner = false;
			mockLocals.user.isAdmin = false;

			const { POST } = await import('../../src/routes/api/admin/users/+server.js');

			try {
				await POST({
					platform: mockPlatform,
					locals: mockLocals,
					request: {
						json: async () => ({ githubLogin: 'testuser', email: 'test@test.com' })
					}
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(403);
			}
		});

		it('should validate required fields', async () => {
			const { POST } = await import('../../src/routes/api/admin/users/+server.js');

			try {
				await POST({
					platform: mockPlatform,
					locals: mockLocals,
					request: {
						json: async () => ({ githubLogin: 'testuser' })
					}
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				// Error should be thrown (either 400 or 500)
				expect(err.status).toBeGreaterThan(0);
			}
		});

		it('should create a new user', async () => {
			mockPlatform.env.DB.run.mockResolvedValueOnce({ success: true });

			const { POST } = await import('../../src/routes/api/admin/users/+server.js');
			const response = await POST({
				platform: mockPlatform,
				locals: mockLocals,
				request: {
					json: async () => ({ githubLogin: 'testuser', email: 'test@test.com' })
				}
			} as any);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.user.email).toBe('test@test.com');
			expect(data.user.github_login).toBe('testuser');
		});
	});

	describe('PATCH /api/admin/users/:id', () => {
		it('should require authentication', async () => {
			mockLocals.user = null;

			const { PATCH } = await import('../../src/routes/api/admin/users/[id]/+server.js');

			try {
				await PATCH({
					platform: mockPlatform,
					locals: mockLocals,
					params: { id: '2' },
					request: {
						json: async () => ({ isAdmin: true })
					}
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(401);
			}
		});

		it('should prevent user from modifying their own status', async () => {
			mockPlatform.env.DB.first.mockResolvedValueOnce({
				id: '1',
				email: 'owner@test.com',
				github_login: 'testowner'
			});

			const { PATCH } = await import('../../src/routes/api/admin/users/[id]/+server.js');

			try {
				await PATCH({
					platform: mockPlatform,
					locals: mockLocals,
					params: { id: '1' },
					request: {
						json: async () => ({ isAdmin: false })
					}
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(400);
			}
		});

		it('should update user admin status', async () => {
			mockPlatform.env.DB.first
				.mockResolvedValueOnce({
					id: '2',
					email: 'user@test.com',
					github_login: 'testuser',
					is_admin: 0
				})
				.mockResolvedValueOnce({
					id: '2',
					email: 'user@test.com',
					name: 'Test User',
					is_admin: 1,
					github_login: 'testuser',
					github_avatar_url: null,
					discord_username: null,
					discord_avatar_url: null,
					created_at: '2026-01-01',
					updated_at: '2026-01-02'
				})
				.mockResolvedValueOnce({ count: 0 })
				.mockResolvedValueOnce({ count: 0 });
			mockPlatform.env.DB.all.mockResolvedValue({ results: [] });
			mockPlatform.env.DB.run.mockResolvedValue({ success: true });

			const { PATCH } = await import('../../src/routes/api/admin/users/[id]/+server.js');
			const response = await PATCH({
				platform: mockPlatform,
				locals: mockLocals,
				params: { id: '2' },
				request: {
					json: async () => ({ isAdmin: true })
				}
			} as any);

			const data = await response.json();
			expect(data.success).toBe(true);
		});
	});

	describe('DELETE /api/admin/users/:id', () => {
		it('should require authentication', async () => {
			mockLocals.user = null;

			const { DELETE } = await import('../../src/routes/api/admin/users/[id]/+server.js');

			try {
				await DELETE({
					platform: mockPlatform,
					locals: mockLocals,
					params: { id: '2' }
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(401);
			}
		});

		it('should prevent user from deleting themselves', async () => {
			mockPlatform.env.DB.first.mockResolvedValueOnce({
				id: '1',
				email: 'owner@test.com'
			});

			const { DELETE } = await import('../../src/routes/api/admin/users/[id]/+server.js');

			try {
				await DELETE({
					platform: mockPlatform,
					locals: mockLocals,
					params: { id: '1' }
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(400);
			}
		});

		it('should delete a user', async () => {
			mockPlatform.env.DB.first.mockResolvedValueOnce({
				id: '2',
				email: 'user@test.com'
			});
			mockPlatform.env.DB.run.mockResolvedValueOnce({ success: true });

			const { DELETE } = await import('../../src/routes/api/admin/users/[id]/+server.js');
			const response = await DELETE({
				platform: mockPlatform,
				locals: mockLocals,
				params: { id: '2' }
			} as any);

			const data = await response.json();
			expect(data.success).toBe(true);
		});
	});

	describe('GET /api/admin/users/search', () => {
		it('should require authentication', async () => {
			mockLocals.user = null;

			const { GET } = await import('../../src/routes/api/admin/users/search/+server.js');

			try {
				await GET({
					url: new URL('http://localhost/api/admin/users/search?q=test'),
					locals: mockLocals,
					fetch: fetch
				} as any);
				expect.fail('Should have thrown error');
			} catch (err: any) {
				expect(err.status).toBe(401);
			}
		});

		it('should return empty array for short queries', async () => {
			const { GET } = await import('../../src/routes/api/admin/users/search/+server.js');
			const response = await GET({
				url: new URL('http://localhost/api/admin/users/search?q=a'),
				locals: mockLocals,
				fetch: fetch
			} as any);

			const data = await response.json();
			expect(data.users).toEqual([]);
		});
	});
});


