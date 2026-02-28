import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
  error: (status: number, message: string) => {
    const err = new Error(message);
    (err as any).status = status;
    throw err;
  },
  redirect: (status: number, location: string) => {
    const err = new Error(`Redirect to ${location}`);
    (err as any).status = status;
    (err as any).location = location;
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
    store[k] = typeof v === 'string' ? v : JSON.stringify(v);
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

describe('Admin Spotify Status API', () => {
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
    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
    const event = createMockEvent({ user: undefined });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should throw 403 when user is not owner or admin', async () => {
    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'user', email: 'user@test.com', isOwner: false, isAdmin: false }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should return not configured when no tokens exist', async () => {
    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true }
    });

    const response = await GET(event);
    const data = await response.json();
    expect(data.hasTokens).toBe(false);
    expect(data.hasClientCredentials).toBe(true);
  });

  it('should return token status when tokens exist', async () => {
    const tokens = {
      accessToken: 'test_access',
      refreshToken: 'test_refresh',
      expiresAt: Date.now() + 3600000
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
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
    expect(data.hasTokens).toBe(true);
    expect(data.expiresInMinutes).toBeGreaterThan(0);
  });

  it('should report missing client credentials', async () => {
    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: createMockKV(),
          SPOTIFY_CLIENT_ID: undefined,
          SPOTIFY_CLIENT_SECRET: undefined
        }
      }
    });

    const response = await GET(event);
    const data = await response.json();
    expect(data.hasClientCredentials).toBe(false);
  });

  it('should handle KV errors gracefully', async () => {
    const mockKV = {
      get: vi.fn().mockRejectedValue(new Error('KV error')),
      put: vi.fn(),
      delete: vi.fn()
    };

    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
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
    expect(data.hasTokens).toBe(false);
  });

  it('should allow admin users', async () => {
    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
    const event = createMockEvent({
      user: { id: '2', login: 'admin', email: 'admin@test.com', isOwner: false, isAdmin: true }
    });

    const response = await GET(event);
    const data = await response.json();
    expect(data).toBeDefined();
  });

  it('should report expired tokens', async () => {
    const tokens = {
      accessToken: 'expired_access',
      refreshToken: 'test_refresh',
      expiresAt: Date.now() - 60000 // expired 1 minute ago
    };
    const mockKV = createMockKV({ 'spotify:tokens': tokens });

    const { GET } = await import('../../src/routes/api/admin/spotify-status/+server');
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
    expect(data.hasTokens).toBe(true);
    expect(data.expiresInMinutes).toBeLessThanOrEqual(0);
  });
});
