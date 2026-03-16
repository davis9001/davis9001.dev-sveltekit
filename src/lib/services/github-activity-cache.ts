import type { D1Database } from '@cloudflare/workers-types';

/**
 * GitHub Activity Response Cache Service
 *
 * Provides a global 5-minute D1-backed cache for the full GitHub activity API response.
 * When any user triggers a GitHub activity fetch, the result is cached so all subsequent
 * visitors see the same data until it expires — no user can trigger another
 * GitHub API call until the cache is 5 minutes old.
 *
 * Uses Cloudflare D1 (SQLite) for persistence, which is more reliable than KV
 * for cache data that should be consistently shared across all workers/users.
 */

export const GITHUB_ACTIVITY_CACHE_KEY = 'github-activity:full-response';
export const GITHUB_ACTIVITY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheRow {
  key: string;
  data: string;
  cached_at: number;
}

/**
 * Retrieve cached GitHub activity response from D1 if it's still fresh (< 5 minutes old).
 * Returns null if no cache exists, cache is stale, or D1 read fails.
 */
export async function getGitHubActivityCache(db: D1Database): Promise<unknown | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at FROM github_activity_cache WHERE key = ?')
      .bind(GITHUB_ACTIVITY_CACHE_KEY)
      .first<CacheRow>();

    if (!row || !row.data || !row.cached_at) {
      return null;
    }

    const age = Date.now() - row.cached_at;
    if (age < GITHUB_ACTIVITY_CACHE_TTL_MS) {
      return JSON.parse(row.data);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve cached GitHub activity response from D1 regardless of age.
 * Returns whatever is in the cache even if stale — used for SSR to show
 * data instantly while the client refreshes in the background.
 * Returns null only if no cache exists or D1 read fails.
 */
export async function getGitHubActivityCacheStale(db: D1Database): Promise<unknown | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at FROM github_activity_cache WHERE key = ?')
      .bind(GITHUB_ACTIVITY_CACHE_KEY)
      .first<CacheRow>();

    if (!row || !row.data) {
      return null;
    }

    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/**
 * Store GitHub activity response in D1 with a timestamp.
 * Silently ignores write failures. Does not cache empty/error responses.
 */
export async function setGitHubActivityCache(
  db: D1Database,
  data: unknown[]
): Promise<void> {
  // Don't cache empty responses (error fallback)
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  try {
    await db
      .prepare('REPLACE INTO github_activity_cache (key, data, cached_at) VALUES (?, ?, ?)')
      .bind(GITHUB_ACTIVITY_CACHE_KEY, JSON.stringify(data), Date.now())
      .run();
  } catch {
    // Cache write failure is non-critical
  }
}
