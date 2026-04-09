export const SPOTIFY_REVALIDATING_HEADER = 'x-spotify-revalidating';

export function getSpotifyRevalidationHeaderValue(hasRefreshInFlight: boolean): '1' | '0' {
  return hasRefreshInFlight ? '1' : '0';
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