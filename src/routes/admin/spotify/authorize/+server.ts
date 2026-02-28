import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /admin/spotify/authorize
 * Initiates the Spotify OAuth flow by redirecting to Spotify's authorize URL.
 * Requires admin authentication.
 */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
  // Check authentication
  if (!locals.user?.isOwner && !locals.user?.isAdmin) {
    throw error(403, 'Admin access required');
  }

  const clientId = platform?.env?.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw error(500, 'SPOTIFY_CLIENT_ID not configured');
  }

  // Use configured redirect URI or default to current origin
  const redirectUri =
    platform?.env?.SPOTIFY_REDIRECT_URI || `${url.origin}/admin/spotify/callback`;

  const scopes = [
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-read-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('show_dialog', 'true');

  throw redirect(302, authUrl.toString());
};
