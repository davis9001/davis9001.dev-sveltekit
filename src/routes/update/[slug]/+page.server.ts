import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Legacy blog post URL — the blog now lives in the CMS at /blog/[slug].
 */
export const load: PageServerLoad = async ({ params }) => {
	throw redirect(308, `/blog/${params.slug}`);
};
