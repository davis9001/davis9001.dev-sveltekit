import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/mentions?url=<absolute post url>
 *
 * "Who linked to this from outside?", using only sources that are free and
 * need no key or account:
 *
 *  - Hacker News, via the Algolia search API that powers hn.algolia.com.
 *  - Bluesky, via the unauthenticated public AppView.
 *
 * Both are best-effort. A source that is down, rate-limited or has changed
 * shape contributes nothing rather than failing the request — an empty list is
 * a true answer to "no mentions found", and the outro says as much.
 *
 * Runs server-side so the browser never needs cross-origin access, and the
 * response is edge-cached: mentions do not change minute to minute.
 */

export type Mention = {
	source: 'Hacker News' | 'Bluesky';
	title: string;
	url: string;
	author?: string;
	count?: number;
	at?: string;
};

const TIMEOUT_MS = 4000;
/** Only trust results that actually reference the post. */
function referencesUrl(haystack: string, url: string, slug: string): boolean {
	const text = haystack.toLowerCase();
	return text.includes(url.toLowerCase()) || (slug.length > 8 && text.includes(slug.toLowerCase()));
}

async function fetchJson(url: string): Promise<any | null> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		const res = await fetch(url, {
			signal: controller.signal,
			headers: { accept: 'application/json', 'user-agent': 'davis9001.dev mentions' }
		});
		clearTimeout(timer);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function fromHackerNews(postUrl: string, slug: string): Promise<Mention[]> {
	const query = encodeURIComponent(postUrl.replace(/^https?:\/\//, ''));
	const data = await fetchJson(
		`https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=10`
	);
	const hits: any[] = Array.isArray(data?.hits) ? data.hits : [];

	return hits
		.filter((hit) => referencesUrl(`${hit?.url ?? ''} ${hit?.title ?? ''}`, postUrl, slug))
		.map((hit) => ({
			source: 'Hacker News' as const,
			title: String(hit.title ?? 'Discussion'),
			url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
			author: hit.author ? String(hit.author) : undefined,
			count: typeof hit.num_comments === 'number' ? hit.num_comments : undefined,
			at: hit.created_at ? String(hit.created_at) : undefined
		}));
}

async function fromBluesky(postUrl: string, slug: string): Promise<Mention[]> {
	const data = await fetchJson(
		`https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(postUrl)}&limit=10`
	);
	const posts: any[] = Array.isArray(data?.posts) ? data.posts : [];

	return posts
		.filter((post) => {
			const text = String(post?.record?.text ?? '');
			const embed = String(post?.embed?.external?.uri ?? '');
			return referencesUrl(`${text} ${embed}`, postUrl, slug);
		})
		.map((post) => {
			const handle = String(post?.author?.handle ?? '');
			const rkey =
				String(post?.uri ?? '')
					.split('/')
					.pop() ?? '';
			return {
				source: 'Bluesky' as const,
				title: String(post?.record?.text ?? '').slice(0, 140) || 'Post',
				url: `https://bsky.app/profile/${handle}/post/${rkey}`,
				author: handle ? `@${handle}` : undefined,
				count: typeof post?.replyCount === 'number' ? post.replyCount : undefined,
				at: post?.record?.createdAt ? String(post.record.createdAt) : undefined
			};
		});
}

export const GET: RequestHandler = async ({ url }) => {
	const target = url.searchParams.get('url') || '';

	// Only ever look up our own posts: this endpoint is public, and without
	// this it is an open proxy for searching arbitrary strings.
	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return json({ mentions: [], error: 'invalid url' }, { status: 400 });
	}
	if (parsed.hostname !== url.hostname && !parsed.hostname.endsWith('davis9001.dev')) {
		return json({ mentions: [], error: 'unsupported host' }, { status: 400 });
	}

	const slug = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
	const results = await Promise.allSettled([
		fromHackerNews(parsed.toString(), slug),
		fromBluesky(parsed.toString(), slug)
	]);

	const mentions = results
		.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
		.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));

	return json(
		{ mentions, checked: ['Hacker News', 'Bluesky'] },
		{ headers: { 'Cache-Control': 'public, max-age=900, s-maxage=3600' } }
	);
};
