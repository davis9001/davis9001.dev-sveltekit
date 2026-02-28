import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
  error: (status: number, message: string) => {
    const err = new Error(message);
    (err as any).status = status;
    throw err;
  },
  redirect: (status: number, location: string) => {
    const err = new Error(`Redirect to ${location}`);
    (err as any).status = status;
    (err as any).location = location;
    throw err;
  },
  json: (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    })
}));

describe('Admin Spotify Authorize Route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockEvent(overrides: {
    user?: any;
    platform?: any;
    url?: string;
  } = {}) {
    return {
      locals: { user: overrides.user },
      platform: overrides.platform || {
        env: {
          KV: { get: vi.fn(), put: vi.fn() },
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret',
          SPOTIFY_REDIRECT_URI: undefined
        }
      },
      url: new URL(overrides.url || 'http://localhost:4220/admin/spotify/authorize')
    } as any;
  }

  it('should throw 403 when user is not authenticated', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({ user: undefined });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should throw 403 when user is not owner or admin', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'user', email: 'user@test.com', isOwner: false, isAdmin: false }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
  });

  it('should throw 500 when SPOTIFY_CLIENT_ID is not configured', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: { get: vi.fn(), put: vi.fn() },
          SPOTIFY_CLIENT_ID: undefined,
          SPOTIFY_CLIENT_SECRET: 'secret'
        }
      }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
  });

  it('should redirect to Spotify authorize URL for owner', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 302 });

    try {
      await GET(event);
    } catch (err: any) {
      expect(err.location).toContain('https://accounts.spotify.com/authorize');
      expect(err.location).toContain('client_id=test_client_id');
      expect(err.location).toContain('response_type=code');
      expect(err.location).toContain('user-read-currently-playing');
      expect(err.location).toContain('user-read-recently-played');
    }
  });

  it('should redirect to Spotify authorize URL for admin', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '2', login: 'admin', email: 'admin@test.com', isOwner: false, isAdmin: true }
    });

    await expect(GET(event)).rejects.toMatchObject({ status: 302 });
  });

  it('should use SPOTIFY_REDIRECT_URI when configured', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      platform: {
        env: {
          KV: { get: vi.fn(), put: vi.fn() },
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret',
          SPOTIFY_REDIRECT_URI: 'https://custom.example.com/admin/spotify/callback'
        }
      }
    });

    try {
      await GET(event);
    } catch (err: any) {
      expect(err.location).toContain(
        encodeURIComponent('https://custom.example.com/admin/spotify/callback')
      );
    }
  });

  it('should default redirect URI to origin + /admin/spotify/callback', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true },
      url: 'https://mysite.com/admin/spotify/authorize'
    });

    try {
      await GET(event);
    } catch (err: any) {
      expect(err.location).toContain(
        encodeURIComponent('https://mysite.com/admin/spotify/callback')
      );
    }
  });

  it('should include all required Spotify scopes', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true }
    });

    try {
      await GET(event);
    } catch (err: any) {
      const requiredScopes = [
        'user-read-currently-playing',
        'user-read-recently-played',
        'user-read-playback-state',
        'playlist-read-private',
        'playlist-read-collaborative'
      ];
      for (const scope of requiredScopes) {
        expect(err.location).toContain(scope);
      }
    }
  });

  it('should set show_dialog=true', async () => {
    const { GET } = await import('../../src/routes/admin/spotify/authorize/+server');
    const event = createMockEvent({
      user: { id: '1', login: 'owner', email: 'owner@test.com', isOwner: true }
    });

    try {
      await GET(event);
    } catch (err: any) {
      expect(err.location).toContain('show_dialog=true');
    }
  });
});
