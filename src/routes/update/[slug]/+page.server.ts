/**
 * Blog Post Detail Page - Server Load
 *
 * Loads a single blog post by slug from markdown files.
 * Renders markdown content to HTML using marked.
 */
import { processRawPosts } from '$lib/utils/blog';
import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Load all markdown files at build time
const modules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async ({ params }) => {
  const posts = processRawPosts(modules);
  const post = posts.find((p) => p.slug === params.slug);

  if (!post) {
    throw error(404, 'Post not found');
  }

  // Render markdown to HTML
  const htmlContent = await marked(post.content, {
    gfm: true,
    breaks: false
  });

  return {
    post: {
      ...post,
      content: htmlContent
    }
  };
};