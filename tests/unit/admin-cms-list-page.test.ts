/**
 * Tests for the Admin CMS list page (/admin/cms/[type]), focused on the
 * predictions delete-block: a published item of a content type with
 * enableTimestampProof must have its delete button disabled in the UI,
 * not just rejected by the API after the fact.
 */
import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import Page from '../../src/routes/admin/cms/[type]/+page.svelte';

const predictionsContentType = {
	id: 'ct-1',
	slug: 'predictions',
	name: 'Predictions',
	description: '',
	fields: [],
	settings: { enableTimestampProof: true, routePrefix: '/predictions' }
};

function makeData(items: any[]) {
	return {
		contentType: predictionsContentType,
		items,
		tags: [],
		totalItems: items.length,
		totalPages: 1,
		currentPage: 1,
		filters: { status: '', search: '' }
	} as any;
}

describe('Admin CMS list page - predictions delete block', () => {
	it('disables the delete button for a published item when enableTimestampProof is set', () => {
		render(Page, {
			props: {
				data: makeData([
					{
						id: 'ci-1',
						title: 'The Future',
						slug: 'the-future',
						status: 'published',
						publishedAt: '2024-01-01T00:00:00.000Z',
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01'
					}
				])
			}
		});

		const deleteButton = screen.getByTitle(
			'Cannot delete a published item once its timestamp proof is enabled — archive it instead'
		) as HTMLButtonElement;
		expect(deleteButton.disabled).toBe(true);
	});

	it('leaves the delete button enabled for a draft item', () => {
		render(Page, {
			props: {
				data: makeData([
					{
						id: 'ci-1',
						title: 'The Future',
						slug: 'the-future',
						status: 'draft',
						publishedAt: null,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01'
					}
				])
			}
		});

		const deleteButton = screen.getByTitle('Delete') as HTMLButtonElement;
		expect(deleteButton.disabled).toBe(false);
	});

	it('leaves the delete button enabled when enableTimestampProof is not set, even if published', () => {
		const data = makeData([
			{
				id: 'ci-1',
				title: 'Post',
				slug: 'post',
				status: 'published',
				publishedAt: '2024-01-01T00:00:00.000Z',
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01'
			}
		]);
		data.contentType = { ...predictionsContentType, settings: {} };

		render(Page, { props: { data } });

		const deleteButton = screen.getByTitle('Delete') as HTMLButtonElement;
		expect(deleteButton.disabled).toBe(false);
	});
});
