/**
 * Blog Utilities
 *
 * Functions for parsing markdown blog posts with YAML frontmatter,
 * sorting, and formatting. Blog posts are stored as markdown files
 * in src/updates/ and loaded at build time via import.meta.glob.
 */

/** Metadata extracted from blog post frontmatter */
export interface BlogPostMeta {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  description?: string;
  tags: string[];
}

/** A full blog post with parsed content */
export interface BlogPost extends BlogPostMeta {
  content: string;
}

/** Result from parsing frontmatter */
export interface FrontmatterResult {
  meta: BlogPostMeta;
  content: string;
}

/**
 * Parse YAML frontmatter from a markdown string.
 *
 * Handles:
 * - Simple key: value pairs
 * - Quoted string values
 * - Inline arrays [val1, val2]
 * - Multiline arrays
 * - ISO date strings
 */
export function parseFrontmatter(markdown: string): FrontmatterResult {
  const defaultMeta: BlogPostMeta = {
    slug: '',
    title: '',
    publishedAt: '',
    summary: '',
    tags: []
  };

  const trimmed = markdown.trim();

  // Check for frontmatter delimiters
  if (!trimmed.startsWith('---')) {
    return {
      meta: defaultMeta,
      content: trimmed
    };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return {
      meta: defaultMeta,
      content: trimmed
    };
  }

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3).trim();

  const meta: BlogPostMeta = { ...defaultMeta };
  const lines = frontmatterBlock.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line || !line.includes(':')) continue;

    const colonIndex = line.indexOf(':');
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Handle multiline arrays
    if (key === 'tags' && value.startsWith('[') && !value.endsWith(']')) {
      // Collect lines until we find the closing bracket
      let arrayContent = value;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        i++;
        arrayContent += ' ' + nextLine;
        if (nextLine.endsWith(']')) break;
      }
      value = arrayContent;
    }

    // Parse the value based on key
    switch (key) {
      case 'title':
        meta.title = stripQuotes(value);
        break;
      case 'publishedAt':
        meta.publishedAt = stripQuotes(value);
        break;
      case 'summary':
        meta.summary = stripQuotes(value);
        break;
      case 'description':
        meta.description = stripQuotes(value);
        break;
      case 'tags':
        meta.tags = parseArrayValue(value);
        break;
    }
  }

  return { meta, content };
}

/**
 * Strip surrounding quotes from a string value.
 */
function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse a YAML-style array value like [val1, val2, val3].
 */
function parseArrayValue(value: string): string[] {
  // Remove brackets
  const inner = value.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];

  return inner
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter((item) => item.length > 0);
}

/**
 * Sort blog post metadata by date in descending order (newest first).
 * Does not mutate the original array.
 */
export function sortPostsByDate<T extends BlogPostMeta>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Format a date string for display in blog posts.
 * Returns format like "January 28, 2025".
 */
export function formatBlogDate(dateStr: string): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Estimate reading time in minutes based on word count.
 * Assumes ~200 words per minute reading speed.
 * Returns at least 1 minute.
 */
export function getReadingTime(content: string): number {
  const words = content.split(/\s+/).filter((w) => w.length > 0).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

/**
 * Load all blog posts from the updates directory.
 * Uses import.meta.glob for build-time loading (Cloudflare Workers compatible).
 *
 * This function is meant to be called from SvelteKit load functions.
 * The actual glob import happens in the route's +page.server.ts.
 */
export function processRawPosts(
  modules: Record<string, string>,
  basePath: string = '/src/updates/'
): BlogPost[] {
  const posts: BlogPost[] = [];

  for (const [path, raw] of Object.entries(modules)) {
    const slug = path.replace(basePath, '').replace('.md', '');
    const { meta, content } = parseFrontmatter(raw);

    posts.push({
      ...meta,
      slug,
      content
    });
  }

  return sortPostsByDate(posts);
}
