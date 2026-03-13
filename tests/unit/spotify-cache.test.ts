import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSpotifyCache,
  setSpotifyCache,
  SPOTIFY_RESPONSE_CACHE_KEY,
  SPOTIFY_CACHE_TTL_MS
} from '../../src/lib/services/spotify-cache';

function createMockKV(stored: Record<string, unknown> = {}) {
  const store: Record<string, string> = {};
  for (const [k, v] of Object.entries(stored)) {
    store[k] = JSON.stringify(v);
  }
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const val = store[key] ?? null;
      if (val && type === 'json') return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    delete: vi.fn(async () => { })
  };
}

const sampleSpotifyData = {
  currentlyPlaying: {
    isPlaying: true,
    track: {
      id: 't1',
      name: 'Test Song',
      artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
      album: { name: 'Album', images: [], external_urls: { spotify: '' } },
      external_urls: { spotify: '' },
      duration_ms: 180000
    },
    progress_ms: 60000,
    context: null
  },
  recentlyPlayed: [],
  topPlaylists: [],
  profileUrl: 'https://open.spotify.com/user/12810003'
};

describe('Spotify Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpotifyCache', () => {
    it('should return null when no cached data exists', async () => {
      const kv = createMockKV();
      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toBeNull();
      expect(kv.get).toHaveBeenCalledWith(SPOTIFY_RESPONSE_CACHE_KEY, 'json');
    });

    it('should return cached data when it is fresh (within 5 minutes)', async () => {
      const cachedEntry = {
        data: sampleSpotifyData,
        cachedAt: Date.now() - 60_000 // 1 minute ago
      };
      const kv = createMockKV({ [SPOTIFY_RESPONSE_CACHE_KEY]: cachedEntry });

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toEqual(sampleSpotifyData);
    });

    it('should return null when cached data is stale (older than 5 minutes)', async () => {
      const cachedEntry = {
        data: sampleSpotifyData,
        cachedAt: Date.now() - SPOTIFY_CACHE_TTL_MS - 1000 // 5 minutes + 1 second ago
      };
      const kv = createMockKV({ [SPOTIFY_RESPONSE_CACHE_KEY]: cachedEntry });

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toBeNull();
    });

    it('should return data when exactly at the 5-minute boundary', async () => {
      const cachedEntry = {
        data: sampleSpotifyData,
        cachedAt: Date.now() - SPOTIFY_CACHE_TTL_MS // exactly 5 minutes ago
      };
      const kv = createMockKV({ [SPOTIFY_RESPONSE_CACHE_KEY]: cachedEntry });

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      // At exactly the boundary, age === TTL, which is NOT less than TTL, so it should be stale
      expect(result).toBeNull();
    });

    it('should return null when KV throws an error', async () => {
      const kv = {
        get: vi.fn().mockRejectedValue(new Error('KV unavailable')),
        put: vi.fn(),
        delete: vi.fn()
      };

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toBeNull();
    });

    it('should return null when cached entry has no cachedAt timestamp', async () => {
      const cachedEntry = {
        data: sampleSpotifyData
        // missing cachedAt
      };
      const kv = createMockKV({ [SPOTIFY_RESPONSE_CACHE_KEY]: cachedEntry });

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toBeNull();
    });

    it('should return null when cached entry has no data', async () => {
      const cachedEntry = {
        cachedAt: Date.now()
        // missing data
      };
      const kv = createMockKV({ [SPOTIFY_RESPONSE_CACHE_KEY]: cachedEntry });

      const result = await getSpotifyCache(kv as unknown as KVNamespace);
      expect(result).toBeNull();
    });
  });

  describe('setSpotifyCache', () => {
    it('should store data in KV with timestamp', async () => {
      const kv = createMockKV();
      const now = Date.now();

      await setSpotifyCache(kv as unknown as KVNamespace, sampleSpotifyData);

      expect(kv.put).toHaveBeenCalledTimes(1);
      const [key, value, options] = kv.put.mock.calls[0];
      expect(key).toBe(SPOTIFY_RESPONSE_CACHE_KEY);

      const parsed = JSON.parse(value);
      expect(parsed.data).toEqual(sampleSpotifyData);
      expect(parsed.cachedAt).toBeGreaterThanOrEqual(now);
      expect(parsed.cachedAt).toBeLessThanOrEqual(Date.now());

      // Should set a KV expiration TTL slightly longer than our cache TTL
      expect(options.expirationTtl).toBe(600);
    });

    it('should not throw when KV put fails', async () => {
      const kv = {
        get: vi.fn(),
        put: vi.fn().mockRejectedValue(new Error('KV write failed')),
        delete: vi.fn()
      };

      // Should not throw
      await expect(
        setSpotifyCache(kv as unknown as KVNamespace, sampleSpotifyData)
      ).resolves.toBeUndefined();
    });

    it('should not cache data that contains an error', async () => {
      const kv = createMockKV();
      const errorData = { ...sampleSpotifyData, error: 'Something went wrong' };

      await setSpotifyCache(kv as unknown as KVNamespace, errorData);

      // Should NOT write to KV when data has an error
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  describe('cache TTL constant', () => {
    it('should be 5 minutes in milliseconds', () => {
      expect(SPOTIFY_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
  });
});
