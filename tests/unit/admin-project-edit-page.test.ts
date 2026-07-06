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
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
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

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.extraLinks).toHaveLength(1);
		expect(body.tasks).toHaveLength(1);
	});

	it('validates that name and group are present', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText(/Name/), { target: { value: '  ' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(fetchMock).not.toHaveBeenCalled();
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
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
