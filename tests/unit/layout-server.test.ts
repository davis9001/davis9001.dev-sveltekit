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

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: { user: mockUser },
				platform: mockPlatform({
					KV: {
						get: async (key: string) => {
							if (key === 'ai_keys_list') {
								return JSON.stringify(['provider-1']);
							}
							if (key === 'ai_key:provider-1') {
								return JSON.stringify({ enabled: true });
							}
							return null;
						}
					}
				})
			} as any)) as {
				user: typeof mockUser | null;
				hasAIProviders: boolean;
				hasAuthConfig: boolean;
			};

			expect(result.user).toEqual(mockUser);
			expect(result.hasAIProviders).toBe(true);
			expect(result.hasAuthConfig).toBe(false);
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
			} as any)) as { user: null; hasAIProviders: boolean; hasAuthConfig: boolean };

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
			} as any)) as { hasAIProviders: boolean };

			expect(result.hasAIProviders).toBe(false);
		});

		it('should handle fetch error gracefully', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: { user: { id: 'user-123' } },
				fetch: mockFetch,
				platform: mockPlatform()
			} as any)) as { hasAIProviders: boolean };

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
			} as any)) as { hasAuthConfig: boolean };

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
			} as any)) as { hasAuthConfig: boolean };

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
			} as any)) as { portfolioItems: Array<{ slug: string; title: string; summary: string }> };

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

		it('should return cmsPaletteItems from the CMS (D1) with a TTL cache', async () => {
			const { clearCommandPaletteCache } = await import('../../src/lib/cms/palette-cache');
			const { clearPaletteProjectsCache } = await import('../../src/lib/projects/palette');
			clearCommandPaletteCache();
			clearPaletteProjectsCache();

			// The palette query spans content types, so rows carry the type as
			// well as the item.
			const all = vi.fn().mockResolvedValue({
				results: [
					{
						content_type_slug: 'blog',
						content_type_name: 'Blog',
						route_prefix: null,
						item_id: 'ci-1',
						item_slug: 'a-post',
						item_title: 'A Post',
						item_description: 'Summary'
					}
				]
			});
			const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnThis(), all }) };

			const { load } = await import('../../src/routes/+layout.server');
			const event = {
				locals: {},
				platform: mockPlatform({ DB: db })
			} as any;

			const result = (await load(event)) as {
				cmsPaletteItems: Array<{ id: string; label: string; href: string }>;
			};

			expect(result.cmsPaletteItems).toEqual([
				{
					id: 'cms-ci-1',
					label: 'A Post',
					description: 'Blog: Summary',
					href: '/blog/a-post',
					contentTypeName: 'Blog'
				}
			]);

			// Second load within the TTL hits both caches — no extra queries
			// (the shared mock serves one palette + one palette-projects query)
			await load(event);
			expect(all).toHaveBeenCalledTimes(2);
		});

		it('should return openProjects for the command palette seed', async () => {
			const { clearBlogPostCache } = await import('../../src/lib/cms/blog-queries');
			const { clearPaletteProjectsCache } = await import('../../src/lib/projects/palette');
			clearBlogPostCache();
			clearPaletteProjectsCache();

			const blogAll = vi.fn().mockResolvedValue({ results: [] });
			const projectsAll = vi.fn().mockResolvedValue({
				results: [
					{
						id: 'p1',
						group_name: '*Space',
						name: 'NebulaKit',
						status: 'active',
						priority: 'high',
						description: '',
						primary_link: 'https://nebulakit.example',
						github_url: null,
						extra_links: '[]',
						tasks: '[]',
						blockers: '',
						sort_order: 0,
						created_at: '2026-01-01',
						updated_at: '2026-01-02'
					}
				]
			});
			const db = {
				prepare: vi.fn((sql: string) => ({
					bind: vi.fn().mockReturnThis(),
					all: sql.includes('open_projects') ? projectsAll : blogAll
				}))
			};

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				platform: mockPlatform({ DB: db })
			} as any)) as { openProjects: unknown[] };

			expect(result.openProjects).toEqual([
				{
					name: 'NebulaKit',
					group: '*Space',
					status: 'active',
					primaryLink: 'https://nebulakit.example'
				}
			]);
		});

		it('should return empty cmsPaletteItems without a database', async () => {
			const { clearBlogPostCache } = await import('../../src/lib/cms/blog-queries');
			clearBlogPostCache();

			const { load } = await import('../../src/routes/+layout.server');
			const result = (await load({
				locals: {},
				platform: mockPlatform()
			} as any)) as { cmsPaletteItems: unknown[] };

			expect(result.cmsPaletteItems).toEqual([]);
		});
	});
});
