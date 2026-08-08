/**
 * Per-isolate TTL cache for the command palette's CMS items.
 *
 * The root layout loads these on every SSR page view, so the uncached query
 * would run once per request. This bounds it to one query per isolate per TTL
 * window — the same treatment the blog-only query used to get, kept when that
 * query was generalised across content types.
 */
import { getCommandPaletteContentItems } from '$lib/services/cms';
import type { CommandPaletteContentItem } from '$lib/services/cms';
import type { D1Database } from '@cloudflare/workers-types';

export const PALETTE_CACHE_TTL_MS = 60_000;

let cache: { data: CommandPaletteContentItem[]; expires: number } | null = null;

export async function getCachedCommandPaletteItems(
	db: D1Database | undefined,
	now: () => number = Date.now
): Promise<CommandPaletteContentItem[]> {
	if (cache && cache.expires > now()) {
		return cache.data;
	}

	if (!db) {
		// Don't cache misses caused by a missing DB binding.
		return [];
	}

	let data: CommandPaletteContentItem[];
	try {
		data = await getCommandPaletteContentItems(db);
	} catch (err) {
		// The palette is a convenience — a failed query must not break the page.
		console.error('Failed to load command palette items:', err);
		return [];
	}

	cache = { data, expires: now() + PALETTE_CACHE_TTL_MS };
	return data;
}

/** Test hook */
export function clearCommandPaletteCache(): void {
	cache = null;
}
