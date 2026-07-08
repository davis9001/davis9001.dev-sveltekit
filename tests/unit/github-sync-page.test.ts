/**
 * Tests for the admin GitHub Sync settings page (/admin/github-sync)
 */
import { fireEvent, render, screen } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../../src/routes/admin/github-sync/+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return { configured: false, maskedToken: null, login: null, ...overrides } as any;
}

describe('Admin GitHub Sync settings page', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows "Not configured" when no token is stored', () => {
		render(Page, { props: { data: makeData() } });

		expect(screen.getByText('Not configured')).toBeInTheDocument();
		expect(screen.queryByText('Clear token')).not.toBeInTheDocument();
	});

	it('shows the configured status, login, and masked token', () => {
		render(Page, {
			props: { data: makeData({ configured: true, maskedToken: '••••1234', login: 'davis9001' }) }
		});

		expect(screen.getByText('Configured — davis9001')).toBeInTheDocument();
		expect(screen.getByText('••••1234')).toBeInTheDocument();
		expect(screen.getByText('Clear token')).toBeInTheDocument();
	});

	it('rejects saving an empty token', async () => {
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(screen.getByRole('alert')).toHaveTextContent('Paste a token first.');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('saves a token and shows the configured state', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, login: 'davis9001' })
		});
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText('Token'), { target: { value: 'ghp_abcd1234' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/github-sync-config',
			expect.objectContaining({ method: 'PUT' })
		);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: 'ghp_abcd1234' });
		expect(await screen.findByText('Configured — davis9001')).toBeInTheDocument();
		expect(screen.getByText('Saved ✓')).toBeInTheDocument();
	});

	it('surfaces a save error from the server', async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: 'Bad token' }) });
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText('Token'), { target: { value: 'bad' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Bad token');
	});

	it('surfaces a network failure on save', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));
		render(Page, { props: { data: makeData() } });

		await fireEvent.input(screen.getByLabelText('Token'), { target: { value: 'ghp_x' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save token');
	});

	it('clears the token', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
		render(Page, {
			props: { data: makeData({ configured: true, maskedToken: '••••1234', login: 'davis9001' }) }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Clear token' }));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/github-sync-config',
			expect.objectContaining({ method: 'DELETE' })
		);
		expect(await screen.findByText('Not configured')).toBeInTheDocument();
	});

	it('surfaces a clear-token failure', async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
		render(Page, {
			props: { data: makeData({ configured: true, maskedToken: '••••1234', login: 'davis9001' }) }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Clear token' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Failed to clear token');
	});
});
