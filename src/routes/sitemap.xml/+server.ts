import { listPublishedBlogPosts } from '$lib/cms/blog-queries';
import type { RequestHandler } from './$types';

/**
 * Dynamic sitemap.xml generator.
 *
 * Includes all public static routes, published blog posts from the CMS
 * (D1), and portfolio project slugs from /src/projects/ markdown files.
 */

const SITE_URL = 'https://davis9001.dev';

// Static public routes
const staticRoutes = ['/', '/portfolio', '/blog', '/privacy', '/terms'];

// Import all portfolio project markdown files to extract slugs
const projectModules = import.meta.glob('/src/projects/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function extractSlugs(modules: Record<string, string>): string[] {
	return Object.keys(modules).map((path) => {
		const filename = path.split('/').pop() || '';
		return filename.replace(/\.md$/, '');
	});
}

export const GET: RequestHandler = async ({ platform }) => {
	const blogPosts = await listPublishedBlogPosts(platform?.env?.DB, 500);
	const projectSlugs = extractSlugs(projectModules);

	const urls = [
		...staticRoutes.map((route) => `${SITE_URL}${route}`),
		...blogPosts.map((post) => `${SITE_URL}/blog/${post.slug}`),
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
