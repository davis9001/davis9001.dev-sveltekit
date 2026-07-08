/**
 * Tests for the minimal fetch-based GitHub REST + GraphQL client ($lib/github/client)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubApiError, githubGraphQL, githubRest } from '../../src/lib/github/client';

describe('githubGraphQL', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('posts the query/variables and returns data on success', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ data: { viewer: { login: 'davis9001' } } })
		});

		const data = await githubGraphQL<{ viewer: { login: string } }>('tok', 'query {}', { a: 1 });

		expect(data).toEqual({ viewer: { login: 'davis9001' } });
		const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe('https://api.github.com/graphql');
		expect(init.headers.Authorization).toBe('Bearer tok');
		expect(JSON.parse(init.body)).toEqual({ query: 'query {}', variables: { a: 1 } });
	});

	it('throws GithubApiError on a non-2xx response', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			headers: new Headers()
		});

		await expect(githubGraphQL('bad-tok', 'query {}')).rejects.toThrow(GithubApiError);
	});

	it('includes rate-limit info in the error message when exhausted', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			headers: new Headers({ 'x-ratelimit-remaining': '0' })
		});

		await expect(githubGraphQL('tok', 'query {}')).rejects.toThrow(/rate limit exhausted/);
	});

	it('includes retry-after in the error message when present', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			headers: new Headers({ 'retry-after': '30' })
		});

		await expect(githubGraphQL('tok', 'query {}')).rejects.toThrow(/retry after 30s/);
	});

	it('throws GithubApiError when the GraphQL response carries errors[]', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ errors: [{ message: 'Field not found' }] })
		});

		await expect(githubGraphQL('tok', 'query {}')).rejects.toThrow(/Field not found/);
	});
});

describe('githubRest', () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			json: async () => ({ number: 42 })
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the method/path/body and returns parsed JSON', async () => {
		const data = await githubRest<{ number: number }>('tok', 'POST', '/repos/o/r/issues', {
			title: 'Ship it'
		});

		expect(data).toEqual({ number: 42 });
		const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/o/r/issues');
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('Bearer tok');
		expect(JSON.parse(init.body)).toEqual({ title: 'Ship it' });
	});

	it('omits a body and Content-Type header for bodyless calls', async () => {
		await githubRest('tok', 'GET', '/repos/o/r/issues/1');

		const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(init.body).toBeUndefined();
		expect(init.headers['Content-Type']).toBeUndefined();
	});

	it('throws GithubApiError on non-2xx', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 404, headers: new Headers() });

		await expect(githubRest('tok', 'GET', '/repos/o/r/issues/999')).rejects.toThrow(GithubApiError);
	});
});
