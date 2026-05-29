import { hasAnyAuthProvider } from '$lib/utils/auth';
import { processRawPosts } from '$lib/utils/blog';
import { buildProject } from '$lib/utils/portfolio';
import type { LayoutServerLoad } from './$types';

// Load all content at build time (Vite glob import, Cloudflare Workers compatible)
const blogModules = import.meta.glob('/src/updates/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const projectModules = import.meta.glob('/src/projects/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	// Check if AI providers are enabled (inline — avoids internal HTTP round-trip on every page load)
	let hasAIProviders = false;
	try {
		if (platform?.env?.KV) {
			const keysList = await platform.env.KV.get('ai_keys_list');
			if (keysList) {
				const keyIds = JSON.parse(keysList) as string[];
				for (const keyId of keyIds) {
					const keyData = await platform.env.KV.get(`ai_key:${keyId}`);
					if (keyData) {
						const key = JSON.parse(keyData) as { enabled?: boolean };
						if (key.enabled !== false) {
							hasAIProviders = true;
							break;
						}
					}
				}
			}
		}
	} catch (error) {
		console.error('Failed to check AI provider status:', error);
	}

	// Check if any auth provider is configured (env vars or /setup KV)
	const hasAuthConfig = await hasAnyAuthProvider(platform);

	// Load portfolio project metadata for command palette search
	const portfolioItems = Object.entries(projectModules).map(([path, raw]) => {
		const slug = path.replace('/src/projects/', '').replace('.md', '');
		const project = buildProject(slug, raw);
		return { slug: project.slug, title: project.meta.title, summary: project.meta.summary };
	});

	// Load blog post metadata for command palette search
	const blogPosts = processRawPosts(blogModules).map((post) => ({
		slug: post.slug,
		title: post.title,
		summary: post.summary
	}));

	return {
		user: locals.user || null,
		hasAIProviders,
		hasAuthConfig,
		portfolioItems,
		blogPosts
	};
};
