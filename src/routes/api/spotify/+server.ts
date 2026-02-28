import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getValidAccessToken } from '$lib/utils/spotify-tokens';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string; external_urls: { spotify: string; }; }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number; }[];
    external_urls: { spotify: string; };
  };
  external_urls: { spotify: string; };
  duration_ms: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string; height: number; width: number; }[];
  external_urls: { spotify: string; };
  tracks: { total: number; };
  owner: { id: string; display_name: string; };
  followers?: { total: number; };
  public: boolean;
}

interface SpotifyContext {
  type: string;
  href: string;
  external_urls: { spotify: string; };
  uri: string;
}

interface CurrentlyPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number;
  context: SpotifyContext | null;
}

interface RecentlyPlayedResponse {
  items: Array<{
    track: SpotifyTrack;
    played_at: string;
  }>;
}

interface SpotifyData {
  currentlyPlaying: {
    isPlaying: boolean;
    track: SpotifyTrack | null;
    progress_ms: number;
    context: { type: string; name: string; url: string; } | null;
  } | null;
  recentlyPlayed: Array<{ track: SpotifyTrack; playedAt: string; }>;
  topPlaylists: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    url: string;
    trackCount: number;
    followers: number;
    totalDurationMs: number;
  }>;
  profileUrl: string;
  error?: string;
}

const PROFILE_URL = 'https://open.spotify.com/user/12810003?si=7ba6ee05f9cb4e96';
const SPOTIFY_USER_ID = '12810003';
const PLAYLIST_CACHE_KEY = 'spotify:playlist-cache';
const PLAYLIST_CACHE_TTL = 30 * 60; // 30 minutes in seconds

function makeErrorResponse(error: string, status = 200) {
  return json(
    {
      error,
      currentlyPlaying: null,
      recentlyPlayed: [],
      topPlaylists: [],
      profileUrl: PROFILE_URL
    } satisfies SpotifyData,
    {
      status,
      headers: { 'Cache-Control': 'public, max-age=60' }
    }
  );
}

async function getCurrentlyPlaying(
  accessToken: string
): Promise<CurrentlyPlayingResponse | null> {
  try {
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (response.status === 204) {
      return { is_playing: false, item: null, progress_ms: 0, context: null };
    }

    if (!response.ok) {
      console.error('Failed to fetch currently playing:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    return null;
  }
}

async function getRecentlyPlayed(
  accessToken: string
): Promise<RecentlyPlayedResponse | null> {
  try {
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.error('Failed to fetch recently played:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching recently played:', error);
    return null;
  }
}

async function getTopPlaylists(
  accessToken: string,
  kv: KVNamespace
): Promise<SpotifyData['topPlaylists']> {
  // Check KV cache first
  try {
    const cached = await kv.get(PLAYLIST_CACHE_KEY, 'json');
    if (cached) {
      return cached as SpotifyData['topPlaylists'];
    }
  } catch {
    // Cache miss, continue
  }

  try {
    // Step 1: Get user's playlists
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Failed to fetch playlists:', response.status);
      return [];
    }

    const data = await response.json();
    const allPlaylists: SpotifyPlaylist[] = data.items || [];

    // Filter to user's own playlists
    const playlists = allPlaylists.filter((p) => p.owner?.id === SPOTIFY_USER_ID);

    // Step 2: Fetch follower counts in parallel
    const playlistDetails = await Promise.all(
      playlists.map(async (playlist) => {
        try {
          const detailResp = await fetch(
            `https://api.spotify.com/v1/playlists/${playlist.id}?fields=id,name,description,images,external_urls,tracks(total),owner,followers,public`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!detailResp.ok) {
            return { ...playlist, followers: { total: 0 } };
          }

          return (await detailResp.json()) as SpotifyPlaylist;
        } catch {
          return { ...playlist, followers: { total: 0 } };
        }
      })
    );

    // Step 3: Sort by follower count, take top 3
    const top3 = playlistDetails
      .sort((a, b) => (b.followers?.total || 0) - (a.followers?.total || 0))
      .slice(0, 3);

    // Step 4: Fetch total duration for top 3
    const topPlaylists = await Promise.all(
      top3.map(async (playlist) => {
        let totalDurationMs = 0;
        try {
          let url: string | null = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(duration_ms)),next&limit=100`;
          while (url) {
            const tracksResp = await fetch(url, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!tracksResp.ok) break;
            const tracksData = await tracksResp.json();
            for (const item of tracksData.items || []) {
              totalDurationMs += item.track?.duration_ms || 0;
            }
            url = tracksData.next;
          }
        } catch (e) {
          console.error(`Error fetching tracks for playlist ${playlist.id}:`, e);
        }
        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          imageUrl: playlist.images?.[0]?.url || null,
          url: playlist.external_urls.spotify,
          trackCount: playlist.tracks?.total || 0,
          followers: playlist.followers?.total || 0,
          totalDurationMs
        };
      })
    );

    // Cache in KV
    try {
      await kv.put(PLAYLIST_CACHE_KEY, JSON.stringify(topPlaylists), {
        expirationTtl: PLAYLIST_CACHE_TTL
      });
    } catch {
      // Cache write failure is non-critical
    }

    return topPlaylists;
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
}

async function resolveContext(
  ctx: SpotifyContext,
  accessToken: string
): Promise<{ type: string; name: string; url: string; } | null> {
  try {
    const resp = await fetch(ctx.href, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    // Only show public contexts (albums and artists are always accessible)
    const isPublic =
      ctx.type === 'album' || ctx.type === 'artist' || data.public !== false;

    if (isPublic && data.name) {
      return {
        type: ctx.type,
        name: data.name,
        url: ctx.external_urls?.spotify || ''
      };
    }
    return null;
  } catch (e) {
    console.error('Error resolving playback context:', e);
    return null;
  }
}

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform) {
    return makeErrorResponse('Platform not available', 500);
  }

  try {
    const accessToken = await getValidAccessToken(platform.env.KV, platform.env);

    if (!accessToken) {
      return makeErrorResponse('Unable to authenticate with Spotify. Please complete setup.');
    }

    // Fetch all data in parallel
    const [currentlyPlaying, recentlyPlayed, topPlaylists] = await Promise.all([
      getCurrentlyPlaying(accessToken),
      getRecentlyPlayed(accessToken),
      getTopPlaylists(accessToken, platform.env.KV)
    ]);

    // Resolve playback context
    let resolvedContext: { type: string; name: string; url: string; } | null = null;
    if (currentlyPlaying?.context) {
      resolvedContext = await resolveContext(currentlyPlaying.context, accessToken);
    }

    const data: SpotifyData = {
      currentlyPlaying: currentlyPlaying
        ? {
          isPlaying: currentlyPlaying.is_playing,
          track: currentlyPlaying.item,
          progress_ms: currentlyPlaying.progress_ms || 0,
          context: resolvedContext
        }
        : null,
      recentlyPlayed: recentlyPlayed
        ? recentlyPlayed.items.map((item) => ({
          track: item.track,
          playedAt: item.played_at
        }))
        : [],
      topPlaylists,
      profileUrl: PROFILE_URL
    };

    return json(data, {
      headers: { 'Cache-Control': 'public, max-age=30' }
    });
  } catch (error) {
    console.error('Error in Spotify API handler:', error);
    return makeErrorResponse('Internal server error', 500);
  }
};
