/**
 * GitHub Projects v2 GraphQL queries/mutations + the REST Issue calls,
 * wrapped as typed functions over $lib/github/client. Kept separate from
 * project-sync.ts so the diff/reconcile engine stays free of query-shape
 * noise and is easy to unit test with a mocked module.
 */

import { githubGraphQL, githubRest } from './client';
import type { ParsedProjectUrl } from './url';

export interface DiscoveredFieldOption {
	id: string;
	name: string;
}

export interface DiscoveredField {
	id: string;
	name: string;
	options: DiscoveredFieldOption[];
}

export interface ResolvedProject {
	id: string;
	title: string;
	fields: DiscoveredField[];
}

interface RawProjectV2 {
	id: string;
	title: string;
	fields: {
		nodes: Array<{
			id: string;
			name: string;
			options?: DiscoveredFieldOption[];
		}>;
	};
}

const PROJECT_FIELDS_FRAGMENT = `
	id
	title
	fields(first: 50) {
		nodes {
			... on ProjectV2SingleSelectField { id name options { id name } }
			... on ProjectV2FieldCommon { id name }
		}
	}
`;

// The URL already tells us whether this is an org or user board (github.com/orgs/... vs
// .../users/...) — querying both in one request and treating whichever doesn't match as
// null does NOT work: GitHub returns a NOT_FOUND *error* for the mismatched field, not just
// a null value, which the client treats as fatal. Two type-specific queries avoid that.
const ORG_PROJECT_FIELDS_QUERY = `
	query($login: String!, $number: Int!) {
		organization(login: $login) {
			projectV2(number: $number) { ${PROJECT_FIELDS_FRAGMENT} }
		}
	}
`;

const USER_PROJECT_FIELDS_QUERY = `
	query($login: String!, $number: Int!) {
		user(login: $login) {
			projectV2(number: $number) { ${PROJECT_FIELDS_FRAGMENT} }
		}
	}
`;

/** Resolve a Projects v2 board (org- or user-owned) and discover its fields. Fresh every call. */
export async function resolveProjectV2(
	token: string,
	parsed: ParsedProjectUrl
): Promise<ResolvedProject | null> {
	const raw =
		parsed.ownerType === 'orgs'
			? (
					await githubGraphQL<{ organization: { projectV2: RawProjectV2 | null } | null }>(
						token,
						ORG_PROJECT_FIELDS_QUERY,
						{ login: parsed.owner, number: parsed.number }
					)
				).organization?.projectV2
			: (
					await githubGraphQL<{ user: { projectV2: RawProjectV2 | null } | null }>(
						token,
						USER_PROJECT_FIELDS_QUERY,
						{ login: parsed.owner, number: parsed.number }
					)
				).user?.projectV2;

	if (!raw) return null;

	return {
		id: raw.id,
		title: raw.title,
		fields: raw.fields.nodes.map((f) => ({ id: f.id, name: f.name, options: f.options ?? [] }))
	};
}

const PROJECT_FIELDS_BY_ID_QUERY = `
	query($projectId: ID!) {
		node(id: $projectId) {
			... on ProjectV2 {
				fields(first: 50) {
					nodes {
						... on ProjectV2SingleSelectField { id name options { id name } }
						... on ProjectV2FieldCommon { id name }
					}
				}
			}
		}
	}
`;

interface ProjectFieldsByIdResponse {
	node: {
		fields: { nodes: Array<{ id: string; name: string; options?: DiscoveredFieldOption[] }> };
	} | null;
}

/**
 * Re-fetch a board's current fields by its already-resolved node id — the
 * fast path used on every push/pull (field discovery is never cached, per
 * design). Unlike resolveProjectV2 (link-time only), this needs no
 * owner/number guess since we already hold the node id.
 */
export async function fetchProjectV2Fields(
	token: string,
	projectId: string
): Promise<DiscoveredField[]> {
	const data = await githubGraphQL<ProjectFieldsByIdResponse>(token, PROJECT_FIELDS_BY_ID_QUERY, {
		projectId
	});
	if (!data.node) return [];
	return data.node.fields.nodes.map((f) => ({ id: f.id, name: f.name, options: f.options ?? [] }));
}

export interface RemoteItem {
	itemId: string;
	issueId: string;
	issueNumber: number;
	title: string;
	closed: boolean;
	updatedAt: string;
	statusOptionName: string | null;
	priorityOptionName: string | null;
}

interface ProjectItemsResponse {
	node: {
		items: {
			pageInfo: { hasNextPage: boolean; endCursor: string | null };
			nodes: RawProjectItem[];
		};
	} | null;
}

interface RawProjectItem {
	id: string;
	fieldValues: {
		nodes: Array<{ field?: { name: string }; name?: string }>;
	};
	content: {
		id: string;
		number: number;
		title: string;
		closed: boolean;
		updatedAt: string;
	} | null;
}

const PROJECT_ITEMS_QUERY = `
	query($projectId: ID!, $after: String) {
		node(id: $projectId) {
			... on ProjectV2 {
				items(first: 100, after: $after) {
					pageInfo { hasNextPage endCursor }
					nodes {
						id
						fieldValues(first: 20) {
							nodes {
								... on ProjectV2ItemFieldSingleSelectValue {
									field { ... on ProjectV2FieldCommon { name } }
									name
								}
							}
						}
						content {
							... on Issue { id number title closed updatedAt }
						}
					}
				}
			}
		}
	}
`;

/** List every item on a board, following pagination, resolving only Issue-backed items. */
export async function listProjectItems(token: string, projectId: string): Promise<RemoteItem[]> {
	const items: RemoteItem[] = [];
	let after: string | null = null;

	do {
		const data: ProjectItemsResponse = await githubGraphQL<ProjectItemsResponse>(
			token,
			PROJECT_ITEMS_QUERY,
			{ projectId, after }
		);
		const page = data.node?.items;
		if (!page) break;

		for (const node of page.nodes) {
			if (!node.content) continue; // draft issues / PRs not backed by an Issue — out of scope
			const statusValue = node.fieldValues.nodes.find((v) => v.field?.name === 'Status');
			const priorityValue = node.fieldValues.nodes.find((v) => v.field?.name === 'Priority');
			items.push({
				itemId: node.id,
				issueId: node.content.id,
				issueNumber: node.content.number,
				title: node.content.title,
				closed: node.content.closed,
				updatedAt: node.content.updatedAt,
				statusOptionName: statusValue?.name ?? null,
				priorityOptionName: priorityValue?.name ?? null
			});
		}

		after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
	} while (after);

	return items;
}

const ADD_ITEM_MUTATION = `
	mutation($projectId: ID!, $contentId: ID!) {
		addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
			item { id }
		}
	}
`;

/** Add an existing Issue to a board, returning the new ProjectV2Item id */
export async function addProjectV2Item(
	token: string,
	projectId: string,
	contentId: string
): Promise<string> {
	const data = await githubGraphQL<{ addProjectV2ItemById: { item: { id: string } } }>(
		token,
		ADD_ITEM_MUTATION,
		{ projectId, contentId }
	);
	return data.addProjectV2ItemById.item.id;
}

const UPDATE_FIELD_VALUE_MUTATION = `
	mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
		updateProjectV2ItemFieldValue(input: {
			projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
			value: { singleSelectOptionId: $optionId }
		}) {
			projectV2Item { id }
		}
	}
`;

/** Set a single-select field value (Status or Priority) on a board item */
export async function updateProjectV2ItemFieldValue(
	token: string,
	projectId: string,
	itemId: string,
	fieldId: string,
	optionId: string
): Promise<void> {
	await githubGraphQL(token, UPDATE_FIELD_VALUE_MUTATION, { projectId, itemId, fieldId, optionId });
}

const DELETE_ITEM_MUTATION = `
	mutation($projectId: ID!, $itemId: ID!) {
		deleteProjectV2Item(input: { projectId: $projectId, itemId: $itemId }) { deletedItemId }
	}
`;

/** Remove an item from a board (does not delete the underlying Issue) */
export async function deleteProjectV2Item(
	token: string,
	projectId: string,
	itemId: string
): Promise<void> {
	await githubGraphQL(token, DELETE_ITEM_MUTATION, { projectId, itemId });
}

interface CreatedIssue {
	node_id: string;
	number: number;
}

/** Create an Issue in a repo, returning its node id and number */
export async function createIssue(
	token: string,
	owner: string,
	repo: string,
	title: string
): Promise<{ issueId: string; issueNumber: number }> {
	const created = await githubRest<CreatedIssue>(token, 'POST', `/repos/${owner}/${repo}/issues`, {
		title
	});
	return { issueId: created.node_id, issueNumber: created.number };
}

/** Update an Issue's title and/or open/closed state */
export async function updateIssue(
	token: string,
	owner: string,
	repo: string,
	issueNumber: number,
	patch: { title?: string; state?: 'open' | 'closed' }
): Promise<void> {
	await githubRest(token, 'PATCH', `/repos/${owner}/${repo}/issues/${issueNumber}`, patch);
}

const VIEWER_QUERY = `query { viewer { login } }`;

/** Cheap call to validate a token before saving it (used by the settings page) */
export async function fetchViewerLogin(token: string): Promise<string> {
	const data = await githubGraphQL<{ viewer: { login: string } }>(token, VIEWER_QUERY);
	return data.viewer.login;
}

export interface AvailableBoard {
	id: string;
	number: number;
	title: string;
	url: string;
	/** 'repository' | 'viewer' | `org:<login>` — lets the UI group/label results */
	source: string;
}

interface RawBoardNode {
	id: string;
	number: number;
	title: string;
	url: string;
}

const VIEWER_BOARDS_QUERY = `
	query {
		viewer {
			projectsV2(first: 25) { nodes { id number title url } }
		}
	}
`;

const REPO_BOARDS_QUERY = `
	query($owner: String!, $repo: String!) {
		repository(owner: $owner, name: $repo) {
			projectsV2(first: 25) { nodes { id number title url } }
		}
	}
`;

const ORG_BOARDS_QUERY = `
	query {
		viewer {
			organizations(first: 25) {
				nodes {
					login
					projectsV2(first: 25) { nodes { id number title url } }
				}
			}
		}
	}
`;

/**
 * Discover Projects v2 boards the token can see: boards already linked to
 * the project's repo (if given), the viewer's own boards, and — best effort,
 * since it needs the read:org scope which is optional — boards in orgs the
 * viewer belongs to. Never throws: a failing org lookup just omits org
 * boards rather than failing the whole picker.
 */
export async function listAvailableProjectBoards(
	token: string,
	repo: { owner: string; repo: string } | null
): Promise<AvailableBoard[]> {
	const boards: AvailableBoard[] = [];

	if (repo) {
		try {
			const repoData = await githubGraphQL<{
				repository: { projectsV2: { nodes: RawBoardNode[] } } | null;
			}>(token, REPO_BOARDS_QUERY, { owner: repo.owner, repo: repo.repo });
			for (const n of repoData.repository?.projectsV2.nodes ?? []) {
				boards.push({ ...n, source: 'repository' });
			}
		} catch {
			// Repo may not exist/be accessible with this token — degrade gracefully.
		}
	}

	const viewerData = await githubGraphQL<{ viewer: { projectsV2: { nodes: RawBoardNode[] } } }>(
		token,
		VIEWER_BOARDS_QUERY
	);
	for (const n of viewerData.viewer.projectsV2.nodes) {
		boards.push({ ...n, source: 'viewer' });
	}

	try {
		const orgData = await githubGraphQL<{
			viewer: {
				organizations: { nodes: { login: string; projectsV2: { nodes: RawBoardNode[] } }[] };
			};
		}>(token, ORG_BOARDS_QUERY);
		for (const org of orgData.viewer.organizations.nodes) {
			for (const n of org.projectsV2.nodes) {
				boards.push({ ...n, source: `org:${org.login}` });
			}
		}
	} catch {
		// Missing read:org scope or similar — org boards are a bonus, not required.
	}

	const seen = new Set<string>();
	return boards.filter((b) => {
		if (seen.has(b.id)) return false;
		seen.add(b.id);
		return true;
	});
}
