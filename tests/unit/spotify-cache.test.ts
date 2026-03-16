import type { D1Database } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSpotifyCache,
  getSpotifyCacheStale,
  setSpotifyCache,
  SPOTIFY_CACHE_TTL_MS
} from '../../src/lib/services/spotify-cache';

/**
 * Creates a mock D1Database that stores rows in a simple in-memory map.
 * Supports the subset of D1 API used by the spotify-cache service:
 *   db.prepare(sql).bind(...).first()
 *   db.prepare(sql).bind(...).run()
 */
function createMockDB(rows: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [key, row] of Object.entries(rows)) {
    store.set(key, row);
  }

  const db = {
    prepare: vi.fn((sql: string) => {
      return {
        bind: vi.fn((...args: unknown[]) => {
          return {
            first: vi.fn(async () => {
              const key = args[0] as string;
              return store.get(key) ?? null;
            }),
            run: vi.fn(async () => {
              if (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('REPLACE')) {
                const key = args[0] as string;
                const data = args[1] as string;
                const cachedAt = args[2] as number;
                store.set(key, { key, data, cached_at: cachedAt });
              }
              return { success: true };
            })
          };
        })
      };
    })
  };

  return db;
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

describe('Spotify Cache Service (D1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpotifyCache', () => {
    it('should return null when no cached data exists', async () => {
      const db = createMockDB();
      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return cached data when it is fresh (within 5 minutes)', async () => {
      const cachedAt = Date.now() - 60_000; // 1 minute ago
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toEqual(sampleSpotifyData);
    });

    it('should return null when cached data is stale (older than 5 minutes)', async () => {
      const cachedAt = Date.now() - SPOTIFY_CACHE_TTL_MS - 1000;
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when exactly at the 5-minute boundary', async () => {
      const cachedAt = Date.now() - SPOTIFY_CACHE_TTL_MS;
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCache(db as unknown as D1Database);
      // At exactly the boundary, age === TTL, which is NOT less than TTL
      expect(result).toBeNull();
    });

    it('should return null when D1 throws an error', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error('D1 unavailable'))
          }))
        }))
      };

      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no data column', async () => {
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          cached_at: Date.now()
          // missing data
        }
      });

      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no cached_at column', async () => {
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData)
          // missing cached_at
        }
      });

      const result = await getSpotifyCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });
  });

  describe('setSpotifyCache', () => {
    it('should store data in D1 with timestamp', async () => {
      const db = createMockDB();
      const now = Date.now();

      await setSpotifyCache(db as unknown as D1Database, sampleSpotifyData);

      expect(db.prepare).toHaveBeenCalledTimes(1);
      const sql = db.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('REPLACE');
      expect(sql).toContain('spotify_cache');

      const bindCall = db.prepare.mock.results[0].value.bind;
      expect(bindCall).toHaveBeenCalledWith(
        'spotify:full-response',
        JSON.stringify(sampleSpotifyData),
        expect.any(Number)
      );

      // Verify the timestamp is reasonable
      const calledTimestamp = bindCall.mock.calls[0][2] as number;
      expect(calledTimestamp).toBeGreaterThanOrEqual(now);
      expect(calledTimestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should not throw when D1 write fails', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn().mockRejectedValue(new Error('D1 write failed'))
          }))
        }))
      };

      await expect(
        setSpotifyCache(db as unknown as D1Database, sampleSpotifyData)
      ).resolves.toBeUndefined();
    });

    it('should not cache data that contains an error', async () => {
      const db = createMockDB();
      const errorData = { ...sampleSpotifyData, error: 'Something went wrong' };

      await setSpotifyCache(db as unknown as D1Database, errorData);

      // Should NOT write to D1 when data has an error
      expect(db.prepare).not.toHaveBeenCalled();
    });
  });

  describe('cache TTL constant', () => {
    it('should be 5 minutes in milliseconds', () => {
      expect(SPOTIFY_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('getSpotifyCacheStale', () => {
    it('should return null when no cached data exists', async () => {
      const db = createMockDB();
      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return cached data when it is fresh', async () => {
      const cachedAt = Date.now() - 60_000; // 1 minute ago
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleSpotifyData);
    });

    it('should return cached data even when stale (older than 5 minutes)', async () => {
      const cachedAt = Date.now() - SPOTIFY_CACHE_TTL_MS - 60_000; // 6 minutes ago
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleSpotifyData);
    });

    it('should return cached data even when very old (hours old)', async () => {
      const cachedAt = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          data: JSON.stringify(sampleSpotifyData),
          cached_at: cachedAt
        }
      });

      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleSpotifyData);
    });

    it('should return null when D1 throws an error', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error('D1 unavailable'))
          }))
        }))
      };

      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no data column', async () => {
      const db = createMockDB({
        'spotify:full-response': {
          key: 'spotify:full-response',
          cached_at: Date.now()
          // missing data
        }
      });

      const result = await getSpotifyCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });
  });
});
