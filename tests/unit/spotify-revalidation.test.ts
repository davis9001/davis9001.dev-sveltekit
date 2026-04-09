import { describe, expect, it } from 'vitest';
import {
  getSpotifyRevalidationHeaderValue,
  SPOTIFY_REVALIDATING_HEADER,
  shouldSurfaceSpotifyLoadError,
  shouldRetrySpotifyRevalidation
} from '../../src/lib/utils/spotify-revalidation';

describe('spotify-revalidation', () => {
  it('should expose the Spotify revalidation header name', () => {
    expect(SPOTIFY_REVALIDATING_HEADER).toBe('x-spotify-revalidating');
  });

  it('should encode an in-flight refresh as header value 1', () => {
    expect(getSpotifyRevalidationHeaderValue(true)).toBe('1');
  });

  it('should encode an idle refresh state as header value 0', () => {
    expect(getSpotifyRevalidationHeaderValue(false)).toBe('0');
  });

  it('should retry when the response says revalidation is in progress and retries remain', () => {
    expect(shouldRetrySpotifyRevalidation('1', 3)).toBe(true);
  });

  it('should not retry when the response is already fresh', () => {
    expect(shouldRetrySpotifyRevalidation('0', 3)).toBe(false);
    expect(shouldRetrySpotifyRevalidation(null, 3)).toBe(false);
  });

  it('should not retry when no retries remain', () => {
    expect(shouldRetrySpotifyRevalidation('1', 0)).toBe(false);
    expect(shouldRetrySpotifyRevalidation('1', -1)).toBe(false);
  });

  it('should surface a load error for the first request when there is no existing data', () => {
    expect(shouldSurfaceSpotifyLoadError(true, false)).toBe(true);
  });

  it('should suppress load errors when cached data is already visible', () => {
    expect(shouldSurfaceSpotifyLoadError(true, true)).toBe(false);
  });

  it('should suppress load errors for background refresh failures', () => {
    expect(shouldSurfaceSpotifyLoadError(false, false)).toBe(false);
    expect(shouldSurfaceSpotifyLoadError(false, true)).toBe(false);
  });
});