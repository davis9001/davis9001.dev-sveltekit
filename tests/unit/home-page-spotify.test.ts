import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for Home Page Server Load — Spotify SSR integration.
 * Verifies that cached Spotify data is loaded server-side from D1 for instant rendering.
 */

function createMockDB(rows: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [key, row] of Object.entries(rows)) {
    store.set(key, row);
  }

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: unknown[]) => ({
        first: vi.fn(async () => {
          const key = args[0] as string;
          return store.get(key) ?? null;
        }),
        run: vi.fn(async () => {
          if (sql.trim().toUpperCase().startsWith('REPLACE')) {
            const key = args[0] as string;
            const data = args[1] as string;
            const cachedAt = args[2] as number;
            store.set(key, { key, data, cached_at: cachedAt });
          }
          return { success: true };
        })
      }))
    }))
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

// We need to mock processRawPosts since it depends on import.meta.glob
vi.mock('$lib/utils/blog', () => ({
  processRawPosts: vi.fn(() => []),
  formatBlogDate: vi.fn((date: string) => date)
}));

describe('Home Page Server Load - Spotify SSR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return spotifyData when D1 has fresh cached data', async () => {
    const cachedAt = Date.now() - 60_000; // 1 minute ago
    const db = createMockDB({
      'spotify:full-response': {
        key: 'spotify:full-response',
        data: JSON.stringify(sampleSpotifyData),
        cached_at: cachedAt
      }
    });
    const platform = { env: { DB: db, KV: {} }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toEqual(sampleSpotifyData);
    expect(result.recentPosts).toBeDefined();
  });

  it('should return spotifyData even when D1 cache is stale (cache-first strategy)', async () => {
    const cachedAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const db = createMockDB({
      'spotify:full-response': {
        key: 'spotify:full-response',
        data: JSON.stringify(sampleSpotifyData),
        cached_at: cachedAt
      }
    });
    const platform = { env: { DB: db }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    // Stale data should still be returned for instant rendering
    expect(result.spotifyData).toEqual(sampleSpotifyData);
  });

  it('should return null spotifyData when D1 has no cached data', async () => {
    const db = createMockDB();
    const platform = { env: { DB: db }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
  });

  it('should return null spotifyData when platform is not available', async () => {
    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform: undefined } as any);

    expect(result.spotifyData).toBeNull();
    expect(result.recentPosts).toBeDefined();
  });

  it('should return null spotifyData when DB is not available on platform', async () => {
    const platform = { env: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
  });

  it('should still return recentPosts even when Spotify cache fails', async () => {
    const db = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockRejectedValue(new Error('D1 error'))
        }))
      }))
    };
    const platform = { env: { DB: db }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
    expect(result.recentPosts).toBeDefined();
  });
});
