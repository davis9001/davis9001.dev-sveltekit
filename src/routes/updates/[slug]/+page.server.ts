/**
 * Legacy blog detail route redirect.
 *
 * Redirects old /updates/[slug] URLs to /update/[slug].
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  throw redirect(308, `/update/${params.slug}`);
};
