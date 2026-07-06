/**
 * Tests for the Admin Projects Dashboard page component (/admin/projects)
 */
import { fireEvent, render, screen, within } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../../src/routes/admin/projects/+page.svelte';

function makeProject(overrides: Record<string, any> = {}) {
	return {
		id: 'p-1',
		group: '*Space',
		name: 'Proj',
		status: 'active',
		priority: 'medium',
		description: '',
		primaryLink: null,
		githubUrl: null,
		extraLinks: [],
		tasks: [],
		blockers: '',
		sortOrder: 0,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z',
		...overrides
	};
}

const mockData: any = {
	projects: [
		makeProject({
			id: 'p-1',
			name: 'NebulaKit',
			status: 'active',
			priority: 'high',
			description: 'The CMS framework',
			primaryLink: 'https://nebulakit.starspace.group/',
			githubUrl: 'https://github.com/starspacegroup/NebulaKit',
			extraLinks: [{ label: 'Docs', href: 'https://docs.example.com' }],
			tasks: [
				{ text: 'Ship v1', done: false, status: 'planning' },
				{ text: 'Write docs', done: true, status: 'complete' }
			]
		}),
		makeProject({
			id: 'p-2',
			name: 'SpaceBot',
			status: 'blocked',
			blockers: 'Waiting on runners',
			sortOrder: 1
		}),
		makeProject({
			id: 'p-3',
			name: 'AgapeVerse',
			group: 'Personal',
			status: 'complete'
		})
	]
};

describe('Admin Projects Dashboard page', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders the heading and project names', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy();
		expect(screen.getByText('NebulaKit')).toBeTruthy();
		expect(screen.getByText('SpaceBot')).toBeTruthy();
		expect(screen.getByText('AgapeVerse')).toBeTruthy();
	});

	it('renders group sections with counts', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: /\*Space/ })).toBeTruthy();
		expect(screen.getByRole('heading', { name: /Personal/ })).toBeTruthy();
	});

	it('shows stats tiles', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('Open tasks')).toBeTruthy();
		expect(screen.getByText('Blockers')).toBeTruthy();
		// 1 open task, 1 done → 50%
		expect(screen.getByText('50%')).toBeTruthy();
	});

	it('renders tasks with checkboxes and blockers', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('Ship v1')).toBeTruthy();
		expect(screen.getByText('Write docs')).toBeTruthy();
		expect(screen.getByLabelText('Toggle task: Ship v1')).toBeTruthy();
		expect(screen.getByText(/Waiting on runners/)).toBeTruthy();
	});

	it('renders project links', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('Site')).toBeTruthy();
		expect(screen.getByText('GitHub')).toBeTruthy();
		expect(screen.getByText('Docs')).toBeTruthy();
	});

	it('links each card to its full edit page', () => {
		render(Page, { props: { data: mockData } });
		const editLink = screen.getByLabelText('Edit NebulaKit in full editor');
		expect(editLink.getAttribute('href')).toBe('/admin/projects/p-1');
	});

	it('filters projects by search', async () => {
		render(Page, { props: { data: mockData } });
		const search = screen.getByLabelText('Search projects');
		await fireEvent.input(search, { target: { value: 'nebula' } });
		expect(screen.getByText('NebulaKit')).toBeTruthy();
		expect(screen.queryByText('SpaceBot')).toBeNull();
		expect(screen.getByText('1/3 shown')).toBeTruthy();
	});

	it('shows an empty-filter state with clear option', async () => {
		render(Page, { props: { data: mockData } });
		const search = screen.getByLabelText('Search projects');
		await fireEvent.input(search, { target: { value: 'zzz-nothing' } });
		expect(screen.getByText('Nothing matches your filters')).toBeTruthy();
		await fireEvent.click(screen.getAllByText('Clear filters')[0]);
		expect(screen.getByText('NebulaKit')).toBeTruthy();
	});

	it('switches to a task board with status columns in workflow order', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));
		// Column titles exist as headings for every board status, Planning left of In Progress
		const headings = screen
			.getAllByRole('heading', { level: 3 })
			.map((h) => h.textContent?.trim() ?? '');
		expect(headings[0]).toContain('Planning');
		expect(headings[1]).toContain('In Progress');
		expect(screen.getByRole('heading', { name: /Blocked/ })).toBeTruthy();
		expect(screen.getByRole('heading', { name: /Done/ })).toBeTruthy();
		expect(screen.queryByRole('heading', { name: /Paused/ })).toBeNull();

		// Cards are TASKS tied to their projects
		const planning = screen.getByLabelText('Planning column');
		expect(within(planning).getByText('Ship v1')).toBeTruthy();
		expect(within(planning).getByText('NebulaKit')).toBeTruthy();
		const done = screen.getByLabelText('Done column');
		expect(within(done).getByText('Write docs')).toBeTruthy();

		// Task card project chip links to the project's edit page
		const chip = within(planning).getByText('NebulaKit');
		expect(chip.getAttribute('href')).toBe('/admin/projects/p-1');
	});

	it('shows task-centric stat tiles in board view that filter to one column', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		// 2 tasks total, 1 planning, 1 done
		const tiles = screen.getByRole('group', { name: 'Task statistics' });
		expect(within(tiles).getByText('Tasks')).toBeTruthy();
		expect(within(tiles).getByText('1/2 done')).toBeTruthy();

		// Clicking the Planning tile shows only that column
		await fireEvent.click(within(tiles).getByTitle('Show only the Planning column'));
		expect(screen.getByLabelText('Planning column')).toBeTruthy();
		expect(screen.queryByLabelText('Done column')).toBeNull();

		// Clicking again restores all columns
		await fireEvent.click(within(tiles).getByTitle('Show only the Planning column'));
		expect(screen.getByLabelText('Done column')).toBeTruthy();
	});

	it('drags a task card to another column to change its status', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		const card = screen.getByLabelText('Drag task: Ship v1');
		const blockedColumn = screen.getByLabelText('Blocked column');

		await fireEvent.dragStart(card);
		await fireEvent.dragOver(blockedColumn);
		await fireEvent.drop(blockedColumn);

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		expect(call).toBeTruthy();
		expect(call![1].method).toBe('PUT');
		expect(JSON.parse(call![1].body).tasks).toEqual([
			{ text: 'Ship v1', done: false, status: 'blocked' },
			{ text: 'Write docs', done: true, status: 'complete' }
		]);

		// The task card must visually move into the Blocked column (reactive columns)
		expect(within(blockedColumn).getByText('Ship v1')).toBeTruthy();
		expect(within(screen.getByLabelText('Planning column')).queryByText('Ship v1')).toBeNull();
	});

	it('dragging a task into the Done column completes it', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		const card = screen.getByLabelText('Drag task: Ship v1');
		const doneColumn = screen.getByLabelText('Done column');

		await fireEvent.dragStart(card);
		await fireEvent.drop(doneColumn);

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		expect(JSON.parse(call![1].body).tasks[0]).toEqual({
			text: 'Ship v1',
			done: true,
			status: 'complete'
		});
	});

	it('dropping a task on its own column is a no-op', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		const card = screen.getByLabelText('Drag task: Ship v1');
		const ownColumn = screen.getByLabelText('Planning column');

		await fireEvent.dragStart(card);
		await fireEvent.drop(ownColumn);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('saves a task toggle via PUT to the admin API', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByLabelText('Toggle task: Ship v1'));
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/projects/p-1',
			expect.objectContaining({ method: 'PUT' })
		);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.tasks).toEqual([
			{ text: 'Ship v1', done: true, status: 'complete' },
			{ text: 'Write docs', done: true, status: 'complete' }
		]);
	});

	it('adds a task via the inline input', async () => {
		render(Page, { props: { data: mockData } });
		const input = screen.getByLabelText('New task for SpaceBot');
		await fireEvent.input(input, { target: { value: 'New thing' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-2');
		expect(call).toBeTruthy();
		const body = JSON.parse(call![1].body);
		expect(body.tasks).toEqual([{ text: 'New thing', done: false, status: 'planning' }]);
	});

	it('quick-adds a task to a column via the board composer', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		await fireEvent.click(screen.getByLabelText('Add task to Blocked'));
		const projectSelect = screen.getByLabelText('Project for new task') as HTMLSelectElement;
		await fireEvent.change(projectSelect, { target: { value: 'p-2' } });
		const input = screen.getByLabelText('New task text for Blocked');
		await fireEvent.input(input, { target: { value: 'Unblock runners' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-2');
		expect(call).toBeTruthy();
		expect(JSON.parse(call![1].body).tasks).toEqual([
			{ text: 'Unblock runners', done: false, status: 'blocked' }
		]);

		// the new task card appears in the Blocked column (optimistic)
		expect(
			within(screen.getByLabelText('Blocked column')).getByText('Unblock runners')
		).toBeTruthy();
	});

	it('edits a task inline on its board card', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		await fireEvent.click(screen.getByLabelText('Edit task: Ship v1'));
		const input = screen.getByLabelText('Edit task text') as HTMLInputElement;
		expect(input.value).toBe('Ship v1');
		await fireEvent.input(input, { target: { value: 'Ship v2' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		expect(call).toBeTruthy();
		expect(JSON.parse(call![1].body).tasks[0]).toEqual({
			text: 'Ship v2',
			done: false,
			status: 'planning'
		});
	});

	it('removes a task from its board card', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));

		await fireEvent.click(screen.getByLabelText('Remove task: Ship v1'));

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		expect(call).toBeTruthy();
		expect(JSON.parse(call![1].body).tasks).toEqual([
			{ text: 'Write docs', done: true, status: 'complete' }
		]);
	});

	it('changes a project status via the pill select', async () => {
		render(Page, { props: { data: mockData } });
		const select = screen.getByLabelText('NebulaKit status');
		await fireEvent.change(select, { target: { value: 'paused' } });
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/p-1');
		expect(call).toBeTruthy();
		expect(JSON.parse(call![1].body).status).toBe('paused');
	});

	it('reorders with a single POST to the reorder endpoint', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByLabelText('Move NebulaKit down'));
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects/reorder');
		expect(call).toBeTruthy();
		expect(call![1].method).toBe('POST');
		const body = JSON.parse(call![1].body);
		expect(body.updates).toEqual(
			expect.arrayContaining([
				{ id: 'p-1', sortOrder: 1 },
				{ id: 'p-2', sortOrder: 0 }
			])
		);
		// exactly one network call for the whole reorder
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('opens the quick-create modal and creates via the admin API', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ project: makeProject({ id: 'p-new', name: 'Fresh' }) })
		});
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: '+ New Project' }));
		expect(screen.getByRole('dialog', { name: 'New project' })).toBeTruthy();

		const nameInput = screen.getByLabelText(/Name/);
		await fireEvent.input(nameInput, { target: { value: 'Fresh' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

		const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/projects');
		expect(call).toBeTruthy();
		expect(call![1].method).toBe('POST');
		expect(JSON.parse(call![1].body).name).toBe('Fresh');
		expect(await screen.findByText('Fresh')).toBeTruthy();
	});

	it('shows delete confirmation and deletes via the admin API', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByLabelText('Delete AgapeVerse'));
		expect(screen.getByRole('dialog', { name: 'Confirm deletion' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/projects/p-3',
			expect.objectContaining({ method: 'DELETE' })
		);
	});

	it('renders the empty state with no projects', () => {
		render(Page, { props: { data: { projects: [] } as any } });
		expect(screen.getByText('No projects yet')).toBeTruthy();
	});
});
