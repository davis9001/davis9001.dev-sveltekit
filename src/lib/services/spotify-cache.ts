/**
 * Spotify Response Cache Service
 *
 * Provides a global 5-minute KV-backed cache for the full Spotify API response.
 * When any user triggers a Spotify fetch, the result is cached so all subsequent
 * visitors see the same data until it expires — no user can trigger another
 * Spotify API call until the cache is 5 minutes old.
 */

export const SPOTIFY_RESPONSE_CACHE_KEY = 'spotify:full-response';
export const SPOTIFY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// KV expiration TTL in seconds — set slightly longer than our logical TTL
// so KV auto-cleans stale entries but we always control freshness ourselves
const KV_EXPIRATION_TTL_SECONDS = 600; // 10 minutes

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

/**
 * Retrieve cached Spotify response from KV if it's still fresh (< 5 minutes old).
 * Returns null if no cache exists, cache is stale, or KV read fails.
 */
export async function getSpotifyCache(kv: KVNamespace): Promise<unknown | null> {
  try {
    const entry = await kv.get(SPOTIFY_RESPONSE_CACHE_KEY, 'json') as CacheEntry | null;
    if (!entry || !entry.data || !entry.cachedAt) {
      return null;
    }

    const age = Date.now() - entry.cachedAt;
    if (age < SPOTIFY_CACHE_TTL_MS) {
      return entry.data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store Spotify response in KV with a timestamp.
 * Silently ignores write failures. Does not cache error responses.
 */
export async function setSpotifyCache(kv: KVNamespace, data: Record<string, unknown>): Promise<void> {
  // Don't cache error responses
  if (data.error) {
    return;
  }

  try {
    const entry: CacheEntry = {
      data,
      cachedAt: Date.now()
    };
    await kv.put(SPOTIFY_RESPONSE_CACHE_KEY, JSON.stringify(entry), {
      expirationTtl: KV_EXPIRATION_TTL_SECONDS
    });
  } catch {
    // Cache write failure is non-critical
  }
}
