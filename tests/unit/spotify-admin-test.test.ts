import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
  error: (status: number, message: string) => {
    const err = new Error(message);
    (err as any).status = status;
    throw err;
  },
  json: (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    })
}));

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

describe('Admin Spotify Test Route', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createMockEvent(overrides: {
    user?: any;
    platform?: any;
  } = {}) {
    return {
      locals: { user: overrides.user },
      platform: overrides.platform || {
        env: {
          KV: createMockKV(),
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    } as any;
  }

  it('should throw 403 when user is not authenticated', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({ user: undefined });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should throw 403 when user is not owner or admin', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'user', email: 'user@test.com', isOwner: false, isAdmin: false }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should return 400 when no tokens are stored', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true }
    });

    const response = await GET(event);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('No tokens');
  });

  it('should return 500 when access token cannot be obtained', async () => {
    const tokens = {
      accessToken: 'expired_token',
      refreshToken: 'old_refresh',
      expiresAt: Date.now() - 1000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should return success with recent track data', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              track: {
                name: 'Test Song',
                artists: [{ name: 'Test Artist' }],
                album: {
                  name: 'Test Album',
                  images: [{ url: 'https://example.com/art.jpg' }]
                }
              }
            }
          ]
        })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.recentTrack).toBeDefined();
    expect(data.recentTrack.name).toBe('Test Song');

    vi.unstubAllGlobals();
  });

  it('should include token status in response', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    const data = await response.json();
    expect(data.tokenStatus).toBeDefined();
    expect(data.tokenStatus.hasAccessToken).toBe(true);
    expect(data.tokenStatus.hasRefreshToken).toBe(true);
    expect(typeof data.tokenStatus.expiresInMinutes).toBe('number');

    vi.unstubAllGlobals();
  });

  it('should handle Spotify API errors gracefully', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should handle no recent tracks gracefully', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.recentTrack).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should allow admin users', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '2', login: 'admin', email: 'admin@test.com', isOwner: false, isAdmin: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(200);

    vi.unstubAllGlobals();
  });

  it('should handle network errors during Spotify API call', async () => {
    const tokens = {
      accessToken: 'valid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { GET } = await import('../../src/routes/admin/spotify/test/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      }
    });

    const response = await GET(event);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);

    vi.unstubAllGlobals();
  });
});
