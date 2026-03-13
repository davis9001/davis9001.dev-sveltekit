/**
 * Home Page - Server Load
 *
 * Loads recent blog posts and cached Spotify data for display on the home page.
 * Spotify data is loaded from KV cache (shared across all users, 5-minute TTL)
 * so the page renders instantly with music data on first paint.
 */
import { processRawPosts } from '$lib/utils/blog';
import { getSpotifyCache } from '$lib/services/spotify-cache';
import type { PageServerLoad } from './$types';

// Load all markdown files at build time
const modules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async ({ platform }) => {
  const posts = processRawPosts(modules);

  // Return only metadata for the 5 most recent posts
  const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

  // Load cached Spotify data from KV for instant SSR rendering
  let spotifyData = null;
  if (platform?.env?.KV) {
    spotifyData = await getSpotifyCache(platform.env.KV);
  }

  return {
    recentPosts,
    spotifyData
  };
};
