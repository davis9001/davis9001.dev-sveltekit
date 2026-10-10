import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { LayoutServerLoad } from './$types';
import {
	canManageStatsConnection,
	canViewStats as computeCanViewStats
} from '$lib/server/stats-guard';

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
		user: locals.user,
		// Whether the Stats page shows numbers. The page load checks this too.
		canViewStats: computeCanViewStats(locals.user),
		// Drives the owner-only Google Analytics nav entry.
		canManageAnalytics: canManageStatsConnection(locals.user)
	};
};
