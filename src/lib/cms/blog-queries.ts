/**
 * Blog queries — D1 access for blog discovery surfaces (homepage recents,
 * command palette, sitemap). The blog lives in the CMS content tables;
 * these helpers keep the query and row mapping in one place.
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface BlogPostSummary {
	slug: string;
	title: string;
	summary: string;
	publishedAt: string;
}

interface BlogRow {
	slug: string;
	title: string;
	summary: string | null;
	published_at: string | null;
}

export function mapBlogRow(row: BlogRow): BlogPostSummary {
	return {
		slug: row.slug,
		title: row.title,
		summary: row.summary ?? '',
		publishedAt: row.published_at ?? ''
	};
}

/** Published blog posts, newest first. Returns [] when the DB is missing. */
export async function listPublishedBlogPosts(
	db: D1Database | undefined,
	limit = 50
): Promise<BlogPostSummary[]> {
	if (!db) {
		return [];
	}
	try {
		const result = await db
			.prepare(
				`SELECT ci.slug, ci.title, json_extract(ci.fields, '$.excerpt') AS summary, ci.published_at
				FROM content_items ci
				JOIN content_types ct ON ct.id = ci.content_type_id
				WHERE ct.slug = 'blog' AND ci.status = 'published'
				ORDER BY ci.published_at DESC
				LIMIT ?`
			)
			.bind(limit)
			.all<BlogRow>();
		return (result.results || []).map(mapBlogRow);
	} catch (err) {
		console.error('Failed to load blog posts:', err);
		return [];
	}
}

// ── Layout cache ──────────────────────────────────────────────────────────
// The root layout loads blog posts on every SSR page view (for the command
// palette). A module-level cache bounds that to one query per isolate per
// TTL window.

export const BLOG_CACHE_TTL_MS = 60_000;

let cache: { data: BlogPostSummary[]; expires: number } | null = null;

/** Cached wrapper around listPublishedBlogPosts for hot paths */
export async function getCachedBlogPosts(
	db: D1Database | undefined,
	now: () => number = Date.now
): Promise<BlogPostSummary[]> {
	if (cache && cache.expires > now()) {
		return cache.data;
	}
	const data = await listPublishedBlogPosts(db);
	// Don't cache misses caused by a missing DB binding
	if (db) {
		cache = { data, expires: now() + BLOG_CACHE_TTL_MS };
	}
	return data;
}

/** Test hook */
export function clearBlogPostCache(): void {
	cache = null;
}
