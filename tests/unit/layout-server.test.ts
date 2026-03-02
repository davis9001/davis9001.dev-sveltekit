import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for Layout Server Load
 * TDD: Tests for root layout data loading
 */

// Helper to create a mock platform with optional env overrides
function mockPlatform(envOverrides: Record<string, unknown> = {}): App.Platform {
	return { env: { KV: { get: async () => null }, ...envOverrides } } as unknown as App.Platform;
}

describe('Layout Server Load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	describe('load function', () => {
		it('should return user from locals and check AI providers', async () => {
			const mockUser = {
				id: 'user-123',
				login: 'testuser',
				isAdmin: false
			};

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: true })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: { user: mockUser },
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { user: typeof mockUser | null; hasAIProviders: boolean; hasAuthConfig: boolean; };

			expect(result.user).toEqual(mockUser);
			expect(result.hasAIProviders).toBe(true);
			expect(result.hasAuthConfig).toBe(false);
			expect(mockFetch).toHaveBeenCalledWith('/api/admin/ai-keys/status');
		});

		it('should return null user when not authenticated', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: false })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { user: null; hasAIProviders: boolean; hasAuthConfig: boolean; };

			expect(result.user).toBeNull();
			expect(result.hasAIProviders).toBe(false);
			expect(result.hasAuthConfig).toBe(false);
		});

		it('should handle AI provider check failure gracefully', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: { user: { id: 'user-123' } },
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { hasAIProviders: boolean; };

			expect(result.hasAIProviders).toBe(false);
		});

		it('should handle fetch error gracefully', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: { user: { id: 'user-123' } },
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { hasAIProviders: boolean; };

			expect(result.hasAIProviders).toBe(false);
		});

		it('should return hasAuthConfig true when GitHub env vars are set', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: false })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				fetch: mockFetch,
				platform: mockPlatform({
					GITHUB_CLIENT_ID: 'gid',
					GITHUB_CLIENT_SECRET: 'gsecret'
				})
			} as any)) as { hasAuthConfig: boolean; };

			expect(result.hasAuthConfig).toBe(true);
		});

		it('should return hasAuthConfig true when KV has auth config', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: false })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				fetch: mockFetch,
				platform: mockPlatform({
					KV: {
						get: async (key: string) => {
							if (key === 'auth_config:github') {
								return JSON.stringify({ clientId: 'id', clientSecret: 'secret' });
							}
							return null;
						}
					}
				})
			} as any)) as { hasAuthConfig: boolean; };

			expect(result.hasAuthConfig).toBe(true);
		});

		it('should return portfolioItems array from markdown files', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: false })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { portfolioItems: Array<{ slug: string; title: string; summary: string; }>; };

			expect(Array.isArray(result.portfolioItems)).toBe(true);
			expect(result.portfolioItems.length).toBeGreaterThan(0);
			// Each item should have slug, title, and summary
			result.portfolioItems.forEach((item) => {
				expect(item).toHaveProperty('slug');
				expect(item).toHaveProperty('title');
				expect(item).toHaveProperty('summary');
				expect(typeof item.slug).toBe('string');
				expect(typeof item.title).toBe('string');
			});
		});

		it('should return blogPosts array from markdown files', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ hasProviders: false })
			});

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { blogPosts: Array<{ slug: string; title: string; summary: string; }>; };

			expect(Array.isArray(result.blogPosts)).toBe(true);
			expect(result.blogPosts.length).toBeGreaterThan(0);
			// Each post should have slug, title, and summary
			result.blogPosts.forEach((post) => {
				expect(post).toHaveProperty('slug');
				expect(post).toHaveProperty('title');
				expect(post).toHaveProperty('summary');
				expect(typeof post.slug).toBe('string');
				expect(typeof post.title).toBe('string');
			});
		});
	});
});
