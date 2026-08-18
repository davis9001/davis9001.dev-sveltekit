/**
 * Tests for the Admin CMS list page (/admin/cms/[type]), focused on the
 * predictions delete-block: a published item of a content type with
 * enableTimestampProof must have its delete button disabled in the UI,
 * not just rejected by the API after the fact.
 */
import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), replaceState: vi.fn() }));

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

/**
 * An empty table means two different things — nothing created yet, or a filter
 * that excluded everything — and telling a user "no items yet" when they have
 * twenty-two posts reads as data loss.
 */
describe('Admin CMS list page - empty states', () => {
	const blogContentType = {
		id: 'ct-2',
		slug: 'blog',
		name: 'Blog Posts',
		description: '',
		fields: [],
		settings: { routePrefix: '/blog' }
	};

	function emptyData(filters: { status?: string; search?: string }) {
		return {
			contentType: blogContentType,
			items: [],
			tags: [],
			total: 0,
			totalItems: 0,
			totalPages: 1,
			currentPage: 1,
			filters: { status: filters.status ?? '', search: filters.search ?? '' }
		} as any;
	}

	it('offers to create the first item when nothing exists and no filter is set', () => {
		render(Page, { props: { data: emptyData({}) } });

		expect(screen.getByText('No items yet')).toBeTruthy();
		expect(screen.queryByText('No matches')).toBeNull();
		expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull();
	});

	it('says the search excluded everything, not that nothing exists', () => {
		render(Page, { props: { data: emptyData({ search: 'quantum' }) } });

		expect(screen.getByText('No matches')).toBeTruthy();
		expect(screen.queryByText('No items yet')).toBeNull();
		expect(screen.getByText(/quantum/)).toBeTruthy();
		expect(screen.getByText(/nothing has been\s+deleted/i)).toBeTruthy();
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeTruthy();
	});

	it('names the status filter when that is what excluded everything', () => {
		render(Page, { props: { data: emptyData({ status: 'draft' }) } });

		expect(screen.getByText('No matches')).toBeTruthy();
		expect(screen.getByText('draft')).toBeTruthy();
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeTruthy();
	});
});
