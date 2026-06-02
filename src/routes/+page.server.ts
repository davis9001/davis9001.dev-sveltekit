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

export const load: PageServerLoad = async ({ platform }) => {
  const posts = processRawPosts(modules);

  // Return only metadata for the 5 most recent posts
  const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

  // Stream non-critical widgets so first paint is never blocked by cache I/O.
  const spotifyData = platform?.env?.DB
    ? getSpotifyCacheStale(platform.env.DB).catch(() => null)
    : null;
  const githubActivityData = platform?.env?.DB
    ? getGitHubActivityCacheStale(platform.env.DB).catch(() => null)
    : null;

  return {
    recentPosts,
    spotifyData,
    githubActivityData
  };
};
