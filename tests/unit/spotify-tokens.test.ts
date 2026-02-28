import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStoredTokens,
  getValidAccessToken,
  refreshAccessToken,
  storeTokens
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

describe('spotify-tokens', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('getStoredTokens', () => {
    it('should return null when no tokens exist', async () => {
      const kv = createMockKV();
      const result = await getStoredTokens(kv as unknown as KVNamespace);
      expect(result).toBeNull();
      expect(kv.get).toHaveBeenCalledWith('spotify:tokens', 'json');
    });

    it('should return stored tokens', async () => {
      const tokens = {
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000
      };
      const kv = createMockKV({ 'spotify:tokens': tokens });
      const result = await getStoredTokens(kv as unknown as KVNamespace);
      expect(result).toEqual(tokens);
    });
  });

  describe('storeTokens', () => {
    it('should store tokens in KV', async () => {
      const kv = createMockKV();
      const tokens = {
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000
      };
      await storeTokens(kv as unknown as KVNamespace, tokens);
      expect(kv.put).toHaveBeenCalledWith('spotify:tokens', JSON.stringify(tokens));
    });
  });

  describe('refreshAccessToken', () => {
    it('should return refreshed tokens on success', async () => {
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

      const result = await refreshAccessToken('old_refresh', 'client_id', 'client_secret');
      expect(result).toEqual({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        expiresIn: 3600
      });
      vi.unstubAllGlobals();
    });

    it('should keep original refresh token when not returned', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'new_access',
            expires_in: 3600
          })
        })
      );

      const result = await refreshAccessToken('keep_this', 'client_id', 'client_secret');
      expect(result?.refreshToken).toBe('keep_this');
      vi.unstubAllGlobals();
    });

    it('should return null when API returns non-ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401 })
      );

      const result = await refreshAccessToken('refresh', 'client_id', 'client_secret');
      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });

    it('should return null when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await refreshAccessToken('refresh', 'client_id', 'client_secret');
      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });

    it('should send correct request to Spotify token endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token',
          expires_in: 3600
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      await refreshAccessToken('my_refresh', 'my_client', 'my_secret');

      expect(mockFetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa('my_client:my_secret')}`
        },
        body: expect.any(URLSearchParams)
      });
      vi.unstubAllGlobals();
    });
  });

  describe('getValidAccessToken', () => {
    it('should return null when client credentials missing', async () => {
      const kv = createMockKV();
      const result = await getValidAccessToken(kv as unknown as KVNamespace, {});
      expect(result).toBeNull();
    });

    it('should return null when only client ID is present', async () => {
      const kv = createMockKV();
      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id'
      });
      expect(result).toBeNull();
    });

    it('should return cached token when not expired', async () => {
      const tokens = {
        accessToken: 'cached_access',
        refreshToken: 'cached_refresh',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      };
      const kv = createMockKV({ 'spotify:tokens': tokens });

      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret'
      });
      expect(result).toBe('cached_access');
    });

    it('should refresh expired cached token', async () => {
      const tokens = {
        accessToken: 'old_access',
        refreshToken: 'old_refresh',
        expiresAt: Date.now() - 1000 // expired
      };
      const kv = createMockKV({ 'spotify:tokens': tokens });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'refreshed_access',
            refresh_token: 'refreshed_refresh',
            expires_in: 3600
          })
        })
      );

      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret'
      });
      expect(result).toBe('refreshed_access');
      expect(kv.put).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('should use env refresh token when no cached tokens', async () => {
      const kv = createMockKV();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'env_access',
            refresh_token: 'env_refresh',
            expires_in: 3600
          })
        })
      );

      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret',
        SPOTIFY_REFRESH_TOKEN: 'env_token'
      });
      expect(result).toBe('env_access');
      vi.unstubAllGlobals();
    });

    it('should return null when refresh fails and no env token', async () => {
      const tokens = {
        accessToken: 'old',
        refreshToken: 'old_refresh',
        expiresAt: Date.now() - 1000
      };
      const kv = createMockKV({ 'spotify:tokens': tokens });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401 })
      );

      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret'
      });
      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });

    it('should refresh token within 5 minute buffer', async () => {
      const tokens = {
        accessToken: 'about_to_expire',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes from now (within 5 min buffer)
      };
      const kv = createMockKV({ 'spotify:tokens': tokens });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'new_access',
            expires_in: 3600
          })
        })
      );

      const result = await getValidAccessToken(kv as unknown as KVNamespace, {
        SPOTIFY_CLIENT_ID: 'id',
        SPOTIFY_CLIENT_SECRET: 'secret'
      });
      expect(result).toBe('new_access');
      vi.unstubAllGlobals();
    });
  });
});
