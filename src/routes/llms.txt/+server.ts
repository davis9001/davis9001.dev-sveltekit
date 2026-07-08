import { listPublishedBlogPosts } from '$lib/cms/blog-queries';
import { listOpenProjects } from '$lib/services/open-projects';
import { buildProject } from '$lib/utils/portfolio';
import type { RequestHandler } from './$types';

/**
 * Dynamic llms.txt — https://llmstxt.org/
 *
 * A plain-text index of the site's public surfaces for LLMs/agents, kept in
 * sync with sitemap.xml's data sources (CMS blog posts, portfolio markdown,
 * open projects) rather than hand-maintained.
 */

const SITE_URL = 'https://davis9001.dev';

const projectModules = import.meta.glob('/src/projects/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function portfolioLines(): string[] {
	return Object.entries(projectModules).map(([path, raw]) => {
		const slug = path.replace('/src/projects/', '').replace('.md', '');
		const { meta } = buildProject(slug, raw);
		return `- [${meta.title}](${SITE_URL}/portfolio/project/${slug}): ${meta.summary}`;
	});
}

export const GET: RequestHandler = async ({ platform }) => {
	const [blogPosts, projects] = await Promise.all([
		listPublishedBlogPosts(platform?.env?.DB, 20),
		platform?.env?.DB ? listOpenProjects(platform.env.DB).catch(() => []) : Promise.resolve([])
	]);

	const blogLines = blogPosts.length
		? blogPosts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.summary}`)
		: ['- No published posts yet.'];

	const projectLines = projects.length
		? projects.map(
				(p) => `- ${p.name} (${p.group}): ${p.status}${p.description ? ` — ${p.description}` : ''}`
			)
		: ['- See /api/projects for the current list.'];

	const lines = [
		'# davis9001.dev',
		'',
		'> David "davis9001" Monaghan — Software and Community Architect. Personal site with a blog, a portfolio of past work, and a live tracker of open projects.',
		'',
		'## Blog',
		...blogLines,
		'',
		'## Portfolio',
		...portfolioLines(),
		'',
		'## Open Projects',
		`- [/projects](${SITE_URL}/projects): Kanban-style tracker of active, planned, and completed projects, grouped by initiative.`,
		`- [/api/projects](${SITE_URL}/api/projects): JSON feed of the same open-project data (frozen contract).`,
		...projectLines,
		'',
		'## Optional',
		`- [/send](${SITE_URL}/send): Contact form to send David a message.`,
		`- [/resume](${SITE_URL}/resume): Resume/CV.`
	];

	return new Response(lines.join('\n') + '\n', {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
