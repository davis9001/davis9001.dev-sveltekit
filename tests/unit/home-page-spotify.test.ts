import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for Home Page Server Load — Spotify SSR integration.
 * Verifies that cached Spotify data is loaded server-side for instant rendering.
 */

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
    put: vi.fn(async () => { }),
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

  it('should return spotifyData when KV has fresh cached data', async () => {
    const cachedEntry = {
      data: sampleSpotifyData,
      cachedAt: Date.now() - 60_000 // 1 minute ago
    };
    const kv = createMockKV({ 'spotify:full-response': cachedEntry });
    const platform = { env: { KV: kv, DB: {} }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toEqual(sampleSpotifyData);
    expect(result.recentPosts).toBeDefined();
  });

  it('should return null spotifyData when KV cache is stale', async () => {
    const cachedEntry = {
      data: sampleSpotifyData,
      cachedAt: Date.now() - 6 * 60 * 1000 // 6 minutes ago
    };
    const kv = createMockKV({ 'spotify:full-response': cachedEntry });
    const platform = { env: { KV: kv }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
  });

  it('should return null spotifyData when KV has no cached data', async () => {
    const kv = createMockKV();
    const platform = { env: { KV: kv }, context: {}, caches: {} };

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

  it('should return null spotifyData when KV is not available on platform', async () => {
    const platform = { env: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
  });

  it('should still return recentPosts even when Spotify cache fails', async () => {
    const kv = {
      get: vi.fn().mockRejectedValue(new Error('KV error')),
      put: vi.fn(),
      delete: vi.fn()
    };
    const platform = { env: { KV: kv }, context: {}, caches: {} };

    const { load } = await import('../../src/routes/+page.server');
    const result = await load({ platform } as any);

    expect(result.spotifyData).toBeNull();
    expect(result.recentPosts).toBeDefined();
  });
});
