import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BLOG_CACHE_TTL_MS,
	clearBlogPostCache,
	getCachedBlogPosts
} from '../../src/lib/cms/blog-queries';

function db(seconds: number | null) {
	const d: any = {
		prepare: vi.fn().mockReturnThis(),
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({ results: [] }),
		first: vi.fn().mockResolvedValue(seconds === null ? null : { seconds })
	};
	return d;
}

describe('blog menu cache and scheduled posts', () => {
	beforeEach(() => clearBlogPostCache());

	it('expires at the next scheduled post, not a full minute later', async () => {
		const d = db(10);
		let clock = 1_000_000;
		await getCachedBlogPosts(d, () => clock);
		clock += 5_000;
		await getCachedBlogPosts(d, () => clock);
		expect(d.all).toHaveBeenCalledTimes(1);
		clock += 7_000; // 12s in: past the go-live (10s + 1s)
		await getCachedBlogPosts(d, () => clock);
		expect(d.all).toHaveBeenCalledTimes(2);
	});

	it('keeps the normal minute when nothing is scheduled', async () => {
		const d = db(null);
		let clock = 1_000_000;
		await getCachedBlogPosts(d, () => clock);
		clock += BLOG_CACHE_TTL_MS - 1;
		await getCachedBlogPosts(d, () => clock);
		expect(d.all).toHaveBeenCalledTimes(1);
		clock += 2;
		await getCachedBlogPosts(d, () => clock);
		expect(d.all).toHaveBeenCalledTimes(2);
	});
});
