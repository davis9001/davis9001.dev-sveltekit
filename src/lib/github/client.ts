/**
 * Minimal fetch-based GitHub REST + GraphQL client.
 *
 * No @octokit/* — none is installed, and every existing GitHub call in this
 * repo (src/routes/api/github-activity/+server.ts) already uses raw fetch,
 * so this matches convention and keeps bundle size down.
 */

const USER_AGENT = 'davis9001.dev/1.0';
const GRAPHQL_URL = 'https://api.github.com/graphql';
const REST_BASE = 'https://api.github.com';

export class GithubApiError extends Error {
	status: number;
	errors?: unknown[];

	constructor(message: string, status: number, errors?: unknown[]) {
		super(message);
		this.name = 'GithubApiError';
		this.status = status;
		this.errors = errors;
	}
}

function rateLimitSuffix(headers: Headers): string {
	const remaining = headers.get('x-ratelimit-remaining');
	const retryAfter = headers.get('retry-after');
	if (retryAfter) return ` (retry after ${retryAfter}s)`;
	if (remaining === '0') return ' (rate limit exhausted)';
	return '';
}

/** POST a GraphQL query/mutation, throwing GithubApiError on transport or GraphQL-level errors */
export async function githubGraphQL<T>(
	token: string,
	query: string,
	variables: Record<string, unknown> = {}
): Promise<T> {
	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'User-Agent': USER_AGENT
		},
		body: JSON.stringify({ query, variables })
	});

	if (!res.ok) {
		throw new GithubApiError(
			`GitHub GraphQL request failed: ${res.status}${rateLimitSuffix(res.headers)}`,
			res.status
		);
	}

	const body = (await res.json()) as { data?: T; errors?: unknown[] };
	if (body.errors && body.errors.length > 0) {
		throw new GithubApiError(
			`GitHub GraphQL returned errors: ${JSON.stringify(body.errors)}`,
			res.status,
			body.errors
		);
	}

	return body.data as T;
}

/** Call a GitHub REST endpoint, throwing GithubApiError on non-2xx */
export async function githubRest<T>(
	token: string,
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const res = await fetch(`${REST_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'User-Agent': USER_AGENT,
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});

	if (!res.ok) {
		throw new GithubApiError(
			`GitHub REST request failed: ${method} ${path} → ${res.status}${rateLimitSuffix(res.headers)}`,
			res.status
		);
	}

	return (await res.json()) as T;
}
