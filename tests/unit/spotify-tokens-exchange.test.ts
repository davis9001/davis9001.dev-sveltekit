import type { KVNamespace } from '@cloudflare/workers-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exchangeCodeForTokens
} from '../../src/lib/utils/spotify-tokens';

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

describe('exchangeCodeForTokens', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should exchange authorization code for tokens and store them', async () => {
    const mockKV = createMockKV();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_in: 3600
        })
      })
    );

    const result = await exchangeCodeForTokens(
      mockKV as unknown as KVNamespace,
      'auth_code',
      'client_id',
      'client_secret',
      'http://localhost/callback'
    );

    expect(result).toBe(true);
    expect(mockKV.put).toHaveBeenCalledWith(
      'spotify:tokens',
      expect.stringContaining('new_access')
    );
    vi.unstubAllGlobals();
  });

  it('should send correct request to Spotify token endpoint', async () => {
    const mockKV = createMockKV();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await exchangeCodeForTokens(
      mockKV as unknown as KVNamespace,
      'my_code',
      'my_client',
      'my_secret',
      'http://localhost/callback'
    );

    expect(mockFetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa('my_client:my_secret')}`
      },
      body: expect.any(URLSearchParams)
    });

    const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(callBody.get('grant_type')).toBe('authorization_code');
    expect(callBody.get('code')).toBe('my_code');
    expect(callBody.get('redirect_uri')).toBe('http://localhost/callback');

    vi.unstubAllGlobals();
  });

  it('should return false when API returns non-ok', async () => {
    const mockKV = createMockKV();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      })
    );

    const result = await exchangeCodeForTokens(
      mockKV as unknown as KVNamespace,
      'bad_code',
      'client_id',
      'client_secret',
      'http://localhost/callback'
    );

    expect(result).toBe(false);
    expect(mockKV.put).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('should return false when fetch throws', async () => {
    const mockKV = createMockKV();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await exchangeCodeForTokens(
      mockKV as unknown as KVNamespace,
      'code',
      'client_id',
      'client_secret',
      'http://localhost/callback'
    );

    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  it('should store tokens with correct expiry timestamp', async () => {
    const mockKV = createMockKV();
    const now = Date.now();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 7200
        })
      })
    );

    await exchangeCodeForTokens(
      mockKV as unknown as KVNamespace,
      'code',
      'client_id',
      'client_secret',
      'http://localhost/callback'
    );

    const storedData = JSON.parse(mockKV.put.mock.calls[0][1]);
    expect(storedData.accessToken).toBe('access');
    expect(storedData.refreshToken).toBe('refresh');
    // expiresAt should be roughly now + 7200s
    expect(storedData.expiresAt).toBeGreaterThanOrEqual(now + 7200 * 1000 - 1000);
    expect(storedData.expiresAt).toBeLessThanOrEqual(now + 7200 * 1000 + 1000);
    vi.unstubAllGlobals();
  });
});
