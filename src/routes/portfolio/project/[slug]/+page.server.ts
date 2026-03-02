/**
 * Portfolio Project Detail Page - Server Load
 *
 * Loads a single project by slug from markdown files.
 * Uses import.meta.glob for Cloudflare Workers compatibility (no fs/promises).
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildProject } from '$lib/utils/portfolio';

// Load all project markdown files at build time (Vite glob import)
const modules = import.meta.glob('/src/projects/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params;
  const key = `/src/projects/${slug}.md`;
  const raw = modules[key];

  if (!raw) {
    throw error(404, `Project "${slug}" not found`);
  }

  return { project: buildProject(slug, raw) };
};
