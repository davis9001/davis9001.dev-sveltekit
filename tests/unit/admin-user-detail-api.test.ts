import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Admin User Detail API', () => {
	let mockPlatform: any;
	let mockLocals: any;
	let mockDB: any;

	beforeEach(() => {
		mockDB = {
			prepare: vi.fn()
		};

		mockPlatform = {
			env: {
				DB: mockDB
			}
		};

		mockLocals = {
			user: {
				id: 'admin-1',
				isOwner: true,
				isAdmin: true
			}
		};
	});

	it('should return user detail with sessions and activity', async () => {
		mockDB.prepare.mockImplementation((sql: string) => {
			if (sql.includes('FROM users') && sql.includes('discord_username') && !sql.includes('NULL as discord_username')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockResolvedValue({
							id: 'u1',
							email: 'user@example.com',
							name: 'User One',
							is_admin: 0,
							github_login: 'userone',
							github_avatar_url: 'https://example.com/avatar.png',
							discord_username: 'discord-user',
							discord_avatar_url: 'https://example.com/discord.png',
							created_at: '2026-01-01',
							updated_at: '2026-01-02'
						}),
						all: vi.fn().mockResolvedValue({ results: [] })
					})
				};
			}

			if (sql.includes('FROM oauth_accounts')) {
				return {
					bind: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue({
							results: [{ provider: 'discord', provider_account_id: '123', created_at: '2026-01-01' }]
						})
					})
				};
			}

			if (sql.includes('FROM sessions') && sql.includes('expires_at')) {
				return {
					bind: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue({
							results: [{ id: 's1', created_at: '2026-01-02', expires_at: '2026-01-09' }]
						})
					})
				};
			}

			if (sql.includes('FROM user_activity_logs')) {
				return {
					bind: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue({
							results: [
								{
									id: 'a1',
									action_type: 'login',
									action_label: 'Logged in with Discord',
									created_at: '2026-01-02'
								}
							]
						})
					})
				};
			}

			if (sql.startsWith('SELECT COUNT(*) AS count FROM sessions')) {
				return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ count: 7 }) }) };
			}

			if (sql.startsWith('SELECT COUNT(*) AS count FROM chat_messages')) {
				return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ count: 4 }) }) };
			}

			return {
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
					all: vi.fn().mockResolvedValue({ results: [] }),
					run: vi.fn().mockResolvedValue({ success: true })
				})
			};
		});

		const { GET } = await import('../../src/routes/api/admin/users/[id]/+server');
		const response = await GET({
			platform: mockPlatform,
			locals: mockLocals,
			params: { id: 'u1' }
		} as any);

		const data = await response.json();
		expect(data.user.id).toBe('u1');
		expect(data.oauthAccounts).toHaveLength(1);
		expect(data.sessions).toHaveLength(1);
		expect(data.activityLogs).toHaveLength(1);
		expect(data.stats.totalSessions).toBe(7);
		expect(data.stats.totalChatMessages).toBe(4);
	});

	it('should fall back to legacy schema when discord columns are missing', async () => {
		mockDB.prepare.mockImplementation((sql: string) => {
			if (sql.includes('FROM users') && sql.includes('discord_username') && !sql.includes('NULL as discord_username')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockRejectedValue(new Error('no such column: discord_username'))
					})
				};
			}

			if (sql.includes('FROM users') && sql.includes('NULL as discord_username')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockResolvedValue({
							id: 'legacy-1',
							email: 'legacy@example.com',
							name: 'Legacy User',
							is_admin: 0,
							github_login: 'legacy-user',
							github_avatar_url: 'https://example.com/avatar.png',
							discord_username: null,
							discord_avatar_url: null,
							created_at: '2026-01-01',
							updated_at: '2026-01-02'
						}),
						all: vi.fn().mockResolvedValue({ results: [] })
					})
				};
			}

			if (sql.startsWith('SELECT COUNT(*) AS count FROM sessions')) {
				return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ count: 0 }) }) };
			}

			if (sql.startsWith('SELECT COUNT(*) AS count FROM chat_messages')) {
				return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ count: 0 }) }) };
			}

			return {
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
					all: vi.fn().mockResolvedValue({ results: [] }),
					run: vi.fn().mockResolvedValue({ success: true })
				})
			};
		});

		const { GET } = await import('../../src/routes/api/admin/users/[id]/+server');
		const response = await GET({
			platform: mockPlatform,
			locals: mockLocals,
			params: { id: 'legacy-1' }
		} as any);

		const data = await response.json();
		expect(data.user.id).toBe('legacy-1');
		expect(data.user.discord_username).toBeNull();
		expect(data.user.discord_avatar_url).toBeNull();
	});

	it('should return 404 when user does not exist', async () => {
		mockDB.prepare.mockImplementation((sql: string) => {
			if (sql.includes('FROM users')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockResolvedValue(null)
					})
				};
			}

			return {
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue({ count: 0 }),
					all: vi.fn().mockResolvedValue({ results: [] }),
					run: vi.fn().mockResolvedValue({ success: true })
				})
			};
		});

		const { GET } = await import('../../src/routes/api/admin/users/[id]/+server');

		try {
			await GET({
				platform: mockPlatform,
				locals: mockLocals,
				params: { id: 'missing' }
			} as any);
			expect.fail('Expected GET to throw');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should update user profile fields and role', async () => {
		mockDB.prepare.mockImplementation((sql: string) => {
			if (sql.startsWith('SELECT id, email, github_login, is_admin FROM users')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockResolvedValue({
							id: 'u1',
							email: 'user@example.com',
							github_login: 'old-login',
							is_admin: 0
						})
					})
				};
			}

			if (sql.startsWith('UPDATE users SET')) {
				return {
					bind: vi.fn().mockReturnValue({
						run: vi.fn().mockResolvedValue({ success: true })
					})
				};
			}

			if (sql.startsWith('INSERT INTO user_activity_logs')) {
				return {
					bind: vi.fn().mockReturnValue({
						run: vi.fn().mockResolvedValue({ success: true })
					})
				};
			}

			if (sql.includes('FROM users') && sql.includes('discord_username') && !sql.includes('NULL as discord_username')) {
				return {
					bind: vi.fn().mockReturnValue({
						first: vi.fn().mockResolvedValue({
							id: 'u1',
							email: 'updated@example.com',
							name: 'Updated User',
							is_admin: 1,
							github_login: 'new-login',
							github_avatar_url: 'https://example.com/new-avatar.png',
							discord_username: 'new-discord',
							discord_avatar_url: 'https://example.com/new-discord.png',
							created_at: '2026-01-01',
							updated_at: '2026-01-03'
						}),
						all: vi.fn().mockResolvedValue({ results: [] })
					})
				};
			}

			return {
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
					all: vi.fn().mockResolvedValue({ results: [] }),
					run: vi.fn().mockResolvedValue({ success: true })
				})
			};
		});

		const { PATCH } = await import('../../src/routes/api/admin/users/[id]/+server');
		const response = await PATCH({
			platform: mockPlatform,
			locals: mockLocals,
			params: { id: 'u1' },
			request: {
				json: async () => ({
					name: 'Updated User',
					email: 'updated@example.com',
					githubLogin: 'new-login',
					githubAvatarUrl: 'https://example.com/new-avatar.png',
					discordUsername: 'new-discord',
					discordAvatarUrl: 'https://example.com/new-discord.png',
					isAdmin: true
				})
			}
		} as any);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.user.is_admin).toBe(1);
		expect(data.user.github_login).toBe('new-login');
		expect(data.user.discord_username).toBe('new-discord');
	});
});
