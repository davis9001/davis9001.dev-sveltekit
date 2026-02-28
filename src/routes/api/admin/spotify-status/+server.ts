import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStoredTokens } from '$lib/utils/spotify-tokens';

/**
 * GET /api/admin/spotify-status
 * Returns the current Spotify token configuration status.
 * Used by the admin dashboard to show token state.
 * Requires admin authentication.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
  // Check authentication
  if (!locals.user?.isOwner && !locals.user?.isAdmin) {
    throw error(403, 'Admin access required');
  }

  const kv = platform!.env.KV;
  const hasClientCredentials = !!(
    platform?.env?.SPOTIFY_CLIENT_ID && platform?.env?.SPOTIFY_CLIENT_SECRET
  );

  let hasTokens = false;
  let expiresInMinutes = 0;
  let expiresAt: string | null = null;

  try {
    const tokens = await getStoredTokens(kv);
    if (tokens) {
      hasTokens = true;
      expiresInMinutes = Math.floor((tokens.expiresAt - Date.now()) / 1000 / 60);
      expiresAt = new Date(tokens.expiresAt).toISOString();
    }
  } catch (err) {
    console.error('Failed to fetch Spotify token status:', err);
  }

  return json({
    hasTokens,
    hasClientCredentials,
    expiresInMinutes,
    expiresAt
  });
};
