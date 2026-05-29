export const SPOTIFY_REVALIDATING_HEADER = 'x-spotify-revalidating';
export const SPOTIFY_NEXT_REFRESH_MS_HEADER = 'x-spotify-next-refresh-ms';

export const SPOTIFY_DEFAULT_REFRESH_MS = 30_000;
export const SPOTIFY_MIN_REFRESH_MS = 5_000;
export const SPOTIFY_MAX_REFRESH_MS = 10 * 60 * 1000;

export function getSpotifyRevalidationHeaderValue(hasRefreshInFlight: boolean): '1' | '0' {
  return hasRefreshInFlight ? '1' : '0';
}

export function getSpotifyNextRefreshHeaderValue(refreshInMs: number): string {
  const clamped = Math.min(
    Math.max(Math.floor(refreshInMs), SPOTIFY_MIN_REFRESH_MS),
    SPOTIFY_MAX_REFRESH_MS
  );

  return String(clamped);
}

export function parseSpotifyNextRefreshDelayMs(headerValue: string | null): number {
  if (!headerValue) {
    return SPOTIFY_DEFAULT_REFRESH_MS;
  }

  const parsed = Number.parseInt(headerValue, 10);
  if (Number.isNaN(parsed)) {
    return SPOTIFY_DEFAULT_REFRESH_MS;
  }

  return Math.min(Math.max(parsed, SPOTIFY_MIN_REFRESH_MS), SPOTIFY_MAX_REFRESH_MS);
}

export function shouldRetrySpotifyRevalidation(
  headerValue: string | null,
  retriesRemaining: number
): boolean {
  return headerValue === '1' && retriesRemaining > 0;
}

export function shouldSurfaceSpotifyLoadError(
  isInitialRequest: boolean,
  hasExistingData: boolean
): boolean {
  return isInitialRequest && !hasExistingData;
}