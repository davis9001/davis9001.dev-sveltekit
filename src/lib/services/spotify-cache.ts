import type { D1Database } from '@cloudflare/workers-types';

/**
 * Spotify Response Cache Service
 *
 * Provides a global 5-minute D1-backed cache for the full Spotify API response.
 * When any user triggers a Spotify fetch, the result is cached so all subsequent
 * visitors see the same data until it expires — no user can trigger another
 * Spotify API call until the cache is 5 minutes old.
 *
 * Uses Cloudflare D1 (SQLite) for persistence, which is more reliable than KV
 * for cache data that should be consistently shared across all workers/users.
 */

export const SPOTIFY_CACHE_KEY = 'spotify:full-response';
export const SPOTIFY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheRow {
  key: string;
  data: string;
  cached_at: number;
}

/**
 * Retrieve cached Spotify response from D1 if it's still fresh (< 5 minutes old).
 * Returns null if no cache exists, cache is stale, or D1 read fails.
 */
export async function getSpotifyCache(db: D1Database): Promise<unknown | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at FROM spotify_cache WHERE key = ?')
      .bind(SPOTIFY_CACHE_KEY)
      .first<CacheRow>();

    if (!row || !row.data || !row.cached_at) {
      return null;
    }

    const age = Date.now() - row.cached_at;
    if (age < SPOTIFY_CACHE_TTL_MS) {
      return JSON.parse(row.data);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve cached Spotify response from D1 regardless of age.
 * Returns whatever is in the cache even if stale — used for SSR to show
 * data instantly while the client refreshes in the background.
 * Returns null only if no cache exists or D1 read fails.
 */
export async function getSpotifyCacheStale(db: D1Database): Promise<unknown | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at FROM spotify_cache WHERE key = ?')
      .bind(SPOTIFY_CACHE_KEY)
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
 * Store Spotify response in D1 with a timestamp.
 * Silently ignores write failures. Does not cache error responses.
 */
export async function setSpotifyCache(db: D1Database, data: Record<string, unknown>): Promise<void> {
  // Don't cache error responses
  if (data.error) {
    return;
  }

  try {
    await db
      .prepare('REPLACE INTO spotify_cache (key, data, cached_at) VALUES (?, ?, ?)')
      .bind(SPOTIFY_CACHE_KEY, JSON.stringify(data), Date.now())
      .run();
  } catch {
    // Cache write failure is non-critical
  }
}
