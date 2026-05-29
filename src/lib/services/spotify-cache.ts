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
export const SPOTIFY_REFRESH_LOCK_KEY = 'spotify:refresh-lock';
export const SPOTIFY_REFRESH_LOCK_TTL_MS = 45 * 1000;

interface CacheRow {
  key: string;
  data: string;
  cached_at: number;
  next_refresh_at?: number | null;
}

interface RefreshLockRow {
  key: string;
  lock_until: number;
}

export interface SpotifyCacheState {
  data: unknown;
  cachedAt: number;
  nextRefreshAt: number | null;
}

function parseCacheRow(row: CacheRow | null): SpotifyCacheState | null {
  if (!row || !row.data || !row.cached_at) {
    return null;
  }

  return {
    data: JSON.parse(row.data),
    cachedAt: row.cached_at,
    nextRefreshAt:
      typeof row.next_refresh_at === 'number' && Number.isFinite(row.next_refresh_at)
        ? row.next_refresh_at
        : null
  };
}

/**
 * Retrieve cached Spotify response from D1 if it's still fresh (< 5 minutes old).
 * Returns null if no cache exists, cache is stale, or D1 read fails.
 */
export async function getSpotifyCache(db: D1Database): Promise<unknown | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at, next_refresh_at FROM spotify_cache WHERE key = ?')
      .bind(SPOTIFY_CACHE_KEY)
      .first<CacheRow>();

    const cacheState = parseCacheRow(row);
    if (!cacheState) {
      return null;
    }

    const age = Date.now() - cacheState.cachedAt;
    if (age < SPOTIFY_CACHE_TTL_MS) {
      return cacheState.data;
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
  const state = await getSpotifyCacheState(db);
  return state?.data ?? null;
}

export async function getSpotifyCacheState(db: D1Database): Promise<SpotifyCacheState | null> {
  try {
    const row = await db
      .prepare('SELECT key, data, cached_at, next_refresh_at FROM spotify_cache WHERE key = ?')
      .bind(SPOTIFY_CACHE_KEY)
      .first<CacheRow>();

    return parseCacheRow(row);
  } catch {
    return null;
  }
}

/**
 * Store Spotify response in D1 with a timestamp.
 * Silently ignores write failures. Does not cache error responses.
 */
export async function setSpotifyCache(
  db: D1Database,
  data: Record<string, unknown>,
  options: { nextRefreshAt?: number | null; } = {}
): Promise<void> {
  // Don't cache error responses
  if (data.error) {
    return;
  }

  try {
    const nextRefreshAt =
      typeof options.nextRefreshAt === 'number' && Number.isFinite(options.nextRefreshAt)
        ? options.nextRefreshAt
        : null;

    await db
      .prepare('REPLACE INTO spotify_cache (key, data, cached_at, next_refresh_at) VALUES (?, ?, ?, ?)')
      .bind(SPOTIFY_CACHE_KEY, JSON.stringify(data), Date.now(), nextRefreshAt)
      .run();
  } catch {
    // Cache write failure is non-critical
  }
}

export async function tryAcquireSpotifyRefreshLock(
  db: D1Database,
  ownerId: string,
  lockTtlMs = SPOTIFY_REFRESH_LOCK_TTL_MS
): Promise<boolean> {
  const now = Date.now();
  const lockUntil = now + lockTtlMs;

  try {
    const result = await db
      .prepare(
        `
        INSERT INTO spotify_refresh_lock (key, lock_until, updated_at, owner)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          lock_until = excluded.lock_until,
          updated_at = excluded.updated_at,
          owner = excluded.owner
        WHERE spotify_refresh_lock.lock_until < ?
        `
      )
      .bind(SPOTIFY_REFRESH_LOCK_KEY, lockUntil, now, ownerId, now)
      .run();

    const changes = (result as { meta?: { changes?: number; }; })?.meta?.changes;
    if (typeof changes === 'number') {
      return changes > 0;
    }

    return true;
  } catch {
    // Prefer availability: if lock table is unavailable, allow refresh.
    return true;
  }
}

export async function releaseSpotifyRefreshLock(db: D1Database, ownerId: string): Promise<void> {
  try {
    const row = await db
      .prepare('SELECT key, lock_until FROM spotify_refresh_lock WHERE key = ?')
      .bind(SPOTIFY_REFRESH_LOCK_KEY)
      .first<RefreshLockRow>();

    if (!row) {
      return;
    }

    await db
      .prepare('UPDATE spotify_refresh_lock SET lock_until = ?, updated_at = ?, owner = ? WHERE key = ?')
      .bind(Date.now(), Date.now(), ownerId, SPOTIFY_REFRESH_LOCK_KEY)
      .run();
  } catch {
    // Lock release failures are non-critical because lock TTL is short.
  }
}
