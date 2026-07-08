/**
 * Tests for GitHub Projects v2 GraphQL/REST query functions ($lib/github/queries)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	addProjectV2Item,
	createIssue,
	deleteProjectV2Item,
	fetchProjectV2Fields,
	fetchViewerLogin,
	listAvailableProjectBoards,
	listProjectItems,
	resolveProjectV2,
	updateIssue,
	updateProjectV2ItemFieldValue
} from '../../src/lib/github/queries';

function mockGraphQL(data: unknown) {
	globalThis.fetch = vi.fn().mockResolvedValue({
		ok: true,
		headers: new Headers(),
		json: async () => ({ data })
	});
}

function mockRest(json: unknown) {
	globalThis.fetch = vi.fn().mockResolvedValue({
		ok: true,
		headers: new Headers(),
		json: async () => json
	});
}

function lastRequestBody() {
	const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
	return JSON.parse(init.body);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('resolveProjectV2', () => {
	it('resolves an org-owned board and its fields, querying only organization()', async () => {
		mockGraphQL({
			organization: {
				projectV2: {
					id: 'PVT_org',
					title: 'Roadmap',
					fields: {
						nodes: [
							{
								id: 'F_status',
								name: 'Status',
								options: [{ id: 'O1', name: 'Todo' }]
							},
							{ id: 'F_title', name: 'Title' }
						]
					}
				}
			}
		});

		const result = await resolveProjectV2('tok', {
			ownerType: 'orgs',
			owner: 'starspacegroup',
			number: 3
		});

		expect(result).toEqual({
			id: 'PVT_org',
			title: 'Roadmap',
			fields: [
				{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Todo' }] },
				{ id: 'F_title', name: 'Title', options: [] }
			]
		});
		expect(lastRequestBody().variables).toEqual({ login: 'starspacegroup', number: 3 });
		expect(lastRequestBody().query).toContain('organization(login: $login)');
		expect(lastRequestBody().query).not.toContain('user(login: $login)');
	});

	it('resolves a user-owned board, querying only user()', async () => {
		mockGraphQL({
			user: { projectV2: { id: 'PVT_user', title: 'Mine', fields: { nodes: [] } } }
		});

		const result = await resolveProjectV2('tok', {
			ownerType: 'users',
			owner: 'davis9001',
			number: 5
		});

		expect(result).toEqual({ id: 'PVT_user', title: 'Mine', fields: [] });
		expect(lastRequestBody().query).toContain('user(login: $login)');
		expect(lastRequestBody().query).not.toContain('organization(login: $login)');
	});

	it('returns null when the org has no such project', async () => {
		mockGraphQL({ organization: { projectV2: null } });

		const result = await resolveProjectV2('tok', { ownerType: 'orgs', owner: 'ghost', number: 1 });

		expect(result).toBeNull();
	});

	it('returns null when the organization itself does not exist', async () => {
		mockGraphQL({ organization: null });

		const result = await resolveProjectV2('tok', { ownerType: 'orgs', owner: 'ghost', number: 1 });

		expect(result).toBeNull();
	});
});

describe('fetchProjectV2Fields', () => {
	it('re-fetches fields by node id', async () => {
		mockGraphQL({
			node: {
				fields: {
					nodes: [{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Todo' }] }]
				}
			}
		});

		const fields = await fetchProjectV2Fields('tok', 'PVT_1');

		expect(fields).toEqual([
			{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Todo' }] }
		]);
		expect(lastRequestBody().variables).toEqual({ projectId: 'PVT_1' });
	});

	it('returns an empty array when the node is missing', async () => {
		mockGraphQL({ node: null });

		expect(await fetchProjectV2Fields('tok', 'PVT_gone')).toEqual([]);
	});
});

describe('listProjectItems', () => {
	it('maps Issue-backed items with Status/Priority field values', async () => {
		mockGraphQL({
			node: {
				items: {
					pageInfo: { hasNextPage: false, endCursor: null },
					nodes: [
						{
							id: 'PVTI_1',
							fieldValues: {
								nodes: [
									{ field: { name: 'Status' }, name: 'In Progress' },
									{ field: { name: 'Priority' }, name: 'High' }
								]
							},
							content: {
								id: 'I_1',
								number: 42,
								title: 'Ship it',
								closed: false,
								updatedAt: '2026-01-01T00:00:00Z'
							}
						}
					]
				}
			}
		});

		const items = await listProjectItems('tok', 'PVT_1');

		expect(items).toEqual([
			{
				itemId: 'PVTI_1',
				issueId: 'I_1',
				issueNumber: 42,
				title: 'Ship it',
				closed: false,
				updatedAt: '2026-01-01T00:00:00Z',
				statusOptionName: 'In Progress',
				priorityOptionName: 'High'
			}
		]);
	});

	it('skips items with no linked Issue (draft issues / PRs)', async () => {
		mockGraphQL({
			node: {
				items: {
					pageInfo: { hasNextPage: false, endCursor: null },
					nodes: [{ id: 'PVTI_draft', fieldValues: { nodes: [] }, content: null }]
				}
			}
		});

		expect(await listProjectItems('tok', 'PVT_1')).toEqual([]);
	});

	it('follows pagination across multiple pages', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				headers: new Headers(),
				json: async () => ({
					data: {
						node: {
							items: {
								pageInfo: { hasNextPage: true, endCursor: 'CURSOR1' },
								nodes: [
									{
										id: 'PVTI_1',
										fieldValues: { nodes: [] },
										content: {
											id: 'I_1',
											number: 1,
											title: 'a',
											closed: false,
											updatedAt: '2026-01-01T00:00:00Z'
										}
									}
								]
							}
						}
					}
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: new Headers(),
				json: async () => ({
					data: {
						node: {
							items: {
								pageInfo: { hasNextPage: false, endCursor: null },
								nodes: [
									{
										id: 'PVTI_2',
										fieldValues: { nodes: [] },
										content: {
											id: 'I_2',
											number: 2,
											title: 'b',
											closed: false,
											updatedAt: '2026-01-01T00:00:00Z'
										}
									}
								]
							}
						}
					}
				})
			});
		globalThis.fetch = fetchMock;

		const items = await listProjectItems('tok', 'PVT_1');

		expect(items.map((i) => i.itemId)).toEqual(['PVTI_1', 'PVTI_2']);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables.after).toBe('CURSOR1');
	});

	it('returns an empty array when the project node is missing', async () => {
		mockGraphQL({ node: null });

		expect(await listProjectItems('tok', 'PVT_gone')).toEqual([]);
	});
});

describe('mutations', () => {
	it('addProjectV2Item returns the new item id', async () => {
		mockGraphQL({ addProjectV2ItemById: { item: { id: 'PVTI_new' } } });

		expect(await addProjectV2Item('tok', 'PVT_1', 'I_1')).toBe('PVTI_new');
	});

	it('updateProjectV2ItemFieldValue sends the right variables', async () => {
		mockGraphQL({ updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_1' } } });

		await updateProjectV2ItemFieldValue('tok', 'PVT_1', 'PVTI_1', 'F_status', 'O_active');

		expect(lastRequestBody().variables).toEqual({
			projectId: 'PVT_1',
			itemId: 'PVTI_1',
			fieldId: 'F_status',
			optionId: 'O_active'
		});
	});

	it('deleteProjectV2Item sends the right variables', async () => {
		mockGraphQL({ deleteProjectV2Item: { deletedItemId: 'PVTI_1' } });

		await deleteProjectV2Item('tok', 'PVT_1', 'PVTI_1');

		expect(lastRequestBody().variables).toEqual({ projectId: 'PVT_1', itemId: 'PVTI_1' });
	});
});

describe('Issue REST helpers', () => {
	it('createIssue posts a title and returns node id + number', async () => {
		mockRest({ node_id: 'I_new', number: 7 });

		const result = await createIssue('tok', 'owner', 'repo', 'Ship it');

		expect(result).toEqual({ issueId: 'I_new', issueNumber: 7 });
		const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/owner/repo/issues');
		expect(JSON.parse(init.body)).toEqual({ title: 'Ship it' });
	});

	it('updateIssue PATCHes the given fields', async () => {
		mockRest({});

		await updateIssue('tok', 'owner', 'repo', 7, { state: 'closed' });

		const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/owner/repo/issues/7');
		expect(init.method).toBe('PATCH');
		expect(JSON.parse(init.body)).toEqual({ state: 'closed' });
	});
});

describe('fetchViewerLogin', () => {
	it('returns the authenticated login', async () => {
		mockGraphQL({ viewer: { login: 'davis9001' } });

		expect(await fetchViewerLogin('tok')).toBe('davis9001');
	});
});

describe('listAvailableProjectBoards', () => {
	function mockSequence(responses: Record<string, unknown>) {
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('repository(')) {
				return { ok: true, headers: new Headers(), json: async () => ({ data: responses.repo }) };
			}
			if (body.query.includes('organizations(')) {
				return { ok: true, headers: new Headers(), json: async () => ({ data: responses.org }) };
			}
			return { ok: true, headers: new Headers(), json: async () => ({ data: responses.viewer }) };
		});
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('skips the repo query entirely when no repo is given', async () => {
		const fetchMock = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('organizations(')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { viewer: { organizations: { nodes: [] } } } })
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { viewer: { projectsV2: { nodes: [] } } } })
			};
		});
		globalThis.fetch = fetchMock;

		await listAvailableProjectBoards('tok', null);

		expect(fetchMock).toHaveBeenCalledTimes(2); // viewer + org, no repo call
	});

	it('tags boards by source: repository, viewer, and org', async () => {
		mockSequence({
			repo: {
				repository: {
					projectsV2: {
						nodes: [
							{
								id: 'PVT_repo',
								number: 1,
								title: 'Repo Board',
								url: 'https://github.com/orgs/x/projects/1'
							}
						]
					}
				}
			},
			viewer: {
				viewer: {
					projectsV2: {
						nodes: [
							{
								id: 'PVT_viewer',
								number: 2,
								title: 'My Board',
								url: 'https://github.com/users/me/projects/2'
							}
						]
					}
				}
			},
			org: {
				viewer: {
					organizations: {
						nodes: [
							{
								login: 'starspacegroup',
								projectsV2: {
									nodes: [
										{
											id: 'PVT_org',
											number: 3,
											title: 'Org Board',
											url: 'https://github.com/orgs/starspacegroup/projects/3'
										}
									]
								}
							}
						]
					}
				}
			}
		});

		const boards = await listAvailableProjectBoards('tok', {
			owner: 'starspacegroup',
			repo: 'NebulaKit'
		});

		expect(boards).toEqual([
			{
				id: 'PVT_repo',
				number: 1,
				title: 'Repo Board',
				url: 'https://github.com/orgs/x/projects/1',
				source: 'repository'
			},
			{
				id: 'PVT_viewer',
				number: 2,
				title: 'My Board',
				url: 'https://github.com/users/me/projects/2',
				source: 'viewer'
			},
			{
				id: 'PVT_org',
				number: 3,
				title: 'Org Board',
				url: 'https://github.com/orgs/starspacegroup/projects/3',
				source: 'org:starspacegroup'
			}
		]);
	});

	it('de-duplicates a board that appears in more than one source', async () => {
		const shared = {
			id: 'PVT_shared',
			number: 9,
			title: 'Shared',
			url: 'https://github.com/orgs/x/projects/9'
		};
		mockSequence({
			repo: { repository: { projectsV2: { nodes: [shared] } } },
			viewer: { viewer: { projectsV2: { nodes: [shared] } } },
			org: { viewer: { organizations: { nodes: [] } } }
		});

		const boards = await listAvailableProjectBoards('tok', { owner: 'x', repo: 'y' });

		expect(boards).toHaveLength(1);
		expect(boards[0].source).toBe('repository'); // first source wins
	});

	it('degrades gracefully when the repo query fails (e.g. repo not accessible)', async () => {
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('repository(')) {
				return { ok: false, status: 404, headers: new Headers() };
			}
			if (body.query.includes('organizations(')) {
				return {
					ok: true,
					headers: new Headers(),
					json: async () => ({ data: { viewer: { organizations: { nodes: [] } } } })
				};
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { viewer: { projectsV2: { nodes: [] } } } })
			};
		});

		const boards = await listAvailableProjectBoards('tok', { owner: 'x', repo: 'y' });

		expect(boards).toEqual([]);
	});

	it('degrades gracefully when the organizations query fails (e.g. missing read:org scope)', async () => {
		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			if (body.query.includes('organizations(')) {
				return { ok: false, status: 403, headers: new Headers() };
			}
			return {
				ok: true,
				headers: new Headers(),
				json: async () => ({ data: { viewer: { projectsV2: { nodes: [] } } } })
			};
		});

		const boards = await listAvailableProjectBoards('tok', null);

		expect(boards).toEqual([]);
	});
});
