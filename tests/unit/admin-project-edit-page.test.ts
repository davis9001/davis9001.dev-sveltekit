/**
 * Tests for the Admin Project Edit page component (/admin/projects/[id])
 */
import { fireEvent, render, screen } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gotoMock = vi.hoisted(() => vi.fn());
vi.mock('$app/navigation', () => ({ goto: gotoMock }));

import Page from '../../src/routes/admin/projects/[id]/+page.svelte';

function makeData(projectOverrides: Record<string, any> = {}) {
	return {
		project: {
			id: 'p-1',
			group: '*Space',
			name: 'NebulaKit',
			status: 'active',
			priority: 'high',
			description: 'The framework',
			primaryLink: 'https://nebulakit.example',
			githubUrl: null,
			extraLinks: [{ label: 'Docs', href: 'https://docs.example' }],
			tasks: [{ text: 'Ship', done: false }],
			blockers: 'Waiting',
			sortOrder: 2,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-02T00:00:00Z',
			githubProjectUrl: null,
			githubProjectId: null,
			githubSyncEnabled: false,
			githubLastSyncedAt: null,
			githubLastSyncError: null,
			githubPriorityFieldFound: false,
			...projectOverrides
		},
		groups: ['*Space', 'Personal']
	} as any;
}

describe('Admin Project Edit page', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal('fetch', fetchMock);
		gotoMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders every field pre-populated', () => {
		render(Page, { props: { data: makeData() } });

		expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe('NebulaKit');
		expect((screen.getByLabelText(/Group/) as HTMLInputElement).value).toBe('*Space');
		expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('active');
		expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('high');
		expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toContain(
			'The framework'
		);
		expect((screen.getByLabelText('Primary link') as HTMLInputElement).value).toBe(
			'https://nebulakit.example'
		);
		expect((screen.getByLabelText('Sort order') as HTMLInputElement).value).toBe('2');
		expect((screen.getByLabelText('Extra link 1 label') as HTMLInputElement).value).toBe('Docs');
		expect((screen.getByLabelText('Task 1 text') as HTMLInputElement).value).toBe('Ship');
		expect((screen.getByLabelText(/Blockers/) as HTMLTextAreaElement).value).toContain('Waiting');
	});

	it('saves the full field set via PUT', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText(/Name/), { target: { value: 'Renamed' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/projects/p-1',
			expect.objectContaining({ method: 'PUT' })
		);
		const putCall = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		const body = JSON.parse(putCall![1].body);
		expect(body.name).toBe('Renamed');
		expect(body.group).toBe('*Space');
		expect(body.extraLinks).toEqual([{ label: 'Docs', href: 'https://docs.example' }]);
		expect(body.tasks).toEqual([{ text: 'Ship', done: false }]);
		expect(body.sortOrder).toBe(2);
		expect(await screen.findByText('Saved ✓')).toBeTruthy();
	});

	it('drops empty extra links and tasks on save', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByText('+ Add link'));
		await fireEvent.click(screen.getByText('+ Add task'));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		const putCall = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		const body = JSON.parse(putCall![1].body);
		expect(body.extraLinks).toHaveLength(1);
		expect(body.tasks).toHaveLength(1);
	});

	it('validates that name and group are present', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText(/Name/), { target: { value: '  ' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1')).toBeUndefined();
		expect(screen.getByRole('alert').textContent).toContain('required');
	});

	it('shows the API error message on failed save', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			json: async () => ({ message: 'Invalid status' })
		});
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect((await screen.findByRole('alert')).textContent).toContain('Invalid status');
	});

	it('renders per-task status selects and includes status changes in the save payload', async () => {
		render(Page, {
			props: {
				data: makeData({ tasks: [{ text: 'Ship', done: false, status: 'active' }] })
			}
		});

		const statusSelect = screen.getByLabelText('Task 1 status') as HTMLSelectElement;
		expect(statusSelect.value).toBe('active');

		await fireEvent.change(statusSelect, { target: { value: 'complete' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		const putCall = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		const body = JSON.parse(putCall![1].body);
		expect(body.tasks).toEqual([{ text: 'Ship', done: true, status: 'complete' }]);
	});

	it('adds and removes task rows', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByText('+ Add task'));
		expect(screen.getByLabelText('Task 2 text')).toBeTruthy();

		await fireEvent.click(screen.getByLabelText('Remove task 1'));
		expect(screen.queryByLabelText('Task 2 text')).toBeNull();
	});

	it('deletes after confirmation and navigates back', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(screen.getByRole('dialog', { name: 'Confirm deletion' })).toBeTruthy();

		const dialogDelete = screen
			.getAllByRole('button', { name: /Delete/ })
			.find((b) => b.closest('[role="dialog"]'));
		await fireEvent.click(dialogDelete!);

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/projects/p-1',
			expect.objectContaining({ method: 'DELETE' })
		);
		expect(gotoMock).toHaveBeenCalledWith('/admin/projects');
	});

	it('cancels delete confirmation', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1')).toBeUndefined();
	});

	describe('GitHub Sync section', () => {
		it('shows a link form when the project is not linked', () => {
			render(Page, { props: { data: makeData() } });

			expect(screen.getByLabelText('GitHub Projects board URL')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
		});

		it('fetches available boards on mount and offers them in a picker', async () => {
			fetchMock.mockImplementation(async (url: string) => {
				if (url === '/api/admin/projects/p-1/github/boards') {
					return {
						ok: true,
						json: async () => ({
							boards: [
								{
									id: 'PVT_1',
									number: 1,
									title: 'Roadmap',
									url: 'https://github.com/orgs/starspacegroup/projects/1',
									source: 'repository'
								},
								{
									id: 'PVT_2',
									number: 2,
									title: 'Mine',
									url: 'https://github.com/users/davis9001/projects/2',
									source: 'viewer'
								}
							]
						})
					};
				}
				return { ok: true, json: async () => ({}) };
			});
			render(Page, { props: { data: makeData() } });

			expect(await screen.findByLabelText('Select a GitHub Projects board')).toBeInTheDocument();
			expect(screen.getByText('This repo — Roadmap (#1)')).toBeInTheDocument();
			expect(screen.getByText('Your boards — Mine (#2)')).toBeInTheDocument();
			// The manual fallback stays available too.
			expect(screen.getByLabelText('GitHub Projects board URL')).toBeInTheDocument();
		});

		it('links the board selected from the picker', async () => {
			fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
				if (url === '/api/admin/projects/p-1/github/boards') {
					return {
						ok: true,
						json: async () => ({
							boards: [
								{
									id: 'PVT_1',
									number: 1,
									title: 'Roadmap',
									url: 'https://github.com/orgs/starspacegroup/projects/1',
									source: 'repository'
								}
							]
						})
					};
				}
				if (url === '/api/admin/projects/p-1/github/link') {
					return {
						ok: true,
						json: async () => ({
							project: {
								githubProjectId: 'PVT_1',
								githubSyncEnabled: true,
								githubPriorityFieldFound: true,
								githubLastSyncError: null
							},
							fieldsFound: { status: true, priority: true }
						})
					};
				}
				return { ok: true, json: async () => ({}) };
			});
			render(Page, { props: { data: makeData() } });

			const select = (await screen.findByLabelText(
				'Select a GitHub Projects board'
			)) as HTMLSelectElement;
			await fireEvent.change(select, {
				target: { value: 'https://github.com/orgs/starspacegroup/projects/1' }
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Link selected board' }));

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/projects/p-1/github/link',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ projectUrl: 'https://github.com/orgs/starspacegroup/projects/1' })
				})
			);
			expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
		});

		it('shows a note and keeps the manual fallback when board discovery fails', async () => {
			fetchMock.mockImplementation(async (url: string) => {
				if (url === '/api/admin/projects/p-1/github/boards') {
					return { ok: false, json: async () => ({ message: 'No token configured' }) };
				}
				return { ok: true, json: async () => ({}) };
			});
			render(Page, { props: { data: makeData() } });

			expect(await screen.findByText('No token configured')).toBeInTheDocument();
			expect(screen.getByLabelText('GitHub Projects board URL')).toBeInTheDocument();
			expect(screen.queryByLabelText('Select a GitHub Projects board')).not.toBeInTheDocument();
		});

		it('rejects linking with an empty URL', async () => {
			render(Page, { props: { data: makeData() } });

			await fireEvent.click(screen.getByRole('button', { name: 'Link' }));

			expect(screen.getByRole('alert')).toHaveTextContent(
				'Paste a GitHub Projects board URL first.'
			);
			expect(
				fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1/github/link')
			).toBeUndefined();
		});

		it('links successfully and switches to the linked view', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: async () => ({
					project: {
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true,
						githubPriorityFieldFound: true,
						githubLastSyncError: null
					},
					fieldsFound: { status: true, priority: true }
				})
			});
			render(Page, { props: { data: makeData() } });

			await fireEvent.input(screen.getByLabelText('GitHub Projects board URL'), {
				target: { value: 'https://github.com/orgs/starspacegroup/projects/3' }
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Link' }));

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/projects/p-1/github/link',
				expect.objectContaining({ method: 'POST' })
			);
			expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
		});

		it('warns when linking succeeds but no Status field was found', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: async () => ({
					project: {
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true,
						githubPriorityFieldFound: false,
						githubLastSyncError: null
					},
					fieldsFound: { status: false, priority: false }
				})
			});
			render(Page, { props: { data: makeData() } });

			await fireEvent.input(screen.getByLabelText('GitHub Projects board URL'), {
				target: { value: 'https://github.com/orgs/starspacegroup/projects/3' }
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Link' }));

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'no "Status" field was found on that board'
			);
		});

		it('surfaces a link failure from the server', async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				json: async () => ({ message: 'Board not found' })
			});
			render(Page, { props: { data: makeData() } });

			await fireEvent.input(screen.getByLabelText('GitHub Projects board URL'), {
				target: { value: 'https://github.com/orgs/starspacegroup/projects/3' }
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Link' }));

			expect(await screen.findByRole('alert')).toHaveTextContent('Board not found');
		});

		it('shows linked status, last-synced time, and a "no Priority field" note', () => {
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true,
						githubLastSyncedAt: '2026-01-05T00:00:00Z',
						githubPriorityFieldFound: false
					})
				}
			});

			expect(
				screen.getByText('https://github.com/orgs/starspacegroup/projects/3')
			).toBeInTheDocument();
			expect(screen.getByText(/no "Priority" field found/)).toBeInTheDocument();
			expect(screen.getByText(/Last synced/)).toBeInTheDocument();
		});

		it('shows a persisted sync error', () => {
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true,
						githubLastSyncError: 'GitHub API request failed: 401'
					})
				}
			});

			expect(screen.getByRole('alert')).toHaveTextContent('GitHub API request failed: 401');
		});

		it('syncs now and shows the returned summary', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: async () => ({
					project: {
						tasks: [{ text: 'Ship', done: false, status: 'planning', priority: 'medium' }],
						githubLastSyncedAt: '2026-01-06T00:00:00Z',
						githubLastSyncError: null,
						githubPriorityFieldFound: true
					},
					summary: { appended: 2, unlinked: 1, conflicts: [{ text: 'x', resolution: 'remote' }] }
				})
			});
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true
					})
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/projects/p-1/github/sync',
				expect.objectContaining({ method: 'POST' })
			);
			expect(
				await screen.findByText('2 new, 1 unlinked, 1 conflicts resolved')
			).toBeInTheDocument();
		});

		it('surfaces a sync failure from the server', async () => {
			fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: 'Sync boomed' }) });
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true
					})
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));

			expect(await screen.findByRole('alert')).toHaveTextContent('Sync boomed');
		});

		it('unlinks and reverts to the link form', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: async () => ({ project: { tasks: [{ text: 'Ship', done: false }] } })
			});
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true
					})
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/projects/p-1/github/unlink',
				expect.objectContaining({ method: 'POST' })
			);
			expect(await screen.findByLabelText('GitHub Projects board URL')).toBeInTheDocument();
		});

		it('surfaces an unlink failure from the server', async () => {
			fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
			render(Page, {
				props: {
					data: makeData({
						githubProjectUrl: 'https://github.com/orgs/starspacegroup/projects/3',
						githubProjectId: 'PVT_1',
						githubSyncEnabled: true
					})
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));

			expect(await screen.findByRole('alert')).toHaveTextContent('Failed to unlink GitHub board');
		});

		it('shows a GitHub issue link on a task with a linked issue number', () => {
			render(Page, {
				props: {
					data: makeData({
						githubUrl: 'https://github.com/starspacegroup/NebulaKit',
						tasks: [
							{
								text: 'Ship',
								done: false,
								status: 'planning',
								priority: 'medium',
								githubIssueNumber: 42
							}
						]
					})
				}
			});

			const link = screen.getByRole('link', { name: 'View issue #42 on GitHub' });
			expect(link).toHaveAttribute('href', 'https://github.com/starspacegroup/NebulaKit/issues/42');
		});

		it('does not show an issue link when the task has no githubIssueNumber', () => {
			render(Page, { props: { data: makeData() } });

			expect(screen.queryByRole('link', { name: /View issue/ })).not.toBeInTheDocument();
		});
	});
});
