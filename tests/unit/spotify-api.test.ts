import { beforeEach, describe, expect, it, vi } from 'vitest';

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

function createMockDB(rows: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [key, row] of Object.entries(rows)) {
    store.set(key, row);
  }

  return {
    __store: store,
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

function createMockPlatform(
  envOverrides: Record<string, unknown> = {},
  kvData: Record<string, unknown> = {}
) {
  return {
    env: {
      KV: createMockKV(kvData),
      DB: createMockDB(),
      SPOTIFY_CLIENT_ID: 'test_client_id',
      SPOTIFY_CLIENT_SECRET: 'test_client_secret',
      SPOTIFY_REFRESH_TOKEN: 'test_refresh_token',
      ...envOverrides
    },
    context: {
      waitUntil: vi.fn()
    }
  };
}

const PROFILE_URL = 'https://open.spotify.com/user/12810003?si=7ba6ee05f9cb4e96';

describe('Spotify API Route', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return error when platform is not available', async () => {
    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform: undefined } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Platform not available');
    expect(data.currentlyPlaying).toBeNull();
    expect(data.recentlyPlayed).toEqual([]);
    expect(data.topPlaylists).toEqual([]);
    expect(data.profileUrl).toBe(PROFILE_URL);
  });

  it('should return error when Spotify credentials are missing', async () => {
    const platform = createMockPlatform({
      SPOTIFY_CLIENT_ID: undefined,
      SPOTIFY_CLIENT_SECRET: undefined,
      SPOTIFY_REFRESH_TOKEN: undefined
    });

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.error).toContain('Unable to authenticate');
  });

  it('should return Spotify data on success', async () => {
    // Mock KV with valid cached tokens
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // Mock all Spotify API calls
    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        status: 204,
        ok: true,
        json: async () => null
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              track: {
                id: 't1',
                name: 'Test Track',
                artists: [{ name: 'Test Artist', external_urls: { spotify: '' } }],
                album: {
                  name: 'Test Album',
                  images: [],
                  external_urls: { spotify: '' }
                },
                external_urls: { spotify: '' },
                duration_ms: 200000
              },
              played_at: '2024-01-01T00:00:00Z'
            }
          ]
        })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        status: 200,
        json: async () => ({ items: [] })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const resp = fetchResponses[url];
        if (resp) return Promise.resolve(resp);
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.profileUrl).toBe(PROFILE_URL);
    expect(data.recentlyPlayed).toHaveLength(1);
    expect(data.recentlyPlayed[0].track.name).toBe('Test Track');
    expect(data.recentlyPlayed[0].playedAt).toBe('2024-01-01T00:00:00Z');
    expect(data.topPlaylists).toEqual([]);
    expect(data.error).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('should return stale D1 cache immediately and refresh it in the background', async () => {
    const staleCachedData = {
      currentlyPlaying: {
        isPlaying: true,
        track: {
          id: 'stale-track',
          name: 'Cached Song',
          artists: [{ name: 'Cached Artist', external_urls: { spotify: '' } }],
          album: { name: 'Cached Album', images: [], external_urls: { spotify: '' } },
          external_urls: { spotify: '' },
          duration_ms: 180000
        },
        progress_ms: 45000,
        context: null
      },
      recentlyPlayed: [],
      topPlaylists: [],
      profileUrl: PROFILE_URL
    };

    const db = createMockDB({
      'spotify:full-response': {
        key: 'spotify:full-response',
        data: JSON.stringify(staleCachedData),
        cached_at: Date.now() - (10 * 60 * 1000)
      }
    });

    const platform = createMockPlatform(
      {
        DB: db
      },
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const waitUntilPromises: Promise<unknown>[] = [];
    platform.context.waitUntil = vi.fn((promise: Promise<unknown>) => {
      waitUntilPromises.push(promise);
    });

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://api.spotify.com/v1/me/player/currently-playing') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              is_playing: true,
              item: {
                id: 'fresh-track',
                name: 'Fresh Song',
                artists: [{ name: 'Fresh Artist', external_urls: { spotify: '' } }],
                album: { name: 'Fresh Album', images: [], external_urls: { spotify: '' } },
                external_urls: { spotify: '' },
                duration_ms: 200000
              },
              progress_ms: 90000,
              context: null
            })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/player/recently-played?limit=10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data).toEqual(staleCachedData);
    expect(response.headers.get('x-spotify-revalidating')).toBe('1');
    expect(platform.context.waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntilPromises).toHaveLength(1);

    await Promise.all(waitUntilPromises);

    const cachedRow = db.__store.get('spotify:full-response') as { data: string; };
    expect(JSON.parse(cachedRow.data)).toMatchObject({
      currentlyPlaying: {
        track: {
          id: 'fresh-track',
          name: 'Fresh Song'
        }
      }
    });

    vi.unstubAllGlobals();
  });

  it('should keep serving stale cache when background revalidation fails', async () => {
    const staleCachedData = {
      currentlyPlaying: null,
      recentlyPlayed: [],
      topPlaylists: [],
      profileUrl: PROFILE_URL
    };

    const db = createMockDB({
      'spotify:full-response': {
        key: 'spotify:full-response',
        data: JSON.stringify(staleCachedData),
        cached_at: Date.now() - (10 * 60 * 1000)
      }
    });

    const platform = createMockPlatform(
      { DB: db },
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const waitUntilPromises: Promise<unknown>[] = [];
    platform.context.waitUntil = vi.fn((promise: Promise<unknown>) => {
      waitUntilPromises.push(promise);
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Spotify offline')));

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data).toEqual(staleCachedData);
    expect(response.headers.get('x-spotify-revalidating')).toBe('1');
    expect(waitUntilPromises).toHaveLength(1);

    await Promise.all(waitUntilPromises);

    const cachedRow = db.__store.get('spotify:full-response') as { data: string; };
    expect(JSON.parse(cachedRow.data)).toEqual(staleCachedData);

    vi.unstubAllGlobals();
  });

  it('should fetch live Spotify data when no D1 cache exists', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://api.spotify.com/v1/me/player/currently-playing') {
          return Promise.resolve({ ok: true, status: 204 });
        }

        if (url === 'https://api.spotify.com/v1/me/player/recently-played?limit=10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                {
                  track: {
                    id: 'live-track',
                    name: 'Live Track',
                    artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                    album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                    external_urls: { spotify: '' },
                    duration_ms: 120000
                  },
                  played_at: '2026-04-09T00:00:00Z'
                }
              ]
            })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.recentlyPlayed).toHaveLength(1);
    expect(data.recentlyPlayed[0].track.id).toBe('live-track');
    expect(platform.context.waitUntil).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should fetch live Spotify data without a KV binding when env refresh credentials are present', async () => {
    const platform = createMockPlatform({ KV: undefined });

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://accounts.spotify.com/api/token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'env_refresh_token_access',
              refresh_token: 'env_refresh_token_refresh',
              expires_in: 3600
            })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/player/currently-playing') {
          return Promise.resolve({ ok: true, status: 204 });
        }

        if (url === 'https://api.spotify.com/v1/me/player/recently-played?limit=10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                {
                  track: {
                    id: 'no-kv-track',
                    name: 'No KV Track',
                    artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                    album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                    external_urls: { spotify: '' },
                    duration_ms: 120000
                  },
                  played_at: '2026-04-27T00:00:00Z'
                }
              ]
            })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recentlyPlayed).toHaveLength(1);
    expect(data.recentlyPlayed[0].track.id).toBe('no-kv-track');
    expect(data.error).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('should not schedule duplicate background refreshes on rapid cached requests', async () => {
    const cachedData = {
      currentlyPlaying: null,
      recentlyPlayed: [],
      topPlaylists: [],
      profileUrl: PROFILE_URL
    };

    const db = createMockDB({
      'spotify:full-response': {
        key: 'spotify:full-response',
        data: JSON.stringify(cachedData),
        cached_at: Date.now() - (10 * 60 * 1000)
      }
    });

    const platform = createMockPlatform(
      {
        DB: db
      },
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const deferredRefresh = new Promise(() => { });
    platform.context.waitUntil = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn(() => deferredRefresh)
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response1 = await GET({ platform } as any);
    expect(await response1.json()).toEqual(cachedData);

    const response2 = await GET({ platform } as any);
    expect(await response2.json()).toEqual(cachedData);

    expect(platform.context.waitUntil).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('should return cached data even when waitUntil context is unavailable', async () => {
    const cachedData = {
      currentlyPlaying: null,
      recentlyPlayed: [],
      topPlaylists: [],
      profileUrl: PROFILE_URL
    };

    const platform = {
      env: {
        KV: createMockKV({
          'spotify:tokens': {
            accessToken: 'valid_token',
            refreshToken: 'refresh',
            expiresAt: Date.now() + 3600000
          }
        }),
        DB: createMockDB({
          'spotify:full-response': {
            key: 'spotify:full-response',
            data: JSON.stringify(cachedData),
            cached_at: Date.now() - (10 * 60 * 1000)
          }
        }),
        SPOTIFY_CLIENT_ID: 'test_client_id',
        SPOTIFY_CLIENT_SECRET: 'test_client_secret',
        SPOTIFY_REFRESH_TOKEN: 'test_refresh_token'
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    expect(await response.json()).toEqual(cachedData);

    vi.unstubAllGlobals();
  });

  it('should short-circuit Spotify fetches while local rate-limit backoff is active', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '30' })
        });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const firstResponse = await GET({ platform } as any);
    const firstData = await firstResponse.json();
    expect(firstData.error).toContain('temporarily unavailable');

    const callsAfterFirstRequest = fetchCallCount;

    const secondResponse = await GET({ platform } as any);
    const secondData = await secondResponse.json();
    expect(secondData.error).toContain('temporarily unavailable');
    expect(fetchCallCount).toBe(callsAfterFirstRequest);

    vi.unstubAllGlobals();
  });

  it('should reuse in-memory playlist cache after the full response cache expires', async () => {
    const originalNow = Date.now;
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: now + 3600000
        }
      }
    );

    let playlistListFetches = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://api.spotify.com/v1/me/player/currently-playing') {
          return Promise.resolve({ ok: true, status: 204 });
        }

        if (url === 'https://api.spotify.com/v1/me/player/recently-played?limit=10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          playlistListFetches++;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                {
                  id: 'pl-cache',
                  name: 'Reusable Playlist',
                  description: 'cached once',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl-cache' },
                  tracks: { total: 1 },
                  owner: { id: '12810003', display_name: 'User' },
                  followers: { total: 10 },
                  public: true
                }
              ]
            })
          });
        }

        if (url.includes('/playlists/pl-cache?fields=')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 'pl-cache',
              name: 'Reusable Playlist',
              description: 'cached once',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl-cache' },
              tracks: { total: 1 },
              owner: { id: '12810003' },
              followers: { total: 10 },
              public: true
            })
          });
        }

        if (url.includes('/playlists/pl-cache/tracks')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [{ track: { duration_ms: 180000 } }],
              next: null
            })
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response1 = await GET({ platform } as any);
    const data1 = await response1.json();
    expect(data1.topPlaylists).toHaveLength(1);
    expect(playlistListFetches).toBe(1);

    now += 30_000;

    const response2 = await GET({ platform } as any);
    const data2 = await response2.json();
    expect(data2.topPlaylists).toHaveLength(1);
    expect(playlistListFetches).toBe(1);

    Date.now = originalNow;
    vi.unstubAllGlobals();
  });

  it('should still return an auth error when clearing invalid KV tokens fails', async () => {
    const platform = createMockPlatform(
      {
        KV: {
          ...createMockKV({
            'spotify:tokens': {
              accessToken: 'stale_token',
              refreshToken: 'refresh',
              expiresAt: Date.now() + 3600000
            }
          }),
          delete: vi.fn().mockRejectedValue(new Error('KV delete failed'))
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401, headers: new Headers() }))
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.error).toContain('token is invalid or expired');
    expect(platform.env.KV.delete).toHaveBeenCalledWith('spotify:tokens');

    vi.unstubAllGlobals();
  });

  it('should fall back to Spotify when playlist KV cache read fails', async () => {
    const baseKV = createMockKV({
      'spotify:tokens': {
        accessToken: 'valid_token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000
      }
    });

    const platform = createMockPlatform({
      KV: {
        ...baseKV,
        get: vi.fn(async (key: string, type?: string) => {
          if (key === 'spotify:playlist-cache') {
            throw new Error('KV read failed');
          }

          return baseKV.get(key, type as any);
        })
      }
    });

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://api.spotify.com/v1/me/player/currently-playing') {
          return Promise.resolve({ ok: true, status: 204 });
        }

        if (url === 'https://api.spotify.com/v1/me/player/recently-played?limit=10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [] })
          });
        }

        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                {
                  id: 'pl-fallback',
                  name: 'Fallback Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl-fallback' },
                  tracks: { total: 1 },
                  owner: { id: '12810003', display_name: 'User' },
                  followers: { total: 3 },
                  public: true
                }
              ]
            })
          });
        }

        if (url.includes('/playlists/pl-fallback?fields=')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 'pl-fallback',
              name: 'Fallback Playlist',
              description: '',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl-fallback' },
              tracks: { total: 1 },
              owner: { id: '12810003' },
              followers: { total: 3 },
              public: true
            })
          });
        }

        if (url.includes('/playlists/pl-fallback/tracks')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [{ track: { duration_ms: 60000 } }], next: null })
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].id).toBe('pl-fallback');

    vi.unstubAllGlobals();
  });

  it('should handle currently playing track with context resolution', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          item: {
            id: 't1',
            name: 'Playing Song',
            artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
            album: { name: 'Album', images: [], external_urls: { spotify: '' } },
            external_urls: { spotify: '' },
            duration_ms: 180000
          },
          progress_ms: 60000,
          context: {
            type: 'playlist',
            href: 'https://api.spotify.com/v1/playlists/abc',
            external_urls: { spotify: 'https://open.spotify.com/playlist/abc' },
            uri: 'spotify:playlist:abc'
          }
        })
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        status: 200,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        status: 200,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/playlists/abc': {
        ok: true,
        status: 200,
        json: async () => ({
          name: 'My Playlist',
          public: true
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const resp = fetchResponses[url];
        if (resp) return Promise.resolve(resp);
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.currentlyPlaying).toBeTruthy();
    expect(data.currentlyPlaying.isPlaying).toBe(true);
    expect(data.currentlyPlaying.track.name).toBe('Playing Song');
    expect(data.currentlyPlaying.context).toEqual({
      type: 'playlist',
      name: 'My Playlist',
      url: 'https://open.spotify.com/playlist/abc'
    });

    vi.unstubAllGlobals();
  });

  it('should return correct cache-control headers', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({ items: [] })
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);

    expect(response.headers.get('cache-control')).toBe('public, max-age=30');

    vi.unstubAllGlobals();
  });

  it('should handle internal server errors gracefully', async () => {
    // Force an error that bypasses individual handler error catching
    // by making getValidAccessToken itself throw (e.g., KV throws)
    const platform = {
      env: {
        KV: {
          get: vi.fn().mockRejectedValue(new Error('KV unavailable')),
          put: vi.fn(),
          delete: vi.fn()
        },
        DB: createMockDB(),
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret',
        SPOTIFY_REFRESH_TOKEN: 'token'
      }
    };

    // Even the token refresh fetch throws
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should return error response (either auth error or 500)
    expect(data.error).toBeTruthy();

    vi.unstubAllGlobals();
  });

  it('should handle non-ok currently playing response', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: false, status: 403 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url.includes('playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should still return successfully with null currently playing
    expect(data.currentlyPlaying).toBeNull();
    expect(data.error).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('should handle non-ok recently played response', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.includes('playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.recentlyPlayed).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('should use cached playlists from KV', async () => {
    const cachedPlaylists = [
      {
        id: 'p1',
        name: 'Cached Playlist',
        description: 'desc',
        imageUrl: 'https://example.com/img.jpg',
        url: 'https://open.spotify.com/playlist/p1',
        trackCount: 10,
        followers: 50,
        totalDurationMs: 3600000
      }
    ];

    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        },
        'spotify:playlist-cache': cachedPlaylists
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        // Should NOT be called for playlists since we have cached data
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].name).toBe('Cached Playlist');

    vi.unstubAllGlobals();
  });

  it('should handle private context by not showing it', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          item: {
            id: 't1',
            name: 'Song',
            artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
            album: { name: 'Album', images: [], external_urls: { spotify: '' } },
            external_urls: { spotify: '' },
            duration_ms: 180000
          },
          progress_ms: 60000,
          context: {
            type: 'playlist',
            href: 'https://api.spotify.com/v1/playlists/private',
            external_urls: { spotify: 'https://open.spotify.com/playlist/private' },
            uri: 'spotify:playlist:private'
          }
        })
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/playlists/private': {
        ok: true,
        json: async () => ({
          name: 'Private Playlist',
          public: false
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        return Promise.resolve(fetchResponses[url] || { ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Private playlist context should not be exposed
    expect(data.currentlyPlaying.context).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should handle context resolution failure gracefully', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          item: {
            id: 't1',
            name: 'Song',
            artists: [{ name: 'A', external_urls: { spotify: '' } }],
            album: { name: 'Al', images: [], external_urls: { spotify: '' } },
            external_urls: { spotify: '' },
            duration_ms: 1000
          },
          progress_ms: 0,
          context: {
            type: 'playlist',
            href: 'https://api.spotify.com/v1/playlists/broken',
            external_urls: { spotify: '' },
            uri: ''
          }
        })
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({ items: [] })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const resp = fetchResponses[url];
        if (resp) return Promise.resolve(resp);
        // Context fetch fails
        return Promise.reject(new Error('Network error'));
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Context resolution failed but response should still succeed
    expect(data.currentlyPlaying.context).toBeNull();
    expect(data.currentlyPlaying.isPlaying).toBe(true);

    vi.unstubAllGlobals();
  });

  it('should fetch and return top playlists with duration', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 204
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'pl1',
              name: 'My Playlist',
              description: 'A great playlist',
              images: [{ url: 'https://example.com/pl1.jpg', height: 300, width: 300 }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 10 },
              owner: { id: '12810003', display_name: 'User' },
              followers: { total: 50 },
              public: true
            },
            {
              id: 'pl2',
              name: 'Other User Playlist',
              description: '',
              images: [],
              external_urls: { spotify: '' },
              tracks: { total: 5 },
              owner: { id: 'other_user', display_name: 'Other' },
              public: true
            }
          ]
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        // Playlist detail endpoint
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'My Playlist',
              description: 'A great playlist',
              images: [{ url: 'https://example.com/pl1.jpg', height: 300, width: 300 }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 10 },
              owner: { id: '12810003' },
              followers: { total: 50 },
              public: true
            })
          });
        }
        // Playlist tracks endpoint
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                { track: { duration_ms: 200000 } },
                { track: { duration_ms: 300000 } }
              ],
              next: null
            })
          });
        }
        const resp = fetchResponses[url];
        if (resp) return Promise.resolve(resp);
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should have 1 playlist (filtered out the other user's playlist)
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].name).toBe('My Playlist');
    expect(data.topPlaylists[0].followers).toBe(50);
    expect(data.topPlaylists[0].totalDurationMs).toBe(500000); // 200000 + 300000
    expect(data.topPlaylists[0].trackCount).toBe(10);

    // Verify playlist cache was written to KV
    expect(platform.env.KV.put).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should exclude private playlists owned by the user', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        status: 204,
        ok: true,
        json: async () => null
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'pub1',
              name: 'Public Playlist',
              description: 'Visible to all',
              images: [{ url: 'https://example.com/pub.jpg', height: 300, width: 300 }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pub1' },
              tracks: { total: 15 },
              owner: { id: '12810003', display_name: 'User' },
              followers: { total: 100 },
              public: true
            },
            {
              id: 'priv1',
              name: 'Private Playlist',
              description: 'Secret jams',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/priv1' },
              tracks: { total: 8 },
              owner: { id: '12810003', display_name: 'User' },
              followers: { total: 200 },
              public: false
            }
          ]
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/playlists/pub1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pub1',
              name: 'Public Playlist',
              description: 'Visible to all',
              images: [{ url: 'https://example.com/pub.jpg', height: 300, width: 300 }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pub1' },
              tracks: { total: 15 },
              owner: { id: '12810003' },
              followers: { total: 100 },
              public: true
            })
          });
        }
        if (url.includes('/playlists/pub1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [{ track: { duration_ms: 180000 } }],
              next: null
            })
          });
        }
        const resp = fetchResponses[url];
        if (resp) return Promise.resolve(resp);
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should only include the public playlist, not the private one
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].name).toBe('Public Playlist');
    // Private playlist with higher followers should be excluded
    expect(data.topPlaylists.find((p: { name: string; }) => p.name === 'Private Playlist')).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('should handle failed playlist list fetch', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url.includes('me/playlists')) {
          return Promise.resolve({ ok: false, status: 403 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.topPlaylists).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('should handle failed playlist detail fetch gracefully', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 5 },
                  owner: { id: '12810003' },
                  public: true
                }
              ]
            })
          });
        }
        // Playlist detail request returns non-ok
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        // Playlist tracks
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [], next: null })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should still return playlist with 0 followers since detail fetch failed
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].followers).toBe(0);

    vi.unstubAllGlobals();
  });

  it('should handle album context type as always public', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          item: {
            id: 't1',
            name: 'Song',
            artists: [{ name: 'A', external_urls: { spotify: '' } }],
            album: { name: 'Al', images: [], external_urls: { spotify: '' } },
            external_urls: { spotify: '' },
            duration_ms: 1000
          },
          progress_ms: 0,
          context: {
            type: 'album',
            href: 'https://api.spotify.com/v1/albums/xyz',
            external_urls: { spotify: 'https://open.spotify.com/album/xyz' },
            uri: 'spotify:album:xyz'
          }
        })
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/albums/xyz': {
        ok: true,
        json: async () => ({
          name: 'My Album',
          public: false // Even if false, album type should be shown
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        return Promise.resolve(fetchResponses[url] || { ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Album contexts should always be shown (regardless of public flag)
    expect(data.currentlyPlaying.context).toEqual({
      type: 'album',
      name: 'My Album',
      url: 'https://open.spotify.com/album/xyz'
    });

    vi.unstubAllGlobals();
  });

  it('should handle context with no name', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    const fetchResponses: Record<string, unknown> = {
      'https://api.spotify.com/v1/me/player/currently-playing': {
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          item: {
            id: 't1',
            name: 'Song',
            artists: [{ name: 'A', external_urls: { spotify: '' } }],
            album: { name: 'Al', images: [], external_urls: { spotify: '' } },
            external_urls: { spotify: '' },
            duration_ms: 1000
          },
          progress_ms: 0,
          context: {
            type: 'playlist',
            href: 'https://api.spotify.com/v1/playlists/noname',
            external_urls: { spotify: '' },
            uri: ''
          }
        })
      },
      'https://api.spotify.com/v1/me/player/recently-played?limit=10': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/me/playlists?limit=50': {
        ok: true,
        json: async () => ({ items: [] })
      },
      'https://api.spotify.com/v1/playlists/noname': {
        ok: true,
        json: async () => ({
          public: true
          // name is missing
        })
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        return Promise.resolve(fetchResponses[url] || { ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Context with no name should not be shown
    expect(data.currentlyPlaying.context).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should handle paginated track fetching for duration calculation', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Paged Playlist',
                  description: 'Has many tracks',
                  images: [{ url: 'https://example.com/img.jpg', height: 300, width: 300 }],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 150 },
                  owner: { id: '12810003' },
                  followers: { total: 100 },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Paged Playlist',
              description: 'Has many tracks',
              images: [{ url: 'https://example.com/img.jpg', height: 300, width: 300 }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 150 },
              owner: { id: '12810003' },
              followers: { total: 100 },
              public: true
            })
          });
        }
        // First page of tracks
        if (url.includes('/playlists/pl1/tracks') && !url.includes('offset=100')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                { track: { duration_ms: 100000 } },
                { track: { duration_ms: 200000 } }
              ],
              next: 'https://api.spotify.com/v1/playlists/pl1/tracks?offset=100&limit=100'
            })
          });
        }
        // Second page of tracks (pagination)
        if (url.includes('/playlists/pl1/tracks') && url.includes('offset=100')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [{ track: { duration_ms: 300000 } }],
              next: null
            })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Duration should include tracks from both pages
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].totalDurationMs).toBe(600000); // 100000 + 200000 + 300000
    expect(data.topPlaylists[0].trackCount).toBe(150);

    vi.unstubAllGlobals();
  });

  it('should handle non-ok tracks response by breaking loop', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: '' },
                  tracks: { total: 5 },
                  owner: { id: '12810003' },
                  followers: { total: 10 },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Playlist',
              description: '',
              images: [],
              external_urls: { spotify: '' },
              tracks: { total: 5 },
              owner: { id: '12810003' },
              followers: { total: 10 },
              public: true
            })
          });
        }
        // Tracks endpoint returns non-ok
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // totalDurationMs should be 0 since tracks fetch failed
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].totalDurationMs).toBe(0);

    vi.unstubAllGlobals();
  });

  it('should handle tracks with null track property', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: '' },
                  tracks: { total: 3 },
                  owner: { id: '12810003' },
                  followers: { total: 5 },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Playlist',
              description: '',
              images: [],
              external_urls: { spotify: '' },
              tracks: { total: 3 },
              owner: { id: '12810003' },
              followers: { total: 5 },
              public: true
            })
          });
        }
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                { track: { duration_ms: 100000 } },
                { track: null },
                { track: { duration_ms: 200000 } }
              ],
              next: null
            })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should handle null track gracefully (0 + 100000 + 0 + 200000)
    expect(data.topPlaylists[0].totalDurationMs).toBe(300000);

    vi.unstubAllGlobals();
  });

  it('should not fetch when currently playing returns null', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.reject(new Error('Fetch error'));
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url.includes('playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // When getCurrentlyPlaying returns null (error), no context resolution
    expect(data.currentlyPlaying).toBeNull();
    expect(data.error).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('should handle getRecentlyPlayed fetch exception (catch branch)', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('recently-played')) {
          return Promise.reject(new Error('Network error in recently-played'));
        }
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204, json: async () => null });
        }
        if (url.includes('playlists')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Recently played should return null -> empty array in response
    expect(data.recentlyPlayed).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('should handle KV.get throwing in getTopPlaylists (cache miss catch)', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // Make KV.get throw
    (platform.env.KV as any).get = vi.fn().mockRejectedValue(new Error('KV unavailable'));

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204, json: async () => null });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('playlists?limit=50')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.topPlaylists).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('should handle playlists fetch failure (response.ok false)', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204, json: async () => null });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('me/playlists?limit=50')) {
          return Promise.resolve({ ok: false, status: 403 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.topPlaylists).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('should handle playlist detail fetch failure and track fetch errors', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204, json: async () => null });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('me/playlists?limit=50')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Playlist 1',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 10 },
                  followers: { total: 100 },
                  owner: { id: '12810003' },
                  public: true
                },
                {
                  id: 'pl2',
                  name: 'Playlist 2',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl2' },
                  tracks: { total: 5 },
                  followers: { total: 50 },
                  owner: { id: '12810003' },
                  public: true
                }
              ]
            })
          });
        }
        // Playlist detail: first one fails, second one succeeds
        if (url.includes('playlists/pl1') && url.includes('fields=')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.includes('playlists/pl2') && url.includes('fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl2',
              name: 'Playlist 2',
              description: '',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl2' },
              tracks: { total: 5 },
              followers: { total: 50 },
              owner: { id: '12810003' }
            })
          });
        }
        // Track duration fetches: fail for pl1 (ok: false), throw for pl2
        if (url.includes('playlists/pl1/tracks')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.includes('playlists/pl2/tracks')) {
          return Promise.reject(new Error('Track fetch network error'));
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should still return playlists even with failures
    expect(data.topPlaylists.length).toBeGreaterThanOrEqual(1);
    vi.unstubAllGlobals();
  });

  it('should handle KV.put failure when caching playlists', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // Make KV.put throw
    (platform.env.KV as any).put = vi.fn().mockRejectedValue(new Error('KV write failed'));

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204, json: async () => null });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('me/playlists?limit=50')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Playlist',
                  description: '',
                  images: [{ url: 'http://img.com/1.png' }],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 10 },
                  followers: { total: 100 },
                  owner: { id: '12810003' },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('playlists/pl1') && url.includes('fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Playlist',
              description: '',
              images: [{ url: 'http://img.com/1.png' }],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 10 },
              followers: { total: 100 },
              owner: { id: '12810003' },
              public: true
            })
          });
        }
        if (url.includes('playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [{ track: { duration_ms: 200000 } }], next: null })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should still return data even when KV put fails
    expect(data.topPlaylists.length).toBe(1);
    expect(data.topPlaylists[0].name).toBe('Playlist');
    vi.unstubAllGlobals();
  });

  it('should handle resolveContext fetch failure and exception', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              is_playing: true,
              item: {
                id: 't1',
                name: 'Song',
                artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                external_urls: { spotify: '' },
                duration_ms: 180000
              },
              progress_ms: 0,
              context: {
                type: 'playlist',
                href: 'https://api.spotify.com/v1/playlists/xyz',
                external_urls: { spotify: 'https://open.spotify.com/playlist/xyz' },
                uri: 'spotify:playlist:xyz'
              }
            })
          });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('playlists') && url.includes('limit=50')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        // resolveContext: context fetch throws
        if (url.includes('playlists/xyz')) {
          return Promise.reject(new Error('Context resolution error'));
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Context should be null due to error
    expect(data.currentlyPlaying.context).toBeNull();
    vi.unstubAllGlobals();
  });

  it('should handle resolveContext where context is not public', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              is_playing: true,
              item: {
                id: 't1',
                name: 'Song',
                artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                external_urls: { spotify: '' },
                duration_ms: 180000
              },
              progress_ms: 0,
              context: {
                type: 'playlist',
                href: 'https://api.spotify.com/v1/playlists/private1',
                external_urls: { spotify: 'https://open.spotify.com/playlist/private1' },
                uri: 'spotify:playlist:private1'
              }
            })
          });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('playlists') && url.includes('limit=50')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        // resolveContext: context is private
        if (url.includes('playlists/private1')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: 'Private Playlist',
              public: false
            })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Private playlist context should be null
    expect(data.currentlyPlaying.context).toBeNull();
    vi.unstubAllGlobals();
  });

  it('should handle resolveContext with ok:false response', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              is_playing: true,
              item: {
                id: 't1',
                name: 'Song',
                artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                external_urls: { spotify: '' },
                duration_ms: 180000
              },
              progress_ms: 0,
              context: {
                type: 'playlist',
                href: 'https://api.spotify.com/v1/playlists/notfound',
                external_urls: { spotify: 'https://open.spotify.com/playlist/notfound' },
                uri: 'spotify:playlist:notfound'
              }
            })
          });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url.includes('playlists') && url.includes('limit=50')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        // resolveContext: 404
        if (url.includes('playlists/notfound')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET } = await import('../../src/routes/api/spotify/+server');
    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should resolve to null when context fetch returns 404
    expect(data.currentlyPlaying.context).toBeNull();
    vi.unstubAllGlobals();
  });

  it('should return cached full response on rapid polling', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        fetchCallCount++;
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        if (url.includes('playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    // First call — should hit Spotify API
    const response1 = await GET({ platform } as any);
    const data1 = await response1.json();
    expect(data1.profileUrl).toBe(PROFILE_URL);
    const callsAfterFirst = fetchCallCount;

    // Second call — should return cached response (no new Spotify API calls)
    const response2 = await GET({ platform } as any);
    const data2 = await response2.json();
    expect(data2.profileUrl).toBe(PROFILE_URL);
    expect(fetchCallCount).toBe(callsAfterFirst);

    vi.unstubAllGlobals();
  });

  it('should back off when Spotify returns 429', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '30' })
        });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    // All fetches failed due to 429, so an error should be returned
    expect(data.error).toBeTruthy();
    expect(data.currentlyPlaying).toBeNull();
    expect(data.recentlyPlayed).toEqual([]);
    expect(data.topPlaylists).toEqual([]);
    expect(data.profileUrl).toBe(PROFILE_URL);

    vi.unstubAllGlobals();
  });

  it('should cap rate limit backoff to 5 minutes even if Retry-After is larger', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // Spotify sends an absurdly long Retry-After (e.g. 18000 seconds = 5 hours)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '18000' })
        });
      })
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    await GET({ platform } as any);

    // The console.warn should show the capped value (300s), not the raw 18000s
    const warnCalls = warnSpy.mock.calls.flat().join(' ');
    expect(warnCalls).toContain('backing off for 300s');
    expect(warnCalls).toContain('Retry-After was 18000');

    warnSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should use in-memory playlist cache when KV cache misses', async () => {
    // First request: populates in-memory cache
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Memory Cached Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 5 },
                  owner: { id: '12810003' },
                  followers: { total: 10 },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Memory Cached Playlist',
              description: '',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 5 },
              owner: { id: '12810003' },
              followers: { total: 10 },
              public: true
            })
          });
        }
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [{ track: { duration_ms: 100000 } }], next: null })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();
    expect(data.topPlaylists).toHaveLength(1);
    expect(data.topPlaylists[0].name).toBe('Memory Cached Playlist');

    vi.unstubAllGlobals();
  });

  it('should expose _resetCacheForTesting function', async () => {
    const { _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    expect(typeof _resetCacheForTesting).toBe('function');
    // Should not throw
    _resetCacheForTesting();
  });

  it('should return stale playlist data on rate limit instead of empty array', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // First call: populate in-memory cache with good data
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.includes('recently-played')) {
          return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
        }
        if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'pl1',
                  name: 'Stale Playlist',
                  description: '',
                  images: [],
                  external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
                  tracks: { total: 3 },
                  owner: { id: '12810003' },
                  followers: { total: 5 },
                  public: true
                }
              ]
            })
          });
        }
        if (url.includes('/playlists/pl1?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pl1',
              name: 'Stale Playlist',
              description: '',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' },
              tracks: { total: 3 },
              owner: { id: '12810003' },
              followers: { total: 5 },
              public: true
            })
          });
        }
        if (url.includes('/playlists/pl1/tracks')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [{ track: { duration_ms: 60000 } }], next: null })
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    // First call — populate cache
    const r1 = await GET({ platform } as any);
    const d1 = await r1.json();
    expect(d1.topPlaylists).toHaveLength(1);

    vi.unstubAllGlobals();
  });

  it('should return error when all Spotify API calls fail', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    // All Spotify endpoints return 500
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500, headers: new Headers() }))
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    expect(data.error).toBeTruthy();
    expect(data.error).toContain('All Spotify API calls failed');
    expect(data.currentlyPlaying).toBeNull();
    expect(data.recentlyPlayed).toEqual([]);
    expect(data.topPlaylists).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('should clear KV tokens and return error on 401 from Spotify', async () => {
    const kvData = {
      'spotify:tokens': {
        accessToken: 'stale_token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000
      }
    };
    const platform = createMockPlatform({}, kvData);

    // All Spotify endpoints return 401
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401, headers: new Headers() }))
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should report the token error to the client
    expect(data.error).toBeTruthy();
    expect(data.error).toContain('token is invalid or expired');

    // Should have cleared the cached tokens in KV
    expect(platform.env.KV.delete).toHaveBeenCalledWith('spotify:tokens');

    vi.unstubAllGlobals();
  });

  it('should not return error when only some API calls fail', async () => {
    const platform = createMockPlatform(
      {},
      {
        'spotify:tokens': {
          accessToken: 'valid_token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        // currently-playing fails
        if (url.includes('currently-playing')) {
          return Promise.resolve({ ok: false, status: 500, headers: new Headers() });
        }
        // recently-played succeeds with data
        if (url.includes('recently-played')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              items: [
                {
                  track: {
                    id: 't1',
                    name: 'Track',
                    artists: [{ name: 'Artist', external_urls: { spotify: '' } }],
                    album: { name: 'Album', images: [], external_urls: { spotify: '' } },
                    external_urls: { spotify: '' },
                    duration_ms: 200000
                  },
                  played_at: '2024-01-01T00:00:00Z'
                }
              ]
            })
          });
        }
        // playlists returns empty
        if (url.includes('playlists')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ items: [] })
          });
        }
        return Promise.resolve({ ok: false, status: 404, headers: new Headers() });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    const response = await GET({ platform } as any);
    const data = await response.json();

    // Should NOT report an error — recently-played succeeded
    expect(data.error).toBeUndefined();
    expect(data.recentlyPlayed).toHaveLength(1);
    expect(data.currentlyPlaying).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should clear fullResponseCache on 401 so next poll refetches', async () => {
    const kvData = {
      'spotify:tokens': {
        accessToken: 'stale_token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000
      }
    };
    const platform = createMockPlatform({}, kvData);

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        callCount++;
        return Promise.resolve({ ok: false, status: 401, headers: new Headers() });
      })
    );

    const { GET, _resetCacheForTesting } = await import('../../src/routes/api/spotify/+server');
    _resetCacheForTesting();

    // First call — triggers 401 handling
    const r1 = await GET({ platform } as any);
    const d1 = await r1.json();
    expect(d1.error).toContain('token is invalid or expired');

    const callsAfterFirst = callCount;

    // Second call should NOT return cached response – it should re-fetch
    // (because fullResponseCache was cleared on 401)
    const r2 = await GET({ platform } as any);
    const d2 = await r2.json();
    expect(d2.error).toBeTruthy();
    // Verify that new fetch calls were made (not served from cache)
    expect(callCount).toBeGreaterThan(callsAfterFirst);

    vi.unstubAllGlobals();
  });
});
