/**
 * Spotify Token Management using Cloudflare KV
 * Stores and manages Spotify access/refresh tokens.
 */

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

const TOKEN_KEY = 'spotify:tokens';

/**
 * Get stored Spotify tokens from KV
 */
export async function getStoredTokens(kv: KVNamespace): Promise<SpotifyTokens | null> {
  const raw = await kv.get(TOKEN_KEY, 'json');
  return raw as SpotifyTokens | null;
}

/**
 * Store Spotify tokens in KV
 */
export async function storeTokens(kv: KVNamespace, tokens: SpotifyTokens): Promise<void> {
  await kv.put(TOKEN_KEY, JSON.stringify(tokens));
}

/**
 * Refresh the access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; } | null> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      console.error('Failed to refresh Spotify token:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 * Uses KV for caching and env vars for credentials.
 */
export async function getValidAccessToken(
  kv: KVNamespace,
  env: {
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_CLIENT_SECRET?: string;
    SPOTIFY_REFRESH_TOKEN?: string;
  }
): Promise<string | null> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing Spotify client credentials');
    return null;
  }

  // Try to get cached tokens from KV
  const tokens = await getStoredTokens(kv);

  if (tokens) {
    // Check if token is still valid (with 5 minute buffer)
    const bufferMs = 5 * 60 * 1000;
    if (tokens.expiresAt > Date.now() + bufferMs) {
      return tokens.accessToken;
    }

    // Token expired, refresh it
    const refreshed = await refreshAccessToken(tokens.refreshToken, clientId, clientSecret);
    if (refreshed) {
      await storeTokens(kv, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000
      });
      return refreshed.accessToken;
    }
  }

  // No cached tokens — try refresh token from env
  const envRefreshToken = env.SPOTIFY_REFRESH_TOKEN;
  if (envRefreshToken) {
    const refreshed = await refreshAccessToken(envRefreshToken, clientId, clientSecret);
    if (refreshed) {
      await storeTokens(kv, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000
      });
      return refreshed.accessToken;
    }
  }

  console.error('No valid Spotify tokens found');
  return null;
}
