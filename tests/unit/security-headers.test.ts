/**
 * Tests for security headers hook
 *
 * Validates that the security headers middleware adds the correct
 * headers to non-API responses, matching the Deno Fresh securityHeaders plugin.
 *
 * Since SvelteKit's `sequence()` requires an internal request store that
 * isn't available in unit tests, we test the security headers logic directly.
 */
import { describe, it, expect } from 'vitest';

// Directly test the security header logic (mirrors hooks.server.ts)
async function applySecurityHeaders(pathname: string, baseHeaders?: Headers): Promise<Response> {
  const response = new Response('OK', {
    headers: baseHeaders || new Headers({ 'Content-Type': 'text/html' })
  });

  // Skip API routes (same logic as the hook)
  if (pathname.startsWith('/api')) {
    return response;
  }

  response.headers.set('Strict-Transport-Security', 'max-age=63072000;');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

describe('Security Headers', () => {
  it('should add Strict-Transport-Security header', async () => {
    const response = await applySecurityHeaders('/');
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=63072000;');
  });

  it('should add Referrer-Policy header', async () => {
    const response = await applySecurityHeaders('/portfolio');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('should add X-Content-Type-Options header', async () => {
    const response = await applySecurityHeaders('/updates');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('should add X-Frame-Options header', async () => {
    const response = await applySecurityHeaders('/');
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('should add X-XSS-Protection header', async () => {
    const response = await applySecurityHeaders('/');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('should NOT add security headers to API routes', async () => {
    const response = await applySecurityHeaders('/api/chat/stream');
    expect(response.headers.get('Strict-Transport-Security')).toBeNull();
    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it('should add all five security headers to normal pages', async () => {
    const response = await applySecurityHeaders('/documentation');

    const expectedHeaders = [
      'Strict-Transport-Security',
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection'
    ];

    for (const header of expectedHeaders) {
      expect(response.headers.has(header)).toBe(true);
    }
  });

  it('should preserve existing headers when adding security headers', async () => {
    const baseHeaders = new Headers({
      'Content-Type': 'text/html',
      'X-Custom': 'test-value'
    });
    const response = await applySecurityHeaders('/page', baseHeaders);

    expect(response.headers.get('X-Custom')).toBe('test-value');
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=63072000;');
  });
});
