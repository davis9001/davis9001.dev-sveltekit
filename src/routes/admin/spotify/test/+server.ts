import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStoredTokens, getValidAccessToken } from '$lib/utils/spotify-tokens';

/**
 * GET /admin/spotify/test
 * Tests the Spotify connection by fetching recently played tracks.
 * Returns JSON with token status and test results.
 * Requires admin authentication.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
  // Check authentication
  if (!locals.user?.isOwner && !locals.user?.isAdmin) {
    throw error(403, 'Admin access required');
  }

  const kv = platform!.env.KV;
  const env = platform!.env;

  // Check for stored tokens
  const tokens = await getStoredTokens(kv);
  if (!tokens) {
    return json(
      {
        success: false,
        error: 'No tokens stored. Please generate Spotify tokens first.'
      },
      { status: 400 }
    );
  }

  // Try to get a valid access token (will refresh if needed)
  const accessToken = await getValidAccessToken(kv, env);
  if (!accessToken) {
    return json(
      {
        success: false,
        error: 'Failed to get valid access token. Try regenerating tokens.'
      },
      { status: 500 }
    );
  }

  try {
    // Test the API by fetching recently played
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=1',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return json(
        {
          success: false,
          error: `Spotify API error: ${response.status}`,
          message: errorText
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const recentTrack = data.items?.[0]?.track ?? null;

    // Re-fetch tokens to get current expiry (may have been refreshed)
    const currentTokens = await getStoredTokens(kv);

    return json({
      success: true,
      recentTrack: recentTrack
        ? {
          name: recentTrack.name,
          artists: recentTrack.artists?.map((a: { name: string; }) => a.name).join(', '),
          album: recentTrack.album?.name,
          albumArt: recentTrack.album?.images?.[0]?.url ?? null
        }
        : null,
      tokenStatus: {
        hasAccessToken: !!currentTokens?.accessToken,
        hasRefreshToken: !!currentTokens?.refreshToken,
        expiresAt: currentTokens?.expiresAt
          ? new Date(currentTokens.expiresAt).toISOString()
          : null,
        expiresInMinutes: currentTokens?.expiresAt
          ? Math.floor((currentTokens.expiresAt - Date.now()) / 1000 / 60)
          : 0
      }
    });
  } catch (err) {
    console.error('Spotify test error:', err);
    return json(
      {
        success: false,
        error: 'Test failed',
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
};
