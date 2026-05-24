/**
 * Home Page - Server Load
 *
 * Loads recent blog posts and cached Spotify data for display on the home page.
 * Spotify data is loaded from D1 cache (shared across all users, 5-minute TTL)
 * so the page renders instantly with music data on first paint.
 */
import { processRawPosts } from '$lib/utils/blog';
import { getSpotifyCacheStale } from '$lib/services/spotify-cache';
import { getGitHubActivityCacheStale } from '$lib/services/github-activity-cache';
import type { PageServerLoad } from './$types';

// Load all markdown files at build time
const modules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async ({ platform, fetch }) => {
  const posts = processRawPosts(modules);

  // Return only metadata for the 5 most recent posts
  const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

  // Load cached Spotify data from D1 for instant SSR rendering (stale OK —
  // the widget refreshes from the API on mount to pick up any updates)
  let spotifyData = null;
  let githubActivityData = null;
  if (platform?.env?.DB) {
    [spotifyData, githubActivityData] = await Promise.all([
      getSpotifyCacheStale(platform.env.DB),
      getGitHubActivityCacheStale(platform.env.DB)
    ]);
  }

  // Fallback: if D1 cache is empty, fetch Spotify once server-side so first
  // render still has data. The API route will persist successful responses to D1.
  if (!spotifyData) {
    try {
      const response = await fetch('/api/spotify');
      if (response.ok) {
        const data = await response.json();
        if (!data?.error) {
          spotifyData = data;
        }
      }
    } catch {
      // Non-critical: keep spotifyData as null and let client-side widget load.
    }
  }

  return {
    recentPosts,
    spotifyData,
    githubActivityData
  };
};
