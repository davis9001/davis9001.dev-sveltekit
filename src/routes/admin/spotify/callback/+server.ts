import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForTokens } from '$lib/utils/spotify-tokens';

/**
 * GET /admin/spotify/callback
 * Handles the Spotify OAuth callback, exchanges the authorization code for tokens.
 *
 * Note: No admin auth check here — the authorization code is single-use, scoped,
 * and bound to our redirect URI. The admin-gated /admin/spotify/authorize route
 * is the entry point that initiates this flow. If the code is invalid or was not
 * requested by us, the exchange will simply fail.
 */
export const GET: RequestHandler = async ({ platform, url }) => {
  const spotifyError = url.searchParams.get('error');
  if (spotifyError) {
    throw redirect(302, `/admin/spotify?error=${encodeURIComponent(`Spotify authorization error: ${spotifyError}`)}`);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    throw redirect(302, `/admin/spotify?error=${encodeURIComponent('Missing authorization code from Spotify')}`);
  }

  if (!platform) {
    throw error(500, 'Platform not available');
  }

  const clientId = platform.env?.SPOTIFY_CLIENT_ID;
  const clientSecret = platform.env?.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw error(500, 'Spotify client credentials not configured');
  }

  const redirectUri =
    platform.env?.SPOTIFY_REDIRECT_URI || `${url.origin}/admin/spotify/callback`;

  try {
    const success = await exchangeCodeForTokens(
      platform.env.KV,
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    if (success) {
      throw redirect(302, '/admin/spotify?success=1');
    } else {
      throw redirect(302, `/admin/spotify?error=${encodeURIComponent('Failed to exchange authorization code for tokens')}`);
    }
  } catch (err) {
    // Re-throw redirects
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number; }).status >= 300 && (err as { status: number; }).status < 400) {
      throw err;
    }
    console.error('Spotify callback error:', err);
    throw redirect(302, `/admin/spotify?error=${encodeURIComponent(err instanceof Error ? err.message : 'Token exchange failed')}`);
  }
};
