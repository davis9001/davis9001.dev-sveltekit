import type { RequestHandler } from './$types';

/**
 * Dynamic sitemap.xml generator.
 *
 * Includes all public static routes plus dynamically discovered
 * blog post slugs from the /src/updates/ markdown files and
 * portfolio project slugs from /src/projects/.
 */

const SITE_URL = 'https://davis9001.dev';

// Static public routes
const staticRoutes = [
  '/',
  '/portfolio',
  '/updates',
  '/privacy',
  '/terms'
];

// Import all blog post markdown files to extract slugs
const blogModules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// Import all portfolio project markdown files to extract slugs
const projectModules = import.meta.glob('/src/projects/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function extractSlugs(modules: Record<string, string>): string[] {
  return Object.keys(modules).map((path) => {
    const filename = path.split('/').pop() || '';
    return filename.replace(/\.md$/, '');
  });
}

export const GET: RequestHandler = async () => {
  const blogSlugs = extractSlugs(blogModules);
  const projectSlugs = extractSlugs(projectModules);

  const urls = [
    ...staticRoutes.map((route) => `${SITE_URL}${route}`),
    ...blogSlugs.map((slug) => `${SITE_URL}/update/${slug}`),
    ...projectSlugs.map((slug) => `${SITE_URL}/portfolio/project/${slug}`)
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  });
};
