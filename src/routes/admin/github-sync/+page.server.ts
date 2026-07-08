import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// Owner-only, in addition to the layout's isOwner||isAdmin gate — this
	// PAT's blast radius spans any repo/board it can reach.
	if (!locals.user?.isOwner) {
		throw error(403, 'Owner access required');
	}

	try {
		const response = await fetch('/api/admin/github-sync-config');
		if (response.ok) {
			const data = await response.json();
			return { configured: data.configured, maskedToken: data.maskedToken, login: data.login };
		}
	} catch (err) {
		console.error('Failed to load GitHub sync config:', err);
	}

	return { configured: false, maskedToken: null, login: null };
};
