/**
 * Blog List Page - Server Load
 *
 * Loads all blog posts from markdown files in src/updates/ at build time.
 * Uses import.meta.glob for Cloudflare Workers compatibility.
 */
import { processRawPosts } from '$lib/utils/blog';
import type { PageServerLoad } from './$types';

// Load all markdown files at build time (Vite glob import)
const modules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async () => {
  const posts = processRawPosts(modules);

  // Return only metadata (not full content) for the list page
  const postMetas = posts.map(({ content, ...meta }) => meta);

  return {
    posts: postMetas
  };
};
