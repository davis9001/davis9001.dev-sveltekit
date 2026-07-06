/**
 * Tests for the Admin Projects Dashboard page component (/admin/projects)
 */
import { fireEvent, render, screen } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../../src/routes/admin/projects/+page.svelte';

function makeProject(overrides: Record<string, any> = {}) {
	return {
		id: 'p-1',
		slug: 'proj',
		title: 'Proj',
		itemStatus: 'published',
		group: '*Space',
		name: 'Proj',
		projectStatus: 'active',
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
		rawFields: {},
		...overrides
	};
}

const mockData: any = {
	projects: [
		makeProject({
			id: 'p-1',
			name: 'NebulaKit',
			projectStatus: 'active',
			priority: 'high',
			description: 'The CMS framework',
			primaryLink: 'https://nebulakit.starspace.group/',
			githubUrl: 'https://github.com/starspacegroup/NebulaKit',
			extraLinks: [{ label: 'Docs', href: 'https://docs.example.com' }],
			tasks: [
				{ text: 'Ship v1', done: false },
				{ text: 'Write docs', done: true }
			],
			rawFields: { group: '*Space', project_name: 'NebulaKit', status: 'active' }
		}),
		makeProject({
			id: 'p-2',
			name: 'SpaceBot',
			projectStatus: 'blocked',
			blockers: 'Waiting on runners',
			sortOrder: 1
		}),
		makeProject({
			id: 'p-3',
			name: 'AgapeVerse',
			group: 'Personal',
			projectStatus: 'complete',
			itemStatus: 'draft'
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

	it('marks draft items', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('draft')).toBeTruthy();
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

	it('switches to board view with status columns', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: 'Board' }));
		// Column titles exist as headings for every status
		expect(screen.getByRole('heading', { name: /Planning/ })).toBeTruthy();
		expect(screen.getByRole('heading', { name: /Paused/ })).toBeTruthy();
		expect(screen.getByRole('heading', { name: /Blocked/ })).toBeTruthy();
		// Cards moved to board layout
		expect(screen.getByText('NebulaKit')).toBeTruthy();
	});

	it('saves a task toggle via PUT', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByLabelText('Toggle task: Ship v1'));
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/cms/open-projects/p-1',
			expect.objectContaining({ method: 'PUT' })
		);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.fields.tasks).toEqual([
			{ text: 'Ship v1', done: true },
			{ text: 'Write docs', done: true }
		]);
	});

	it('adds a task via the inline input', async () => {
		render(Page, { props: { data: mockData } });
		const input = screen.getByLabelText('New task for SpaceBot');
		await fireEvent.input(input, { target: { value: 'New thing' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/cms/open-projects/p-2');
		expect(call).toBeTruthy();
		const body = JSON.parse(call![1].body);
		expect(body.fields.tasks).toEqual([{ text: 'New thing', done: false }]);
	});

	it('changes a project status via the pill select', async () => {
		render(Page, { props: { data: mockData } });
		const select = screen.getByLabelText('NebulaKit status');
		await fireEvent.change(select, { target: { value: 'paused' } });
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/cms/open-projects/p-1');
		expect(call).toBeTruthy();
		expect(JSON.parse(call![1].body).fields.status).toBe('paused');
	});

	it('opens the quick-create modal', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByRole('button', { name: '+ New Project' }));
		expect(screen.getByRole('dialog', { name: 'New project' })).toBeTruthy();
	});

	it('shows delete confirmation and deletes', async () => {
		render(Page, { props: { data: mockData } });
		await fireEvent.click(screen.getByLabelText('Delete AgapeVerse'));
		expect(screen.getByRole('dialog', { name: 'Confirm deletion' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/cms/open-projects/p-3',
			expect.objectContaining({ method: 'DELETE' })
		);
	});

	it('renders the empty state with no projects', () => {
		render(Page, { props: { data: { projects: [] } as any } });
		expect(screen.getByText('No projects yet')).toBeTruthy();
	});
});
