/**
 * Tests for Admin CMS Edit Page Server Load
 *
 * Tests the +page.server.ts for /admin/cms/[type]/[id].
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Admin CMS Edit Page Server', () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let load: any;

	const mockType = {
		id: 'type-1',
		slug: 'open-projects',
		name: 'Open Projects',
		fields: [{ name: 'project_name', label: 'Project Name', type: 'text', sortOrder: 1 }],
		settings: { hasTags: false }
	};

	const mockItem = {
		id: 'item-1',
		title: 'NebulaKit',
		slug: 'nebulakit',
		status: 'published',
		fields: { project_name: 'NebulaKit', status: 'active' },
		createdAt: '2026-01-01',
		updatedAt: '2026-01-02'
	};

	beforeEach(async () => {
		vi.resetModules();
		mockFetch = vi.fn();
		const module = await import('../../src/routes/admin/cms/[type]/[id]/+page.server.js');
		load = module.load;
	});

	it('should load content type and item', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [mockType] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ item: mockItem })
			});

		const result = await load({
			fetch: mockFetch,
			params: { type: 'open-projects', id: 'item-1' }
		});

		expect(result.contentType).toEqual(mockType);
		expect(result.item).toEqual(mockItem);
		expect(result.tags).toEqual([]);
	});

	it('should throw 404 when content type not found', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ types: [] })
		});

		await expect(
			load({ fetch: mockFetch, params: { type: 'nonexistent', id: 'item-1' } })
		).rejects.toThrow();
	});

	it('should throw when types fetch fails', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false });

		await expect(
			load({ fetch: mockFetch, params: { type: 'open-projects', id: 'item-1' } })
		).rejects.toThrow();
	});

	it('should throw 404 when item not found', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [mockType] })
			})
			.mockResolvedValueOnce({ ok: false, status: 404 });

		await expect(
			load({ fetch: mockFetch, params: { type: 'open-projects', id: 'nonexistent' } })
		).rejects.toThrow();
	});

	it('should throw 500 when item fetch fails with non-404', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [mockType] })
			})
			.mockResolvedValueOnce({ ok: false, status: 500 });

		await expect(
			load({ fetch: mockFetch, params: { type: 'open-projects', id: 'item-1' } })
		).rejects.toThrow();
	});

	it('should load tags when content type supports them', async () => {
		const typeWithTags = { ...mockType, settings: { hasTags: true } };
		const mockTags = [{ id: 'tag-1', name: 'Tech' }];

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [typeWithTags] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ item: mockItem })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ tags: mockTags })
			});

		const result = await load({
			fetch: mockFetch,
			params: { type: 'open-projects', id: 'item-1' }
		});

		expect(result.tags).toEqual(mockTags);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it('should handle tag fetch failure gracefully', async () => {
		const typeWithTags = { ...mockType, settings: { hasTags: true } };

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [typeWithTags] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ item: mockItem })
			})
			.mockRejectedValueOnce(new Error('Tags fetch failed'));

		const result = await load({
			fetch: mockFetch,
			params: { type: 'open-projects', id: 'item-1' }
		});

		expect(result.tags).toEqual([]);
	});

	it('should not fetch tags when hasTags is false', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [mockType] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ item: mockItem })
			});

		await load({ fetch: mockFetch, params: { type: 'open-projects', id: 'item-1' } });

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('should fetch item from the correct URL', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ types: [mockType] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ item: mockItem })
			});

		await load({ fetch: mockFetch, params: { type: 'open-projects', id: 'item-1' } });

		expect(mockFetch).toHaveBeenCalledWith('/api/cms/open-projects/item-1');
	});
});
