import type { KVNamespace } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getValidAccessToken } from '$lib/utils/spotify-tokens';
import {
  getSpotifyNextRefreshHeaderValue,
  getSpotifyRevalidationHeaderValue,
  SPOTIFY_NEXT_REFRESH_MS_HEADER,
  SPOTIFY_MIN_REFRESH_MS,
  SPOTIFY_REVALIDATING_HEADER
} from '$lib/utils/spotify-revalidation';
import {
  getSpotifyCacheState,
  releaseSpotifyRefreshLock,
  setSpotifyCache,
  tryAcquireSpotifyRefreshLock
} from '$lib/services/spotify-cache';

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

// ── In-memory cache (survives across requests within the same worker/process) ──
interface MemoryCache<T> {
  data: T;
  nextRefreshAt: number;
  expiresAt: number;
}

let playlistMemoryCache: MemoryCache<SpotifyData['topPlaylists']> | null = null;
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Full response cache to avoid repeated Spotify API calls on rapid polling
let fullResponseCache: MemoryCache<SpotifyData> | null = null;
const FULL_RESPONSE_CACHE_TTL_MS = 30 * 1000;
let backgroundRefreshInFlight: Promise<void> | null = null;
let refreshLockOwnerId: string | null = null;

const REFRESH_IDLE_INTERVAL_MS = 90 * 1000;
const REFRESH_PLAYING_BUFFER_MS = 1_500;
const REFRESH_MIN_PLAYING_INTERVAL_MS = SPOTIFY_MIN_REFRESH_MS;
const REFRESH_MAX_PLAYING_INTERVAL_MS = 10 * 60 * 1000;

// Rate limit tracking — if Spotify returns 429, back off for the specified duration
let rateLimitedUntil = 0;
const MAX_BACKOFF_SECONDS = 300; // Cap at 5 minutes — Spotify sometimes sends absurdly long Retry-After values

interface RefreshResult {
  data: SpotifyData | null;
  nextRefreshAt?: number;
  error?: string;
  status?: number;
}

/**
 * Exported for testing: reset all module-level caches and rate-limit state.
 */
export function _resetCacheForTesting(): void {
  playlistMemoryCache = null;
  fullResponseCache = null;
  backgroundRefreshInFlight = null;
  refreshLockOwnerId = null;
  rateLimitedUntil = 0;
}

function computeNextRefreshAt(data: SpotifyData, now = Date.now()): number {
  const currentlyPlaying = data.currentlyPlaying;

  if (currentlyPlaying?.isPlaying && currentlyPlaying.track?.duration_ms) {
    const durationMs = currentlyPlaying.track.duration_ms;
    const progressMs = Math.max(Math.min(currentlyPlaying.progress_ms || 0, durationMs), 0);
    const remainingMs = Math.max(durationMs - progressMs, 0);
    const interval = Math.min(
      Math.max(remainingMs + REFRESH_PLAYING_BUFFER_MS, REFRESH_MIN_PLAYING_INTERVAL_MS),
      REFRESH_MAX_PLAYING_INTERVAL_MS
    );

    return now + interval;
  }

  return now + REFRESH_IDLE_INTERVAL_MS;
}

function getRefreshDelayMs(nextRefreshAt: number, now = Date.now()): number {
  return Math.max(nextRefreshAt - now, SPOTIFY_MIN_REFRESH_MS);
}

function toMemoryCache(data: SpotifyData, nextRefreshAt: number, now = Date.now()): MemoryCache<SpotifyData> {
  return {
    data,
    nextRefreshAt,
    expiresAt: Math.min(nextRefreshAt, now + FULL_RESPONSE_CACHE_TTL_MS)
  };
}

function makeSuccessResponse(
  data: SpotifyData,
  options: { revalidating?: boolean; nextRefreshAt?: number; extraHeaders?: Record<string, string>; } = {}
) {
  // Use one timestamp to avoid 1ms drift between nextRefreshAt and delay calculation.
  const now = Date.now();
  const nextRefreshAt = options.nextRefreshAt ?? computeNextRefreshAt(data, now);
  const nextRefreshDelayMs = getRefreshDelayMs(nextRefreshAt, now);

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=30',
      [SPOTIFY_REVALIDATING_HEADER]: getSpotifyRevalidationHeaderValue(!!options.revalidating),
      [SPOTIFY_NEXT_REFRESH_MS_HEADER]: getSpotifyNextRefreshHeaderValue(nextRefreshDelayMs),
      ...(options.extraHeaders || {})
    }
  });
}

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

/**
 * Wrapper around fetch that checks for 429 responses and records the Retry-After.
 * Returns the response as-is so callers can handle other statuses normally.
 */
async function spotifyFetch(url: string, accessToken: string): Promise<Response> {
  // If we're currently rate-limited, return a synthetic 429 immediately
  if (Date.now() < rateLimitedUntil) {
    return new Response(null, { status: 429, statusText: 'Rate limited (local backoff)' });
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const backoffSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
    const clampedSeconds = Math.min(
      Math.max(isNaN(backoffSeconds) ? 30 : backoffSeconds, 5),
      MAX_BACKOFF_SECONDS
    );
    const backoffMs = clampedSeconds * 1000;
    rateLimitedUntil = Date.now() + backoffMs;
    console.warn(`Spotify rate limited — backing off for ${clampedSeconds}s (Retry-After was ${retryAfter})`);
  }

  return response;
}

interface FetchResult<T> {
  data: T | null;
  failed: boolean;
  status?: number;
}

async function getCurrentlyPlaying(
  accessToken: string
): Promise<FetchResult<CurrentlyPlayingResponse>> {
  try {
    const response = await spotifyFetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      accessToken
    );

    if (response.status === 204) {
      return { data: { is_playing: false, item: null, progress_ms: 0, context: null }, failed: false };
    }

    if (!response.ok) {
      console.error('Failed to fetch currently playing:', response.status);
      return { data: null, failed: true, status: response.status };
    }

    return { data: await response.json(), failed: false };
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    return { data: null, failed: true };
  }
}

async function getRecentlyPlayed(
  accessToken: string
): Promise<FetchResult<RecentlyPlayedResponse>> {
  try {
    const response = await spotifyFetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=10',
      accessToken
    );

    if (!response.ok) {
      console.error('Failed to fetch recently played:', response.status);
      return { data: null, failed: true, status: response.status };
    }

    return { data: await response.json(), failed: false };
  } catch (error) {
    console.error('Error fetching recently played:', error);
    return { data: null, failed: true };
  }
}

async function getTopPlaylists(
  accessToken: string,
  kv?: KVNamespace
): Promise<SpotifyData['topPlaylists']> {
  // Check in-memory cache first (works on both local dev and production)
  if (playlistMemoryCache && Date.now() < playlistMemoryCache.expiresAt) {
    return playlistMemoryCache.data;
  }

  // Check KV cache second
  if (kv) {
    try {
      const cached = await kv.get(PLAYLIST_CACHE_KEY, 'json');
      if (cached) {
        const result = cached as SpotifyData['topPlaylists'];
        const nextRefreshAt = Date.now() + MEMORY_CACHE_TTL_MS;
        // Populate memory cache from KV
        playlistMemoryCache = { data: result, nextRefreshAt, expiresAt: nextRefreshAt };
        return result;
      }
    } catch {
      // Cache miss, continue
    }
  }

  // If rate-limited, return empty rather than hammering the API
  if (Date.now() < rateLimitedUntil) {
    console.warn('Skipping playlist fetch — currently rate-limited');
    return playlistMemoryCache?.data || [];
  }

  try {
    // Step 1: Get user's playlists
    const response = await spotifyFetch(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      accessToken
    );

    if (!response.ok) {
      console.error('Failed to fetch playlists:', response.status);
      return playlistMemoryCache?.data || [];
    }

    const data = await response.json();
    const allPlaylists: SpotifyPlaylist[] = data.items || [];

    // Filter to user's own public playlists
    const playlists = allPlaylists.filter((p) => p.owner?.id === SPOTIFY_USER_ID && p.public);

    // Step 2: Fetch follower counts sequentially (avoids concurrent request blast)
    const playlistDetails: SpotifyPlaylist[] = [];
    for (const playlist of playlists) {
      // Bail early if we get rate-limited mid-loop
      if (Date.now() < rateLimitedUntil) {
        playlistDetails.push({ ...playlist, followers: { total: 0 } });
        continue;
      }
      try {
        const detailResp = await spotifyFetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}?fields=id,name,description,images,external_urls,tracks(total),owner,followers,public`,
          accessToken
        );

        if (!detailResp.ok) {
          playlistDetails.push({ ...playlist, followers: { total: 0 } });
        } else {
          playlistDetails.push((await detailResp.json()) as SpotifyPlaylist);
        }
      } catch {
        playlistDetails.push({ ...playlist, followers: { total: 0 } });
      }
    }

    // Step 3: Sort by follower count, take top 3
    const top3 = playlistDetails
      .sort((a, b) => (b.followers?.total || 0) - (a.followers?.total || 0))
      .slice(0, 3);

    // Step 4: Fetch total duration for top 3 (sequentially to avoid rate limits)
    const topPlaylists: SpotifyData['topPlaylists'] = [];
    for (const playlist of top3) {
      let totalDurationMs = 0;
      try {
        let url: string | null = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(duration_ms)),next&limit=100`;
        while (url) {
          if (Date.now() < rateLimitedUntil) break;
          const tracksResp = await spotifyFetch(url, accessToken);
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
      topPlaylists.push({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        imageUrl: playlist.images?.[0]?.url || null,
        url: playlist.external_urls.spotify,
        trackCount: playlist.tracks?.total || 0,
        followers: playlist.followers?.total || 0,
        totalDurationMs
      });
    }

    // Cache in memory
    const nextRefreshAt = Date.now() + MEMORY_CACHE_TTL_MS;
    playlistMemoryCache = { data: topPlaylists, nextRefreshAt, expiresAt: nextRefreshAt };

    // Cache in KV
    if (kv) {
      try {
        await kv.put(PLAYLIST_CACHE_KEY, JSON.stringify(topPlaylists), {
          expirationTtl: PLAYLIST_CACHE_TTL
        });
      } catch {
        // Cache write failure is non-critical
      }
    }

    return topPlaylists;
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return playlistMemoryCache?.data || [];
  }
}

async function resolveContext(
  ctx: SpotifyContext,
  accessToken: string
): Promise<{ type: string; name: string; url: string; } | null> {
  try {
    const resp = await spotifyFetch(ctx.href, accessToken);
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

async function fetchFreshSpotifyData(platform: App.Platform): Promise<RefreshResult> {
  try {
    const accessToken = await getValidAccessToken(platform.env.KV, platform.env);

    if (!accessToken) {
      return {
        data: null,
        error: 'Unable to authenticate with Spotify. Please complete setup.'
      };
    }

    const [currentlyPlayingResult, recentlyPlayedResult, topPlaylists] = await Promise.all([
      getCurrentlyPlaying(accessToken),
      getRecentlyPlayed(accessToken),
      getTopPlaylists(accessToken, platform.env.KV)
    ]);

    const got401 =
      currentlyPlayingResult.status === 401 || recentlyPlayedResult.status === 401;
    if (got401) {
      console.warn('Spotify returned 401 — clearing cached tokens from KV');
      if (platform.env.KV) {
        try {
          await platform.env.KV.delete('spotify:tokens');
        } catch {
          // Best-effort token cleanup
        }
      }
    }

    const allFetchesFailed =
      currentlyPlayingResult.failed && recentlyPlayedResult.failed && topPlaylists.length === 0;

    if (allFetchesFailed) {
      return {
        data: null,
        error: got401
          ? 'Spotify token is invalid or expired. Please re-authorize via the admin panel.'
          : 'All Spotify API calls failed. The service may be temporarily unavailable.'
      };
    }

    const currentlyPlaying = currentlyPlayingResult.data;
    const recentlyPlayed = recentlyPlayedResult.data;

    let resolvedContext: { type: string; name: string; url: string; } | null = null;
    if (currentlyPlaying?.context) {
      resolvedContext = await resolveContext(currentlyPlaying.context, accessToken);
    }

    return {
      data: {
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
      }
    };
  } catch (error) {
    console.error('Error in Spotify API handler:', error);
    return {
      data: null,
      error: 'Internal server error',
      status: 500
    };
  }
}

async function refreshSpotifyCache(platform: App.Platform): Promise<RefreshResult> {
  const result = await fetchFreshSpotifyData(platform);

  if (!result.data) {
    return result;
  }

  const nextRefreshAt = computeNextRefreshAt(result.data);

  fullResponseCache = toMemoryCache(result.data, nextRefreshAt);
  await setSpotifyCache(platform.env.DB, result.data as unknown as Record<string, unknown>, {
    nextRefreshAt
  });

  return {
    ...result,
    nextRefreshAt
  };
}

function createRefreshOwnerId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function scheduleBackgroundRefresh(platform: App.Platform): Promise<boolean> {
  if (backgroundRefreshInFlight) {
    return true;
  }

  const ownerId = createRefreshOwnerId('spotify-bg-refresh');
  const hasLock = await tryAcquireSpotifyRefreshLock(platform.env.DB, ownerId);

  if (!hasLock) {
    return true;
  }

  refreshLockOwnerId = ownerId;

  const refreshPromise = (async () => {
    await refreshSpotifyCache(platform);
  })()
    .catch((error) => {
      console.error('Background Spotify refresh failed:', error);
    })
    .finally(async () => {
      await releaseSpotifyRefreshLock(platform.env.DB, ownerId);
      backgroundRefreshInFlight = null;
      if (refreshLockOwnerId === ownerId) {
        refreshLockOwnerId = null;
      }
    });

  backgroundRefreshInFlight = refreshPromise;
  platform.context?.waitUntil(refreshPromise);

  return true;
}

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform) {
    return makeErrorResponse('Platform not available', 500);
  }

  const now = Date.now();

  if (fullResponseCache && now < fullResponseCache.expiresAt) {
    const shouldRefresh = now >= fullResponseCache.nextRefreshAt;
    const revalidating = shouldRefresh
      ? await scheduleBackgroundRefresh(platform)
      : false;

    return makeSuccessResponse(fullResponseCache.data, {
      revalidating,
      nextRefreshAt: fullResponseCache.nextRefreshAt
    });
  }

  const dbCacheState = await getSpotifyCacheState(platform.env.DB);
  if (dbCacheState) {
    const data = dbCacheState.data as SpotifyData;
    const nextRefreshAt =
      typeof dbCacheState.nextRefreshAt === 'number'
        ? dbCacheState.nextRefreshAt
        : computeNextRefreshAt(data, dbCacheState.cachedAt);

    fullResponseCache = toMemoryCache(data, nextRefreshAt, now);

    const shouldRefresh = now >= nextRefreshAt;
    const revalidating = shouldRefresh
      ? await scheduleBackgroundRefresh(platform)
      : false;

    return makeSuccessResponse(data, {
      revalidating,
      nextRefreshAt
    });
  }

  const ownerId = createRefreshOwnerId('spotify-sync-refresh');
  const hasLock = await tryAcquireSpotifyRefreshLock(platform.env.DB, ownerId);

  if (!hasLock) {
    return makeErrorResponse('Spotify cache warm-up in progress. Retry shortly.', 503);
  }

  try {
    const result = await refreshSpotifyCache(platform);
    if (result.data) {
      return makeSuccessResponse(result.data, {
        revalidating: false,
        nextRefreshAt: result.nextRefreshAt
      });
    }

    fullResponseCache = null;
    return makeErrorResponse(result.error || 'Internal server error', result.status || 500);
  } finally {
    await releaseSpotifyRefreshLock(platform.env.DB, ownerId);
  }
};
