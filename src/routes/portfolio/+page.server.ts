/**
 * Portfolio List Page - Server Load
 *
 * Loads all project markdown files from src/projects/ at build time.
 * Uses import.meta.glob for Cloudflare Workers compatibility (no fs/promises).
 */
import type { PageServerLoad } from './$types';
import { buildProject } from '$lib/utils/portfolio';
import type { Project, ProjectMeta } from '$lib/utils/portfolio';

export { type Project, type ProjectMeta };

// Load all project markdown files at build time (Vite glob import)
const modules = import.meta.glob('/src/projects/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const load: PageServerLoad = async () => {
	const projects: Project[] = Object.entries(modules).map(([path, raw]) => {
		const slug = path.replace('/src/projects/', '').replace('.md', '');
		return buildProject(slug, raw);
	});

	// Sort by latest contribution date (newest first)
	projects.sort((a, b) => {
		if (!a.meta.latestContribution) return 1;
		if (!b.meta.latestContribution) return -1;
		return new Date(b.meta.latestContribution).getTime() - new Date(a.meta.latestContribution).getTime();
	});

	return { projects };
};
