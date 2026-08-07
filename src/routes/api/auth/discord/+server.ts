import { issueOAuthState } from '$lib/server/oauth-state';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - Redirect to Discord OAuth
export const GET: RequestHandler = async ({ platform, url, cookies }) => {
	let clientId = platform?.env?.DISCORD_CLIENT_ID;

	// Try to fetch from KV if environment variable not set
	if (!clientId && platform?.env?.KV) {
		try {
			const stored = await platform.env.KV.get('auth_config:discord');
			if (stored) {
				const config = JSON.parse(stored);
				clientId = config.clientId;
			}
		} catch (err) {
			console.error('Failed to fetch from KV:', err);
		}
	}

	// Check if Discord OAuth is configured
	if (!clientId) {
		throw redirect(302, '/setup?error=oauth_not_configured');
	}

	// CSRF protection: the callback compares this against the cookie below.
	const state = issueOAuthState(cookies, 'discord', url.protocol === 'https:');

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${url.origin}/api/auth/discord/callback`,
		response_type: 'code',
		scope: 'identify email',
		state
	});

	throw redirect(302, `https://discord.com/api/oauth2/authorize?${params}`);
};
