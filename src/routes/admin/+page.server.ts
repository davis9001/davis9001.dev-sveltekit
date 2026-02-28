import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	// Fetch OAuth configuration from KV, falling back to env vars
	let authConfig = null;
	let adminId = null;
	let adminUsername = null;
	let resetRouteDisabled = false;

	if (platform?.env?.KV) {
		try {
			// Get OAuth config from KV
			const authConfigStr = await platform.env.KV.get('auth_config:github');
			if (authConfigStr) {
				authConfig = JSON.parse(authConfigStr);
			}

			// Get admin user info from KV
			adminId = await platform.env.KV.get('github_owner_id');
			adminUsername = await platform.env.KV.get('github_owner_username');

			// Get reset route status
			resetRouteDisabled = (await platform.env.KV.get('reset_route_disabled')) === 'true';
		} catch (err) {
			console.error('Failed to fetch setup info from KV:', err);
		}
	}

	// Fall back to environment variables if KV doesn't have the values
	if (!authConfig && platform?.env?.GITHUB_CLIENT_ID && platform?.env?.GITHUB_CLIENT_SECRET) {
		authConfig = {
			provider: 'github',
			clientId: platform.env.GITHUB_CLIENT_ID
		};
	}

	if (!adminId && platform?.env?.GITHUB_OWNER_ID) {
		adminId = platform.env.GITHUB_OWNER_ID;
	}

	if (!adminUsername && platform?.env?.GITHUB_OWNER_USERNAME) {
		adminUsername = platform.env.GITHUB_OWNER_USERNAME;
	}

	return {
		setupInfo: {
			hasOAuthConfig: !!authConfig,
			oauthProvider: authConfig?.provider || null,
			oauthClientId: authConfig?.clientId || null,
			adminId: adminId || null,
			adminUsername: adminUsername || null,
			resetRouteDisabled
		}
	};
};
