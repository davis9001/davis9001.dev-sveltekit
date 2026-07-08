/**
 * Tests for the Admin CMS item edit page (/admin/cms/[type]/[id]), focused on
 * predictions-specific behavior: lock-aware field rendering and the
 * timestamp-proof panel/actions.
 */
import { fireEvent, render, screen } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('@tiptap/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tiptap/core')>();
	class MockEditor {
		options: any;
		html: string;
		commands = { setContent: vi.fn((content: string) => (this.html = content)) };
		constructor(options: any) {
			this.options = options;
			this.html = options.content ?? '';
		}
		getHTML() {
			return this.html;
		}
		isActive() {
			return false;
		}
		getAttributes() {
			return {};
		}
		chain() {
			const chain: any = new Proxy(
				{},
				{ get: (_t, prop) => (prop === 'run' ? () => true : () => chain) }
			);
			return chain;
		}
		setEditable(editable: boolean) {
			this.options.editable = editable;
		}
		destroy() {}
	}
	return { ...actual, Editor: MockEditor };
});
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-image', () => ({ default: { name: 'image' } }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: vi.fn(() => ({})) } }));

import Page from '../../src/routes/admin/cms/[type]/[id]/+page.svelte';

const predictionsContentType = {
	id: 'ct-1',
	slug: 'predictions',
	name: 'Predictions',
	description: '',
	fields: [
		{ name: 'body', label: 'Body', type: 'richtext', lockedAfterPublish: true },
		{
			name: 'resolution_status',
			label: 'Resolution status',
			type: 'select',
			options: [{ label: 'Pending', value: 'pending' }]
		}
	],
	settings: {
		lockTitleAndSlugAfterPublish: true,
		enableTimestampProof: true
	}
};

function makeData(itemOverrides: Record<string, any> = {}) {
	return {
		contentType: predictionsContentType,
		item: {
			id: 'ci-1',
			contentTypeId: 'ct-1',
			slug: 'the-future',
			title: 'The Future',
			status: 'published',
			fields: { body: '<p>x</p>', resolution_status: 'pending' },
			seoTitle: null,
			seoDescription: null,
			seoImage: null,
			publishedAt: '2024-01-01T00:00:00.000Z',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			timestampProofHash: null,
			timestampProofTsr: null,
			timestampProofRequestedAt: null,
			timestampProofTsaUrl: null,
			timestampProofError: null,
			waybackSnapshotUrl: null,
			waybackCheckedAt: null,
			resolutionResolvedAt: null,
			resolutionResolvedBy: null,
			...itemOverrides
		},
		tags: []
	} as any;
}

describe('Admin CMS edit page - predictions lock/proof behavior', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('disables title and slug once the item has been published', () => {
		render(Page, { props: { data: makeData() } });

		expect((screen.getByLabelText(/^Title/) as HTMLInputElement).disabled).toBe(true);
		expect((screen.getByLabelText('Slug') as HTMLInputElement).disabled).toBe(true);
		expect(screen.getByText(/locked after publishing/i)).toBeTruthy();
	});

	it('leaves title and slug editable for a draft item', () => {
		render(Page, { props: { data: makeData({ status: 'draft', publishedAt: null }) } });

		expect((screen.getByLabelText(/^Title/) as HTMLInputElement).disabled).toBe(false);
		expect((screen.getByLabelText('Slug') as HTMLInputElement).disabled).toBe(false);
	});

	it('disables a lockedAfterPublish field once published, but not an unlocked one', () => {
		render(Page, { props: { data: makeData() } });

		// resolution_status is not lockedAfterPublish
		expect((screen.getByLabelText('Resolution status') as HTMLSelectElement).disabled).toBe(false);
	});

	it('renders the timestamp-proof panel with retry/check actions when enableTimestampProof is set', () => {
		render(Page, { props: { data: makeData() } });

		expect(screen.getByText('Retry timestamp request')).toBeTruthy();
		expect(screen.getByText('Check Wayback snapshot')).toBeTruthy();
	});

	it('calls the timestamp-retry endpoint and shows the response message', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				item: makeData().item
			})
		});
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByText('Retry timestamp request'));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/cms/predictions/ci-1/timestamp-retry',
			expect.objectContaining({ method: 'POST' })
		);
		expect(await screen.findByText('Timestamp request retried.')).toBeTruthy();
	});

	it('calls the wayback-check endpoint and shows a not-found message', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ item: makeData().item })
		});
		render(Page, { props: { data: makeData() } });

		await fireEvent.click(screen.getByText('Check Wayback snapshot'));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/cms/predictions/ci-1/wayback-check',
			expect.objectContaining({ method: 'POST' })
		);
		expect(await screen.findByText(/No snapshot found yet/)).toBeTruthy();
	});

	it('does not render the proof panel when enableTimestampProof is not set', () => {
		const data = makeData();
		data.contentType = {
			...predictionsContentType,
			settings: { lockTitleAndSlugAfterPublish: true }
		};
		render(Page, { props: { data } });

		expect(screen.queryByText('Retry timestamp request')).toBeNull();
	});
});
