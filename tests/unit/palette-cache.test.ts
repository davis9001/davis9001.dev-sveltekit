/**
 * The command palette's per-isolate TTL cache. The root layout calls this on
 * every SSR page view, so the caching behaviour — and the failure behaviour,
 * since a broken palette must not break the page — are the point.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCommandPaletteContentItems = vi.fn();

vi.mock('$lib/services/cms', () => ({
	getCommandPaletteContentItems: (...args: unknown[]) => getCommandPaletteContentItems(...args)
}));

const ITEM = {
	id: 'cms-1',
	label: 'A Post',
	description: 'Blog: Summary',
	href: '/blog/a-post',
	contentTypeName: 'Blog'
};

describe('getCachedCommandPaletteItems', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { clearCommandPaletteCache } = await import('../../src/lib/cms/palette-cache');
		clearCommandPaletteCache();
	});

	it('queries once and serves the rest from cache within the TTL', async () => {
		const { getCachedCommandPaletteItems } = await import('../../src/lib/cms/palette-cache');
		getCommandPaletteContentItems.mockResolvedValue([ITEM]);
		const db = {} as any;

		let now = 1_000;
		const clock = () => now;

		expect(await getCachedCommandPaletteItems(db, clock)).toEqual([ITEM]);
		expect(await getCachedCommandPaletteItems(db, clock)).toEqual([ITEM]);
		expect(getCommandPaletteContentItems).toHaveBeenCalledTimes(1);
	});

	it('re-queries once the TTL has passed', async () => {
		const { getCachedCommandPaletteItems, PALETTE_CACHE_TTL_MS } =
			await import('../../src/lib/cms/palette-cache');
		getCommandPaletteContentItems.mockResolvedValue([ITEM]);
		const db = {} as any;

		let now = 1_000;
		const clock = () => now;

		await getCachedCommandPaletteItems(db, clock);
		now += PALETTE_CACHE_TTL_MS + 1;
		await getCachedCommandPaletteItems(db, clock);

		expect(getCommandPaletteContentItems).toHaveBeenCalledTimes(2);
	});

	it('returns empty without a database, and does not cache that miss', async () => {
		const { getCachedCommandPaletteItems } = await import('../../src/lib/cms/palette-cache');

		expect(await getCachedCommandPaletteItems(undefined)).toEqual([]);

		// A later call with a real DB must still query rather than serve [].
		getCommandPaletteContentItems.mockResolvedValue([ITEM]);
		expect(await getCachedCommandPaletteItems({} as any)).toEqual([ITEM]);
	});

	it('returns empty rather than throwing when the query fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { getCachedCommandPaletteItems } = await import('../../src/lib/cms/palette-cache');
		getCommandPaletteContentItems.mockRejectedValue(new Error('D1 down'));

		expect(await getCachedCommandPaletteItems({} as any)).toEqual([]);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('does not cache a failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { getCachedCommandPaletteItems } = await import('../../src/lib/cms/palette-cache');

		getCommandPaletteContentItems.mockRejectedValueOnce(new Error('D1 down'));
		expect(await getCachedCommandPaletteItems({} as any)).toEqual([]);

		getCommandPaletteContentItems.mockResolvedValue([ITEM]);
		expect(await getCachedCommandPaletteItems({} as any)).toEqual([ITEM]);
		consoleSpy.mockRestore();
	});
});
