import { hasAnyAuthProvider } from '$lib/utils/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, fetch, platform }) => {
	// Check if AI providers are enabled
	let hasAIProviders = false;
	try {
		const response = await fetch('/api/admin/ai-keys/status');
		if (response.ok) {
			const data = await response.json();
			hasAIProviders = data.hasProviders || false;
		}
	} catch (error) {
		console.error('Failed to check AI provider status:', error);
	}

	// Check if any auth provider is configured (env vars or /setup KV)
	const hasAuthConfig = await hasAnyAuthProvider(platform);

	return {
		user: locals.user || null,
		hasAIProviders,
		hasAuthConfig
	};
};
