import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpotifyWidget from '../../src/lib/components/SpotifyWidget.svelte';

// Helper factory for SpotifyData objects
function makeSpotifyData(overrides: Record<string, unknown> = {}) {
  return {
    currentlyPlaying: null,
    recentlyPlayed: [],
    topPlaylists: [],
    profileUrl: 'https://open.spotify.com/user/12810003',
    ...overrides
  };
}

function makeTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    name: 'Test Song',
    artists: [
      {
        name: 'Test Artist',
        external_urls: { spotify: 'https://spotify.com/artist/1' }
      }
    ],
    album: {
      name: 'Test Album',
      images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
      external_urls: { spotify: 'https://spotify.com/album/1' }
    },
    external_urls: { spotify: 'https://spotify.com/track/1' },
    duration_ms: 240000,
    ...overrides
  };
}

describe('SpotifyWidget', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -- Static / Loading Tests (no initialData prop) --

  it('should render loading state initially when no initialData', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );
    render(SpotifyWidget);
    expect(screen.getByText('Loading Spotify data...')).toBeInTheDocument();
  });

  it('should render the Spotify heading with link', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );
    render(SpotifyWidget);
    const link = screen.getByRole('link', { name: /spotify/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should render the Spotify SVG icon', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );
    const { container } = render(SpotifyWidget);
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  // -- Rendering Tests (using initialData prop) --

  it('should skip loading state when initialData is provided', () => {
    render(SpotifyWidget, {
      props: { initialData: makeSpotifyData() }
    });
    expect(screen.queryByText('Loading Spotify data...')).not.toBeInTheDocument();
  });

  it('should render error state when data has error property', () => {
    render(SpotifyWidget, {
      props: {
        initialData: makeSpotifyData({ error: 'Unable to authenticate with Spotify' })
      }
    });
    expect(screen.getByText(/unable to load spotify data/i)).toBeInTheDocument();
  });

  it('should render currently playing track when active', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack(),
        progress_ms: 120000,
        context: null
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('should render recently played tracks', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({
            id: '2',
            name: 'Recent Track',
            artists: [
              {
                name: 'Recent Artist',
                external_urls: { spotify: 'https://spotify.com/artist/2' }
              }
            ],
            album: {
              name: 'Recent Album',
              images: [
                { url: 'https://example.com/large.jpg', height: 640, width: 640 },
                { url: 'https://example.com/medium.jpg', height: 300, width: 300 },
                { url: 'https://example.com/small.jpg', height: 64, width: 64 }
              ],
              external_urls: { spotify: 'https://spotify.com/album/2' }
            }
          }),
          playedAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('Recently Played')).toBeInTheDocument();
    expect(screen.getByText('Recent Track')).toBeInTheDocument();
    expect(screen.getByText('Recent Artist')).toBeInTheDocument();
  });

  it('should render top playlists', () => {
    const data = makeSpotifyData({
      topPlaylists: [
        {
          id: 'p1',
          name: 'My Top Playlist',
          description: 'Great music collection',
          imageUrl: 'https://example.com/playlist.jpg',
          url: 'https://open.spotify.com/playlist/p1',
          trackCount: 42,
          followers: 100,
          totalDurationMs: 7200000
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('My Top 3 Most Saved Playlists')).toBeInTheDocument();
    expect(screen.getByText('My Top Playlist')).toBeInTheDocument();
    expect(screen.getByText('Great music collection')).toBeInTheDocument();
  });

  it('should render "no recent activity" when nothing is available', () => {
    const data = makeSpotifyData({
      currentlyPlaying: { isPlaying: false, track: null, progress_ms: 0, context: null }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });

  it('should render context information for currently playing track', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack({ name: 'Context Song' }),
        progress_ms: 60000,
        context: {
          type: 'playlist',
          name: 'My Playlist',
          url: 'https://open.spotify.com/playlist/abc'
        }
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('My Playlist')).toBeInTheDocument();
    expect(screen.getByText(/from playlist/i)).toBeInTheDocument();
  });

  it('should render playlist without image using fallback icon', () => {
    const data = makeSpotifyData({
      topPlaylists: [
        {
          id: 'p2',
          name: 'No Image Playlist',
          description: '',
          imageUrl: null,
          url: 'https://open.spotify.com/playlist/p2',
          trackCount: 10,
          followers: 5,
          totalDurationMs: 3600000
        }
      ]
    });
    const { container } = render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('No Image Playlist')).toBeInTheDocument();
    // Should have fallback music icon (SVG inside the placeholder div)
    const fallbackDiv = container.querySelector('.bg-foreground\\/10');
    expect(fallbackDiv).toBeInTheDocument();
  });

  it('should render multiple recently played tracks (up to 5)', () => {
    const tracks = Array.from({ length: 7 }, (_, i) => ({
      track: makeTrack({
        id: `t${i}`,
        name: `Track ${i}`,
        artists: [
          {
            name: `Artist ${i}`,
            external_urls: { spotify: `https://spotify.com/artist/${i}` }
          }
        ],
        album: {
          name: `Album ${i}`,
          images: [
            { url: `https://example.com/large${i}.jpg`, height: 640, width: 640 },
            { url: `https://example.com/medium${i}.jpg`, height: 300, width: 300 },
            { url: `https://example.com/small${i}.jpg`, height: 64, width: 64 }
          ],
          external_urls: { spotify: `https://spotify.com/album/${i}` }
        }
      }),
      playedAt: new Date(Date.now() - (i + 1) * 3600000).toISOString()
    }));

    const data = makeSpotifyData({ recentlyPlayed: tracks });
    render(SpotifyWidget, { props: { initialData: data } });

    // Should show first 5 tracks
    expect(screen.getByText('Track 0')).toBeInTheDocument();
    expect(screen.getByText('Track 4')).toBeInTheDocument();
    // Should NOT show 6th and 7th tracks
    expect(screen.queryByText('Track 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Track 6')).not.toBeInTheDocument();
  });

  it('should display playlist duration in hours and minutes', () => {
    const data = makeSpotifyData({
      topPlaylists: [
        {
          id: 'p3',
          name: 'Duration Playlist',
          description: '',
          imageUrl: 'https://example.com/img.jpg',
          url: 'https://open.spotify.com/playlist/p3',
          trackCount: 20,
          followers: 50,
          totalDurationMs: 5400000 // 1.5 hours
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    // 5400000ms = 1.5h = "1 hr 30 min"
    expect(screen.getByText(/1 hr 30 min/)).toBeInTheDocument();
    expect(screen.getByText(/50 saves/)).toBeInTheDocument();
    expect(screen.getByText(/20 songs/)).toBeInTheDocument();
  });

  it('should render album art with correct src for currently playing', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack(),
        progress_ms: 0,
        context: null
      }
    });
    const { container } = render(SpotifyWidget, { props: { initialData: data } });

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg');
  });

  it('should use default profile URL when not provided', () => {
    render(SpotifyWidget, {
      props: { initialData: makeSpotifyData({ profileUrl: undefined }) }
    });
    const link = screen.getByRole('link', { name: /spotify/i });
    expect(link).toHaveAttribute(
      'href',
      'https://open.spotify.com/user/12810003?si=7ba6ee05f9cb4e96'
    );
  });

  it('should use custom profile URL from data', () => {
    render(SpotifyWidget, {
      props: {
        initialData: makeSpotifyData({
          profileUrl: 'https://open.spotify.com/user/custom123'
        })
      }
    });
    const link = screen.getByRole('link', { name: /spotify/i });
    expect(link).toHaveAttribute('href', 'https://open.spotify.com/user/custom123');
  });

  // -- Additional Rendering Edge Cases --

  it('should render context without URL as plain text', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack({ name: 'No URL Context Song' }),
        progress_ms: 60000,
        context: {
          type: 'album',
          name: 'My Album Context',
          url: '' // empty URL
        }
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('My Album Context')).toBeInTheDocument();
    expect(screen.getByText(/from album/i)).toBeInTheDocument();
  });

  it('should render multiple artists comma-separated in currently playing', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack({
          artists: [
            {
              name: 'Artist A',
              external_urls: { spotify: 'https://spotify.com/artist/a' }
            },
            {
              name: 'Artist B',
              external_urls: { spotify: 'https://spotify.com/artist/b' }
            }
          ]
        }),
        progress_ms: 0,
        context: null
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText('Artist B')).toBeInTheDocument();
  });

  it('should render recently played track album art from third image', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({
            id: 'rp1',
            name: 'Album Art Track',
            album: {
              name: 'Art Album',
              images: [
                { url: 'https://example.com/large.jpg', height: 640, width: 640 },
                { url: 'https://example.com/medium.jpg', height: 300, width: 300 },
                { url: 'https://example.com/small.jpg', height: 64, width: 64 }
              ],
              external_urls: { spotify: 'https://spotify.com/album/rp1' }
            }
          }),
          playedAt: new Date(Date.now() - 300000).toISOString() // 5 min ago
        }
      ]
    });
    const { container } = render(SpotifyWidget, { props: { initialData: data } });

    const imgs = container.querySelectorAll('img');
    // Recently played uses index [2] for the small image
    const found = Array.from(imgs).some(
      (img) => img.getAttribute('src') === 'https://example.com/small.jpg'
    );
    expect(found).toBe(true);
  });

  it('should show "just now" for very recently played tracks', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({ id: 'recent1', name: 'Just Now Track' }),
          playedAt: new Date().toISOString()
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('should show minutes ago for recently played tracks', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({ id: 'min1', name: 'Minutes Ago Track' }),
          playedAt: new Date(Date.now() - 15 * 60000).toISOString() // 15 min ago
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('15m ago')).toBeInTheDocument();
  });

  it('should show hours ago for older recently played tracks', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({ id: 'hr1', name: 'Hours Ago Track' }),
          playedAt: new Date(Date.now() - 3 * 3600000).toISOString() // 3 hours ago
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('should show days ago for very old recently played tracks', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({ id: 'day1', name: 'Days Ago Track' }),
          playedAt: new Date(Date.now() - 2 * 86400000).toISOString() // 2 days ago
        }
      ]
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });

  it('should not show "No recent activity" when tracks are playing', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: true,
        track: makeTrack(),
        progress_ms: 100,
        context: null
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.queryByText(/no recent activity/i)).not.toBeInTheDocument();
  });

  it('should not show currentlyPlaying section when isPlaying is false', () => {
    const data = makeSpotifyData({
      currentlyPlaying: {
        isPlaying: false,
        track: makeTrack(),
        progress_ms: 100,
        context: null
      }
    });
    render(SpotifyWidget, { props: { initialData: data } });

    expect(screen.queryByText('Now Playing')).not.toBeInTheDocument();
  });

  it('should render cached data immediately without loading state when initialData is provided', () => {
    const data = makeSpotifyData({
      recentlyPlayed: [
        {
          track: makeTrack({ id: 'cached1', name: 'Cached Track' }),
          playedAt: new Date().toISOString()
        }
      ]
    });
    // Stub fetch for any background refresh attempt
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );

    render(SpotifyWidget, { props: { initialData: data } });

    // Cached data should be visible immediately — no loading spinner
    expect(screen.queryByText('Loading Spotify data...')).not.toBeInTheDocument();
    expect(screen.getByText('Cached Track')).toBeInTheDocument();
    expect(screen.getByText('Recently Played')).toBeInTheDocument();
  });

  it('should not show loading state while refreshing with initialData', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );

    const { container } = render(SpotifyWidget, {
      props: {
        initialData: makeSpotifyData({
          recentlyPlayed: [
            {
              track: makeTrack({ id: 'cached1', name: 'Cached Track' }),
              playedAt: new Date().toISOString()
            }
          ]
        })
      }
    });

    // Cached data should be visible immediately, no loading spinner
    expect(screen.queryByText('Loading Spotify data...')).not.toBeInTheDocument();
    expect(screen.getByText('Cached Track')).toBeInTheDocument();
  });

  it('should show a refresh indicator while background revalidation is in-flight', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => { }))
    );

    const { container } = render(SpotifyWidget, {
      props: {
        initialData: makeSpotifyData({
          recentlyPlayed: [
            {
              track: makeTrack({ id: 'cached-spinner', name: 'Cached Spinner Track' }),
              playedAt: new Date().toISOString()
            }
          ]
        })
      }
    });

    expect(screen.getByText('Cached Spinner Track')).toBeInTheDocument();
    expect(container.querySelector('.spotify-revalidate-spinner')).toBeInTheDocument();
  });

});
