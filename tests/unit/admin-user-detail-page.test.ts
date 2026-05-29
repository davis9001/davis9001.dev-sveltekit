import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Admin User Detail Page', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', mockFetch);
	});

	it('should render the edit form and submit profile updates', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				message: 'User updated successfully',
				user: {
					id: 'u1',
					name: 'Updated User',
					email: 'updated@example.com',
					github_login: 'updated-login',
					github_avatar_url: 'https://example.com/new-avatar.png',
					discord_username: 'updated-discord',
					discord_avatar_url: 'https://example.com/new-discord.png',
					is_admin: 1,
					created_at: '2026-01-01',
					updated_at: '2026-01-02'
				}
			})
		});

		const Page = await import('../../src/routes/admin/users/[id]/+page.svelte');
		render(Page.default, {
			props: {
				data: {
					hasAIProviders: false,
					portfolioItems: [],
					blogPosts: [],
					hasAuthConfig: false,
					user: {
						id: 'u1',
						name: 'Legacy User',
						email: 'legacy@example.com',
						github_login: null,
						github_avatar_url: null,
						discord_username: null,
						discord_avatar_url: null,
						is_admin: 0,
						created_at: '2026-01-01',
						updated_at: null
					},
					oauthAccounts: [],
					sessions: [],
					activityLogs: [],
					stats: { totalSessions: 0, totalChatMessages: 0 }
				}
			}
		});

		expect(screen.getByRole('heading', { name: /edit user data/i })).toBeTruthy();
		expect(screen.getByLabelText(/full name/i)).toHaveValue('Legacy User');
		expect(screen.getByLabelText(/email/i)).toHaveValue('legacy@example.com');

		await fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/admin/users/u1',
				expect.objectContaining({
					method: 'PATCH'
				})
			);
		});

		const [, requestInit] = mockFetch.mock.calls[0];
		const body = JSON.parse((requestInit as RequestInit).body as string);
		expect(body).toMatchObject({
			name: 'Legacy User',
			email: 'legacy@example.com',
			isAdmin: false
		});

		await waitFor(() => {
			expect(screen.getByText(/user updated successfully/i)).toBeTruthy();
		});
	});
});
