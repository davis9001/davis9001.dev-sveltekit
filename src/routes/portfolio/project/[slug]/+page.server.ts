import { readFile } from 'fs/promises';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildProject } from '$lib/utils/portfolio';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const filePath = join(process.cwd(), 'src', 'projects', `${slug}.md`);

	try {
		const markdown = await readFile(filePath, 'utf-8');
		return { project: buildProject(slug, markdown) };
	} catch (err) {
		throw error(404, `Project "${slug}" not found`);
	}
};
