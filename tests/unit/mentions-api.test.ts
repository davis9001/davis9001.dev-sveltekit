/**
 * Tests for /api/mentions — "who linked to this from outside?"
 *
 * The endpoint is public, so the important behaviours are that it refuses to
 * look up anything but our own posts, and that a source being down costs the
 * reader nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../src/routes/api/mentions/+server';

const POST_URL = 'https://davis9001.dev/blog/things-every-app-needs';

function call(target: string | null, requestHost = 'davis9001.dev') {
	const url = new URL(`https://${requestHost}/api/mentions`);
	if (target !== null) url.searchParams.set('url', target);
	return GET({ url } as any);
}

function hnHit(overrides: Record<string, unknown> = {}) {
	return {
		objectID: '4242',
		title: 'The List: Things I Think Every App Needs',
		url: POST_URL,
		author: 'someone',
		num_comments: 12,
		created_at: '2026-08-19T10:00:00Z',
		...overrides
	};
}

function bskyPost(text: string) {
	return {
		uri: 'at://did:plc:abc/app.bsky.feed.post/3kxyz',
		author: { handle: 'reader.bsky.social' },
		replyCount: 2,
		record: { text, createdAt: '2026-08-20T10:00:00Z' }
	};
}

/** Route each upstream host to a caller-supplied response. */
function stubUpstreams(handlers: { hn?: unknown; bsky?: unknown; fail?: string[] }) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const target = String(input);
			if ((handlers.fail ?? []).some((h) => target.includes(h))) throw new Error('network');
			if (target.includes('hn.algolia.com')) {
				return { ok: true, json: async () => handlers.hn ?? { hits: [] } } as any;
			}
			if (target.includes('bsky.app')) {
				return { ok: true, json: async () => handlers.bsky ?? { posts: [] } } as any;
			}
			return { ok: false, json: async () => ({}) } as any;
		})
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('GET /api/mentions', () => {
	it('rejects a url that is not ours, so it cannot be used as a search proxy', async () => {
		stubUpstreams({});
		const res = await call('https://example.com/someone-elses-post');

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ mentions: [], error: 'unsupported host' });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects a lookalike host that merely ends with our name', async () => {
		stubUpstreams({});
		const res = await call('https://evildavis9001.dev/blog/things-every-app-needs');

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: 'unsupported host' });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('accepts a subdomain of ours', async () => {
		stubUpstreams({
			hn: { hits: [hnHit({ url: 'https://www.davis9001.dev/blog/things-every-app-needs' })] }
		});
		const res = await call('https://www.davis9001.dev/blog/things-every-app-needs');

		expect(res.status).toBe(200);
		expect((await res.json()).mentions).toHaveLength(1);
	});

	it('accepts the apex domain even when served from another host, e.g. a preview', async () => {
		stubUpstreams({ hn: { hits: [hnHit()] } });
		const res = await call(POST_URL, 'preview.davis9001-dev.pages.dev');

		expect(res.status).toBe(200);
		expect((await res.json()).mentions).toHaveLength(1);
	});

	it('rejects a malformed url', async () => {
		stubUpstreams({});
		const res = await call('not-a-url');

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: 'invalid url' });
	});

	it('returns mentions from both sources, newest first', async () => {
		stubUpstreams({
			hn: { hits: [hnHit()] },
			bsky: { posts: [bskyPost(`Good read: ${POST_URL}`)] }
		});

		const res = await call(POST_URL);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.mentions).toHaveLength(2);
		// Bluesky post is a day newer than the HN story.
		expect(body.mentions[0].source).toBe('Bluesky');
		expect(body.mentions[0].url).toBe('https://bsky.app/profile/reader.bsky.social/post/3kxyz');
		expect(body.mentions[1]).toMatchObject({
			source: 'Hacker News',
			url: 'https://news.ycombinator.com/item?id=4242',
			count: 12
		});
	});

	it('drops hits that do not actually reference the post', async () => {
		stubUpstreams({
			hn: { hits: [hnHit({ url: 'https://example.com/unrelated', title: 'Unrelated' })] },
			bsky: { posts: [bskyPost('a post about something else entirely')] }
		});

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toHaveLength(0);
	});

	it('still answers when a source is unreachable', async () => {
		stubUpstreams({ hn: { hits: [hnHit()] }, fail: ['bsky.app'] });

		const res = await call(POST_URL);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.mentions).toHaveLength(1);
		expect(body.mentions[0].source).toBe('Hacker News');
	});

	it('is cacheable, because mentions do not change minute to minute', async () => {
		stubUpstreams({});
		const res = await call(POST_URL);

		expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
	});

	it('survives upstream payloads that are the wrong shape entirely', async () => {
		stubUpstreams({ hn: { hits: 'nope' }, bsky: { posts: null } });

		const res = await call(POST_URL);
		await expect(res.json()).resolves.toMatchObject({ mentions: [] });
		expect(res.status).toBe(200);
	});

	it('survives a source answering with an error status', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, json: async () => ({}) }) as any)
		);

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toEqual([]);
	});

	it('fills in for hits that are missing their optional fields', async () => {
		stubUpstreams({
			hn: {
				hits: [
					{ objectID: '77', url: POST_URL, title: undefined, author: null, num_comments: 'lots' }
				]
			},
			bsky: {
				posts: [
					{
						uri: 'at://did:plc:x/app.bsky.feed.post/abc',
						author: {},
						record: { text: `see ${POST_URL}` }
					}
				]
			}
		});

		const body = await (await call(POST_URL)).json();
		const hn = body.mentions.find((m: any) => m.source === 'Hacker News');
		const bsky = body.mentions.find((m: any) => m.source === 'Bluesky');

		expect(hn).toMatchObject({ title: 'Discussion' });
		expect(hn.author).toBeUndefined();
		expect(hn.count).toBeUndefined();
		expect(hn.at).toBeUndefined();
		expect(bsky.author).toBeUndefined();
		expect(bsky.count).toBeUndefined();
	});

	it('counts a bare link card as a mention even when the text does not say so', async () => {
		stubUpstreams({
			bsky: {
				posts: [
					{
						uri: 'at://did:plc:y/app.bsky.feed.post/def',
						author: { handle: 'linker.bsky.social' },
						record: { text: 'worth a read' },
						embed: { external: { uri: POST_URL } }
					}
				]
			}
		});

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toHaveLength(1);
		expect(body.mentions[0].title).toBe('worth a read');
	});

	it('matches on the slug, so a tracked or shortened link still counts', async () => {
		stubUpstreams({
			hn: {
				hits: [
					hnHit({
						url: 'https://news.example/redirect?to=things-every-app-needs',
						title: 'Reposted'
					})
				]
			}
		});

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toHaveLength(1);
		expect(body.mentions[0].title).toBe('Reposted');
	});

	it('accepts a post on the request host itself', async () => {
		stubUpstreams({ hn: { hits: [hnHit()] } });

		const res = await call('https://davis9001.dev/blog/things-every-app-needs');
		expect(res.status).toBe(200);
		expect((await res.json()).mentions).toHaveLength(1);
	});

	it('handles a url with no path segments', async () => {
		stubUpstreams({});
		const res = await call('https://davis9001.dev/');

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toMatchObject({ mentions: [] });
	});

	it('handles a Bluesky post with no uri, text or author at all', async () => {
		stubUpstreams({
			bsky: { posts: [{ embed: { external: { uri: POST_URL } } }] }
		});

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toHaveLength(1);
		// Nothing to title it with, and nothing to sort it by.
		expect(body.mentions[0]).toMatchObject({
			title: 'Post',
			url: 'https://bsky.app/profile//post/'
		});
		expect(body.mentions[0].at).toBeUndefined();
	});

	it('sorts undated mentions without dropping them', async () => {
		stubUpstreams({
			hn: { hits: [hnHit({ objectID: '1', created_at: undefined, title: 'Undated' })] },
			bsky: { posts: [bskyPost(`dated ${POST_URL}`)] }
		});

		const body = await (await call(POST_URL)).json();
		expect(body.mentions).toHaveLength(2);
		expect(body.mentions[0].source).toBe('Bluesky');
		expect(body.mentions[1].title).toBe('Undated');
	});

	it('treats a missing url parameter as invalid', async () => {
		stubUpstreams({});
		const res = await call(null);

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: 'invalid url' });
	});
});
