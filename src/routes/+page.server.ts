/**
 * Home Page - Server Load
 *
 * Loads recent blog posts and cached Spotify data for display on the home page.
 * Spotify data is loaded from D1 cache (shared across all users, 5-minute TTL)
 * so the page renders instantly with music data on first paint.
 */
import { listPublishedBlogPosts } from '$lib/cms/blog-queries';
import { getSpotifyCacheStale } from '$lib/services/spotify-cache';
import { getGitHubActivityCacheStale } from '$lib/services/github-activity-cache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	// The 5 most recent published posts from the CMS
	const recentPosts = await listPublishedBlogPosts(platform?.env?.DB, 5);

	// Stream non-critical widgets so first paint is never blocked by cache I/O.
	const spotifyData = platform?.env?.DB
		? getSpotifyCacheStale(platform.env.DB).catch(() => null)
		: null;
	const githubActivityData = platform?.env?.DB
		? getGitHubActivityCacheStale(platform.env.DB).catch(() => null)
		: null;

	return {
		recentPosts,
		spotifyData,
		githubActivityData
	};
};
