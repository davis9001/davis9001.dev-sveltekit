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
		const first = vi
			.fn()
			.mockResolvedValueOnce({
				id: 'u1',
				email: 'user@example.com',
				name: 'User One',
				is_admin: 0
			})
			.mockResolvedValueOnce({ count: 7 })
			.mockResolvedValueOnce({ count: 4 });
		const all = vi
			.fn()
			.mockResolvedValueOnce({
				results: [{ provider: 'discord', provider_account_id: '123', created_at: '2026-01-01' }]
			})
			.mockResolvedValueOnce({
				results: [{ id: 's1', created_at: '2026-01-02', expires_at: '2026-01-09' }]
			})
			.mockResolvedValueOnce({
				results: [
					{ id: 'a1', action_type: 'login', action_label: 'Logged in with Discord', created_at: '2026-01-02' }
				]
			});

		mockDB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({ first, all })
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

	it('should return 404 when user does not exist', async () => {
		mockDB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null)
			})
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
});
