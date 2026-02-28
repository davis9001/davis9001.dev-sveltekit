/**
 * Shared auth utilities
 *
 * Checks whether OAuth providers are configured via environment
 * variables or KV storage (saved by /setup).
 */

export type OAuthProvider = 'github' | 'discord';

/**
 * Check whether a specific OAuth provider has credentials configured.
 *
 * Resolution order:
 *  1. Environment variables (e.g. GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET)
 *  2. KV storage key  (e.g. auth_config:github  saved by /setup)
 */
export async function isProviderConfigured(
  platform: App.Platform | undefined,
  provider: OAuthProvider
): Promise<boolean> {
  if (provider === 'github') {
    if (platform?.env?.GITHUB_CLIENT_ID && platform?.env?.GITHUB_CLIENT_SECRET) {
      return true;
    }
  } else if (provider === 'discord') {
    if (platform?.env?.DISCORD_CLIENT_ID && platform?.env?.DISCORD_CLIENT_SECRET) {
      return true;
    }
  }

  // Fallback: check KV storage
  if (platform?.env?.KV) {
    try {
      const stored = await platform.env.KV.get(`auth_config:${provider}`);
      if (stored) {
        const config = JSON.parse(stored);
        return !!(config.clientId && config.clientSecret);
      }
    } catch {
      // Ignore KV errors
    }
  }

  return false;
}

/**
 * Check whether *any* auth provider is configured so the UI can
 * decide whether to show the "Sign In" link at all.
 */
export async function hasAnyAuthProvider(platform: App.Platform | undefined): Promise<boolean> {
  const [github, discord] = await Promise.all([
    isProviderConfigured(platform, 'github'),
    isProviderConfigured(platform, 'discord')
  ]);
  return github || discord;
}
