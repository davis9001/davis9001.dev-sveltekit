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

describe('Admin Spotify Callback Route', () => {
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
    url?: string;
  } = {}) {
    return {
      locals: { user: overrides.user },
      platform: overrides.platform || {
        env: {
          KV: createMockKV(),
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret',
          SPOTIFY_REDIRECT_URI: undefined
        }
      },
      url: new URL(overrides.url || 'http://localhost:4220/admin/spotify/callback')
    } as any;
  }

  it('should redirect with error when Spotify returns an error param', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback?error=access_denied'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: expect.stringContaining('/admin/spotify?error=')
    });
  });

  it('should redirect with error when no code parameter is present', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: expect.stringContaining('/admin/spotify?error=')
    });
  });

  it('should exchange code for tokens and redirect on success', async () => {
    const mockKV = createMockKV();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600
        })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      platform: {
        env: {
          KV: mockKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      },
      url: 'http://localhost:4220/admin/spotify/callback?code=auth_code_123'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: '/admin/spotify?success=1'
    });

    // Verify tokens were stored in KV
    expect(mockKV.put).toHaveBeenCalledWith(
      'spotify:tokens',
      expect.stringContaining('new_access_token')
    );

    vi.unstubAllGlobals();
  });

  it('should send correct request to Spotify token endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback?code=my_code'
    });

    // Will throw redirect on success
    await expect(GET(event)).rejects.toMatchObject({ status: 302 });

    expect(mockFetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa('test_client_id:test_client_secret')}`
      },
      body: expect.any(URLSearchParams)
    });

    // Verify the body contains the correct grant_type
    const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(callBody.get('grant_type')).toBe('authorization_code');
    expect(callBody.get('code')).toBe('my_code');

    vi.unstubAllGlobals();
  });

  it('should redirect with error when Spotify token exchange fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid code'
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback?code=bad_code'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: expect.stringContaining('/admin/spotify?error=')
    });

    vi.unstubAllGlobals();
  });

  it('should throw 500 when client credentials are missing', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      platform: {
        env: {
          KV: createMockKV(),
          SPOTIFY_CLIENT_ID: undefined,
          SPOTIFY_CLIENT_SECRET: undefined
        }
      },
      url: 'http://localhost:4220/admin/spotify/callback?code=some_code'
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
  });

  it('should throw 500 when platform is not available', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      platform: undefined,
      url: 'http://localhost:4220/admin/spotify/callback?code=some_code'
    });
    // Override platform to undefined
    event.platform = undefined;

    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
  });

  it('should redirect with error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback?code=some_code'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: expect.stringContaining('/admin/spotify?error=')
    });

    vi.unstubAllGlobals();
  });

  it('should not require admin authentication for callback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'anon_token',
          refresh_token: 'anon_refresh',
          expires_in: 3600
        })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    // No user at all — callback should still work
    const event = createMockEvent({
      user: undefined,
      url: 'http://localhost:4220/admin/spotify/callback?code=anon_code'
    });

    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: '/admin/spotify?success=1'
    });

    vi.unstubAllGlobals();
  });

  it('should use custom SPOTIFY_REDIRECT_URI when configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      platform: {
        env: {
          KV: createMockKV(),
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret',
          SPOTIFY_REDIRECT_URI: 'https://custom.example.com/admin/spotify/callback'
        }
      },
      url: 'http://localhost:4220/admin/spotify/callback?code=custom_code'
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 302 });

    const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(callBody.get('redirect_uri')).toBe('https://custom.example.com/admin/spotify/callback');

    vi.unstubAllGlobals();
  });

  it('should redirect with error when KV.put throws during token exchange', async () => {
    const brokenKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockRejectedValue(new Error('KV write failed')),
      delete: vi.fn()
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600
        })
      })
    );

    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      platform: {
        env: {
          KV: brokenKV,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret'
        }
      },
      url: 'http://localhost:4220/admin/spotify/callback?code=some_code'
    });

    // exchangeCodeForTokens catches internally, exchange fails → redirect with error
    await expect(GET(event)).rejects.toMatchObject({
      status: 302,
      location: expect.stringContaining('/admin/spotify?error=')
    });

    vi.unstubAllGlobals();
  });

  it('should include error message in redirect URL for Spotify errors', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/callback/+server');
    const event = createMockEvent({
      url: 'http://localhost:4220/admin/spotify/callback?error=access_denied'
    });

    try {
      await GET(event);
    } catch (err: any) {
      expect(err.location).toContain('access_denied');
    }
  });
});
