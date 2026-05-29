import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Admin User Detail Page Server Load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load user detail payload from api route', async () => {
		const mockPayload = {
			user: { id: 'u1', name: 'Test User' },
			oauthAccounts: [],
			sessions: [],
			activityLogs: []
		};

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockPayload
		});

		const { load } = await import('../../src/routes/admin/users/[id]/+page.server');
		const result = (await load({
			params: { id: 'u1' },
			fetch: mockFetch
		} as any)) as any;

		expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/u1');
		expect(result.user.id).toBe('u1');
		expect(result.activityLogs).toEqual([]);
	});

	it('should throw 404 when api route returns not found', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

		const { load } = await import('../../src/routes/admin/users/[id]/+page.server');

		try {
			await load({
				params: { id: 'missing' },
				fetch: mockFetch
			} as any);
			expect.fail('Expected load to throw');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});
});
