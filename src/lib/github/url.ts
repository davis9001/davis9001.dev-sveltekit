/**
 * Pure URL parsing for GitHub Projects v2 boards and repos.
 * No fetch/DB — fully unit-testable in isolation.
 */

export interface ParsedProjectUrl {
	ownerType: 'orgs' | 'users';
	owner: string;
	number: number;
}

export interface ParsedRepoUrl {
	owner: string;
	repo: string;
}

const PROJECT_URL_PATTERN = /^https?:\/\/github\.com\/(orgs|users)\/([^/]+)\/projects\/(\d+)\/?$/i;
const REPO_URL_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i;

/** Parse a GitHub Projects v2 URL, e.g. https://github.com/orgs/starspacegroup/projects/3 */
export function parseProjectUrl(url: string): ParsedProjectUrl | null {
	const match = PROJECT_URL_PATTERN.exec(url.trim());
	if (!match) return null;

	const [, ownerType, owner, number] = match;
	return { ownerType: ownerType.toLowerCase() as 'orgs' | 'users', owner, number: Number(number) };
}

/** Parse a GitHub repo URL, e.g. https://github.com/starspacegroup/NebulaKit */
export function parseRepoUrl(url: string): ParsedRepoUrl | null {
	const match = REPO_URL_PATTERN.exec(url.trim());
	if (!match) return null;

	const [, owner, repo] = match;
	return { owner, repo };
}
