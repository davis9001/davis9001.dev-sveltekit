import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageServerLoad } from './$types';

interface ProjectMeta {
	url?: string;
	title: string;
	summary: string;
	technologies: string[];
	latestContribution?: string;
}

interface Project {
	slug: string;
	meta: ProjectMeta;
	content: string;
}

function parseFrontmatter(markdown: string): { meta: Record<string, any>; content: string } {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = markdown.match(frontmatterRegex);

	if (!match) {
		return { meta: {}, content: markdown };
	}

	const frontmatterText = match[1];
	const content = match[2];
	const meta: Record<string, any> = {};

	// Parse YAML-like frontmatter
	const lines = frontmatterText.split('\n');
	let currentKey: string | null = null;
	let currentValue: any = null;

	for (const line of lines) {
		const keyMatch = line.match(/^(\w+):\s*(.*)$/);
		if (keyMatch) {
			// Save previous key-value
			if (currentKey) {
				meta[currentKey] = currentValue;
			}

			currentKey = keyMatch[1];
			const value = keyMatch[2].trim();

			// Check if it's an array
			if (value.startsWith('[')) {
				try {
					currentValue = JSON.parse(value);
				} catch {
					currentValue = value;
				}
			} else if (value.startsWith('"') || value.startsWith("'")) {
				currentValue = value.slice(1, -1);
			} else {
				currentValue = value;
			}
		}
	}

	// Save last key-value
	if (currentKey) {
		meta[currentKey] = currentValue;
	}

	return { meta, content };
}

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
				
				const { meta, content } = parseFrontmatter(markdown);

				return {
					slug,
					meta: {
						title: meta.title || slug,
						summary: meta.summary || '',
						url: meta.url,
						technologies: meta.technologies || [],
						latestContribution: meta.latestContribution
					},
					content
				};
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
