/**
 * Home Page - Server Load
 *
 * Loads recent blog posts for display on the home page.
 */
import { processRawPosts } from '$lib/utils/blog';
import type { PageServerLoad } from './$types';

// Load all markdown files at build time
const modules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async () => {
  const posts = processRawPosts(modules);

  // Return only metadata for the 5 most recent posts
  const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

  return {
    recentPosts
  };
};
