import { describe, expect, it } from 'vitest';
import {
  getSpotifyNextRefreshHeaderValue,
  parseSpotifyNextRefreshDelayMs,
  SPOTIFY_DEFAULT_REFRESH_MS,
  SPOTIFY_MAX_REFRESH_MS,
  SPOTIFY_MIN_REFRESH_MS,
  SPOTIFY_NEXT_REFRESH_MS_HEADER,
  getSpotifyRevalidationHeaderValue,
  SPOTIFY_REVALIDATING_HEADER,
  shouldSurfaceSpotifyLoadError,
  shouldRetrySpotifyRevalidation
} from '../../src/lib/utils/spotify-revalidation';

describe('spotify-revalidation', () => {
  it('should expose the Spotify revalidation header name', () => {
    expect(SPOTIFY_REVALIDATING_HEADER).toBe('x-spotify-revalidating');
  });

  it('should expose the Spotify next-refresh header name', () => {
    expect(SPOTIFY_NEXT_REFRESH_MS_HEADER).toBe('x-spotify-next-refresh-ms');
  });

  it('should encode an in-flight refresh as header value 1', () => {
    expect(getSpotifyRevalidationHeaderValue(true)).toBe('1');
  });

  it('should encode an idle refresh state as header value 0', () => {
    expect(getSpotifyRevalidationHeaderValue(false)).toBe('0');
  });

  it('should encode next-refresh delay as a bounded string value', () => {
    expect(getSpotifyNextRefreshHeaderValue(12_345)).toBe('12345');
    expect(getSpotifyNextRefreshHeaderValue(100)).toBe(String(SPOTIFY_MIN_REFRESH_MS));
    expect(getSpotifyNextRefreshHeaderValue(SPOTIFY_MAX_REFRESH_MS * 2)).toBe(
      String(SPOTIFY_MAX_REFRESH_MS)
    );
  });

  it('should parse next-refresh delay with fallback and bounds', () => {
    expect(parseSpotifyNextRefreshDelayMs('12000')).toBe(12000);
    expect(parseSpotifyNextRefreshDelayMs(String(SPOTIFY_MAX_REFRESH_MS * 2))).toBe(
      SPOTIFY_MAX_REFRESH_MS
    );
    expect(parseSpotifyNextRefreshDelayMs('not-a-number')).toBe(SPOTIFY_DEFAULT_REFRESH_MS);
    expect(parseSpotifyNextRefreshDelayMs(null)).toBe(SPOTIFY_DEFAULT_REFRESH_MS);
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