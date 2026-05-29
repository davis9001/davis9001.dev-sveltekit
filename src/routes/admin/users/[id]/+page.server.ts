import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const response = await fetch(`/api/admin/users/${params.id}`);

	if (!response.ok) {
		if (response.status === 404) {
			throw error(404, 'User not found');
		}
		throw error(response.status, 'Failed to load user details');
	}

	const data = await response.json();
	return {
		user: data.user,
		oauthAccounts: data.oauthAccounts || [],
		sessions: data.sessions || [],
		activityLogs: data.activityLogs || [],
		stats: data.stats || { totalSessions: 0, totalChatMessages: 0 }
	};
};
