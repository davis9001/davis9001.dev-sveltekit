import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Legacy blog list URL — the blog now lives in the CMS at /blog.
 */
export const load: PageServerLoad = async () => {
	throw redirect(308, '/blog');
};
