import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const homePath = `${base}/`;

	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(302, '/auth/login?error=unauthorized');
	}

	// Check if user is the OAuth app owner or an admin
	if (!locals.user.isOwner && !locals.user.isAdmin) {
		throw redirect(302, `${homePath}?error=forbidden`);
	}

	return {
		user: locals.user
	};
};
