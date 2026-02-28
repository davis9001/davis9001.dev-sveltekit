import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import { buildProject } from '$lib/utils/portfolio';
import type { Project, ProjectMeta } from '$lib/utils/portfolio';

export { type Project, type ProjectMeta };

export const load: PageServerLoad = async () => {
	const projectsDir = join(process.cwd(), 'src', 'projects');

	try {
		const files = await readdir(projectsDir);
		const mdFiles = files.filter(f => f.endsWith('.md'));

		const projects: Project[] = await Promise.all(
			mdFiles.map(async (file) => {
				const slug = file.replace('.md', '');
				const filePath = join(projectsDir, file);
				const markdown = await readFile(filePath, 'utf-8');
				return buildProject(slug, markdown);
			})
		);

		// Sort by latest contribution date (newest first)
		projects.sort((a, b) => {
			if (!a.meta.latestContribution) return 1;
			if (!b.meta.latestContribution) return -1;
			return new Date(b.meta.latestContribution).getTime() - new Date(a.meta.latestContribution).getTime();
		});

		return { projects };
	} catch (error) {
		console.error('Error loading projects:', error);
		return { projects: [] };
	}
};
