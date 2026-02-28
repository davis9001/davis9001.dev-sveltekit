/**
 * Tests for shared auth utilities
 * TDD: Tests for isProviderConfigured() and hasAnyAuthProvider()
 */
import { describe, it, expect } from 'vitest';
import { isProviderConfigured, hasAnyAuthProvider } from '../../src/lib/utils/auth';

function mockPlatform(overrides: {
  env?: Partial<{
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
    KV: { get: (key: string) => Promise<string | null>; };
  }>;
} = {}): App.Platform {
  return { env: overrides.env ?? {} } as unknown as App.Platform;
}

describe('Auth Utils', () => {
  describe('isProviderConfigured', () => {
    // --- github via env vars ---
    it('should return true when GitHub env vars are set', async () => {
      const platform = mockPlatform({
        env: { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(true);
    });

    it('should return false when only GITHUB_CLIENT_ID is set', async () => {
      const platform = mockPlatform({ env: { GITHUB_CLIENT_ID: 'id' } });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    it('should return false when only GITHUB_CLIENT_SECRET is set', async () => {
      const platform = mockPlatform({ env: { GITHUB_CLIENT_SECRET: 'secret' } });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    // --- discord via env vars ---
    it('should return true when Discord env vars are set', async () => {
      const platform = mockPlatform({
        env: { DISCORD_CLIENT_ID: 'id', DISCORD_CLIENT_SECRET: 'secret' }
      });
      expect(await isProviderConfigured(platform, 'discord')).toBe(true);
    });

    it('should return false when only DISCORD_CLIENT_ID is set', async () => {
      const platform = mockPlatform({ env: { DISCORD_CLIENT_ID: 'id' } });
      expect(await isProviderConfigured(platform, 'discord')).toBe(false);
    });

    // --- KV fallback ---
    it('should return true when KV has valid auth_config for github', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async (key: string) => {
              if (key === 'auth_config:github') {
                return JSON.stringify({ clientId: 'id', clientSecret: 'secret' });
              }
              return null;
            }
          }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(true);
    });

    it('should return true when KV has valid auth_config for discord', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async (key: string) => {
              if (key === 'auth_config:discord') {
                return JSON.stringify({ clientId: 'id', clientSecret: 'secret' });
              }
              return null;
            }
          }
        }
      });
      expect(await isProviderConfigured(platform, 'discord')).toBe(true);
    });

    it('should return false when KV has config missing clientSecret', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async () => JSON.stringify({ clientId: 'id' })
          }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    it('should return false when KV has config missing clientId', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async () => JSON.stringify({ clientSecret: 'secret' })
          }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    it('should return false when KV returns null', async () => {
      const platform = mockPlatform({
        env: {
          KV: { get: async () => null }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    it('should return false when KV stores invalid JSON', async () => {
      const platform = mockPlatform({
        env: {
          KV: { get: async () => 'not-json' }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    it('should return false when KV.get throws', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async () => {
              throw new Error('KV unavailable');
            }
          }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(false);
    });

    // --- undefined / null platform ---
    it('should return false when platform is undefined', async () => {
      expect(await isProviderConfigured(undefined, 'github')).toBe(false);
    });

    it('should return false when platform.env is undefined', async () => {
      expect(await isProviderConfigured({} as App.Platform, 'github')).toBe(false);
    });

    // --- env vars take priority over KV ---
    it('should return true from env vars without checking KV', async () => {
      const kvGet = async () => {
        throw new Error('should not be called');
      };
      const platform = mockPlatform({
        env: {
          GITHUB_CLIENT_ID: 'id',
          GITHUB_CLIENT_SECRET: 'secret',
          KV: { get: kvGet }
        }
      });
      expect(await isProviderConfigured(platform, 'github')).toBe(true);
    });
  });

  describe('hasAnyAuthProvider', () => {
    it('should return true when github is configured', async () => {
      const platform = mockPlatform({
        env: { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' }
      });
      expect(await hasAnyAuthProvider(platform)).toBe(true);
    });

    it('should return true when discord is configured', async () => {
      const platform = mockPlatform({
        env: { DISCORD_CLIENT_ID: 'id', DISCORD_CLIENT_SECRET: 'secret' }
      });
      expect(await hasAnyAuthProvider(platform)).toBe(true);
    });

    it('should return true when both providers are configured', async () => {
      const platform = mockPlatform({
        env: {
          GITHUB_CLIENT_ID: 'gid',
          GITHUB_CLIENT_SECRET: 'gsecret',
          DISCORD_CLIENT_ID: 'did',
          DISCORD_CLIENT_SECRET: 'dsecret'
        }
      });
      expect(await hasAnyAuthProvider(platform)).toBe(true);
    });

    it('should return false when no providers configured', async () => {
      const platform = mockPlatform({ env: {} });
      expect(await hasAnyAuthProvider(platform)).toBe(false);
    });

    it('should return false when platform is undefined', async () => {
      expect(await hasAnyAuthProvider(undefined)).toBe(false);
    });

    it('should return true when only KV has github config', async () => {
      const platform = mockPlatform({
        env: {
          KV: {
            get: async (key: string) => {
              if (key === 'auth_config:github') {
                return JSON.stringify({ clientId: 'id', clientSecret: 'secret' });
              }
              return null;
            }
          }
        }
      });
      expect(await hasAnyAuthProvider(platform)).toBe(true);
    });
  });
});
