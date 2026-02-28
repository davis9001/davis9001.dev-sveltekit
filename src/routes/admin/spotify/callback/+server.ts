import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForTokens } from '$lib/utils/spotify-tokens';

/**
 * GET /admin/spotify/callback
 * Handles the Spotify OAuth callback, exchanges the authorization code for tokens.
 * Requires admin authentication.
 */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
  // Check authentication
  if (!locals.user?.isOwner && !locals.user?.isAdmin) {
    throw error(403, 'Admin access required');
  }

  const spotifyError = url.searchParams.get('error');
  if (spotifyError) {
    return json(
      {
        success: false,
        error: `Spotify authorization error: ${spotifyError}`
      },
      { status: 400 }
    );
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return json(
      {
        success: false,
        error: 'Missing authorization code from Spotify'
      },
      { status: 400 }
    );
  }

  const clientId = platform?.env?.SPOTIFY_CLIENT_ID;
  const clientSecret = platform?.env?.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw error(500, 'Spotify client credentials not configured');
  }

  const redirectUri =
    platform?.env?.SPOTIFY_REDIRECT_URI || `${url.origin}/admin/spotify/callback`;

  try {
    const success = await exchangeCodeForTokens(
      platform!.env.KV,
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    if (success) {
      return json({
        success: true,
        message: 'Spotify tokens generated and stored successfully'
      });
    } else {
      return json(
        {
          success: false,
          error: 'Failed to exchange authorization code for tokens'
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Spotify callback error:', err);
    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Token exchange failed'
      },
      { status: 500 }
    );
  }
};
