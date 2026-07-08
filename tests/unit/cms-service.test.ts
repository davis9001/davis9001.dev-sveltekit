import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('CMS Service', () => {
	let mockDB: any;

	beforeEach(() => {
		vi.resetModules();
		mockDB = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			first: vi.fn(),
			all: vi.fn(),
			run: vi.fn(),
			batch: vi.fn()
		};
	});

	describe('syncContentTypes', () => {
		it('should insert new content types from registry', async () => {
			const { syncContentTypes } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({ results: [] });
			mockDB.batch.mockResolvedValue([{ success: true }]);

			await syncContentTypes(mockDB);

			expect(mockDB.batch).toHaveBeenCalled();
			const batchArgs = mockDB.batch.mock.calls[0][0];
			expect(batchArgs.length).toBeGreaterThanOrEqual(1);
		});

		it('should update existing content types that have changed', async () => {
			const { syncContentTypes } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({
				results: [
					{
						id: 'existing-id',
						slug: 'blog',
						name: 'Old Name',
						fields: '[]',
						settings: '{}'
					}
				]
			});
			mockDB.batch.mockResolvedValue([{ success: true }]);

			await syncContentTypes(mockDB);

			expect(mockDB.batch).toHaveBeenCalled();
		});

		it('should not batch when no changes needed', async () => {
			const { syncContentTypes } = await import('../../src/lib/services/cms.js');
			const { contentTypeRegistry } = await import('../../src/lib/cms/registry.js');

			mockDB.all.mockResolvedValue({
				results: contentTypeRegistry.map((ct, i) => ({
					id: `existing-id-${i}`,
					slug: ct.slug,
					name: ct.name,
					description: ct.description,
					fields: JSON.stringify(ct.fields),
					settings: JSON.stringify(ct.settings),
					icon: ct.icon
				}))
			});

			await syncContentTypes(mockDB);

			expect(mockDB.batch).not.toHaveBeenCalled();
		});
	});

	describe('getContentTypes', () => {
		it('should return all content types', async () => {
			const { getContentTypes } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({
				results: [
					{
						id: 'ct-1',
						slug: 'blog',
						name: 'Blog Posts',
						description: 'Articles',
						fields: '[]',
						settings: '{}',
						icon: 'article',
						sort_order: 0,
						created_at: '2024-01-01',
						updated_at: '2024-01-01'
					}
				]
			});

			const types = await getContentTypes(mockDB);
			expect(types).toHaveLength(1);
			expect(types[0].slug).toBe('blog');
			expect(types[0].fields).toEqual([]);
		});
	});

	describe('getContentTypeBySlug', () => {
		it('should return a content type by slug', async () => {
			const { getContentTypeBySlug } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue({
				id: 'ct-1',
				slug: 'blog',
				name: 'Blog Posts',
				description: 'Articles',
				fields: '[]',
				settings: '{}',
				icon: 'article',
				sort_order: 0,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});

			const type = await getContentTypeBySlug(mockDB, 'blog');
			expect(type).toBeTruthy();
			expect(type!.slug).toBe('blog');
		});

		it('should return null for non-existent slug', async () => {
			const { getContentTypeBySlug } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue(null);

			const type = await getContentTypeBySlug(mockDB, 'nonexistent');
			expect(type).toBeNull();
		});
	});

	describe('createContentItem', () => {
		it('should create a content item', async () => {
			const { createContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValueOnce({
				id: 'ct-1',
				slug: 'blog',
				name: 'Blog Posts',
				fields: JSON.stringify([
					{ name: 'excerpt', label: 'Excerpt', type: 'textarea', required: true },
					{ name: 'body', label: 'Body', type: 'richtext', required: true }
				]),
				settings: '{}',
				icon: 'article',
				sort_order: 0,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});
			// For slug uniqueness check
			mockDB.first.mockResolvedValueOnce(null);
			// For the insert returning
			mockDB.first.mockResolvedValueOnce({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'hello-world',
				title: 'Hello World',
				status: 'draft',
				fields: JSON.stringify({ excerpt: 'A test', body: 'Hello world body text' }),
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: 'user-1',
				published_at: null,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});

			const item = await createContentItem(mockDB, {
				contentTypeSlug: 'blog',
				title: 'Hello World',
				fields: { excerpt: 'A test', body: 'Hello world body text' },
				authorId: 'user-1'
			});

			expect(item).toBeTruthy();
			expect(item!.title).toBe('Hello World');
			expect(item!.slug).toBe('hello-world');
			expect(item!.status).toBe('draft');
		});

		it('should return null when content type not found', async () => {
			const { createContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue(null);

			const item = await createContentItem(mockDB, {
				contentTypeSlug: 'nonexistent',
				title: 'Test',
				fields: {}
			});

			expect(item).toBeNull();
		});

		it('should use provided slug instead of generating one', async () => {
			const { createContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValueOnce({
				id: 'ct-1',
				slug: 'blog',
				name: 'Blog',
				fields: '[]',
				settings: '{}',
				icon: 'article',
				sort_order: 0,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});
			mockDB.first.mockResolvedValueOnce(null); // slug check
			mockDB.first.mockResolvedValueOnce({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'custom-slug',
				title: 'Test',
				status: 'draft',
				fields: '{}',
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: null,
				published_at: null,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});

			const item = await createContentItem(mockDB, {
				contentTypeSlug: 'blog',
				title: 'Test',
				slug: 'custom-slug',
				fields: {}
			});

			expect(item!.slug).toBe('custom-slug');
		});
	});

	describe('getContentItem', () => {
		it('should return a content item by id', async () => {
			const { getContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'hello-world',
				title: 'Hello World',
				status: 'published',
				fields: '{"body":"Hello"}',
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: null,
				published_at: '2024-01-01',
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});

			const item = await getContentItem(mockDB, 'ci-1');
			expect(item).toBeTruthy();
			expect(item!.id).toBe('ci-1');
			expect(item!.fields).toEqual({ body: 'Hello' });
		});

		it('should return null for non-existent item', async () => {
			const { getContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue(null);

			const item = await getContentItem(mockDB, 'nonexistent');
			expect(item).toBeNull();
		});
	});

	describe('getContentItemBySlug', () => {
		it('should return a content item by type and slug', async () => {
			const { getContentItemBySlug } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'hello-world',
				title: 'Hello World',
				status: 'published',
				fields: '{"body":"Hello"}',
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: null,
				published_at: '2024-01-01',
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});

			const item = await getContentItemBySlug(mockDB, 'ct-1', 'hello-world');
			expect(item).toBeTruthy();
			expect(item!.slug).toBe('hello-world');
		});
	});

	describe('listContentItems', () => {
		it('should return paginated items', async () => {
			const { listContentItems } = await import('../../src/lib/services/cms.js');

			// Count query
			mockDB.first.mockResolvedValueOnce({ count: 2 });
			// Items query
			mockDB.all.mockResolvedValueOnce({
				results: [
					{
						id: 'ci-1',
						content_type_id: 'ct-1',
						slug: 'post-1',
						title: 'Post 1',
						status: 'published',
						fields: '{}',
						seo_title: null,
						seo_description: null,
						seo_image: null,
						author_id: null,
						published_at: '2024-01-01',
						created_at: '2024-01-01',
						updated_at: '2024-01-01'
					},
					{
						id: 'ci-2',
						content_type_id: 'ct-1',
						slug: 'post-2',
						title: 'Post 2',
						status: 'published',
						fields: '{}',
						seo_title: null,
						seo_description: null,
						seo_image: null,
						author_id: null,
						published_at: '2024-01-02',
						created_at: '2024-01-02',
						updated_at: '2024-01-02'
					}
				]
			});

			const result = await listContentItems(mockDB, 'ct-1', { page: 1, pageSize: 10 });
			expect(result.items).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.page).toBe(1);
			expect(result.pageSize).toBe(10);
			expect(result.totalPages).toBe(1);
		});

		it('should filter by status', async () => {
			const { listContentItems } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValueOnce({ count: 1 });
			mockDB.all.mockResolvedValueOnce({
				results: [
					{
						id: 'ci-1',
						content_type_id: 'ct-1',
						slug: 'post-1',
						title: 'Post 1',
						status: 'published',
						fields: '{}',
						seo_title: null,
						seo_description: null,
						seo_image: null,
						author_id: null,
						published_at: '2024-01-01',
						created_at: '2024-01-01',
						updated_at: '2024-01-01'
					}
				]
			});

			const result = await listContentItems(mockDB, 'ct-1', { status: 'published' });
			expect(result.items).toHaveLength(1);
			// Verify status filter was included in query
			const prepareCall = mockDB.prepare.mock.calls.find((call: string[]) =>
				call[0].includes('status')
			);
			expect(prepareCall).toBeTruthy();
		});
	});

	describe('updateContentItem', () => {
		it('should update a content item', async () => {
			const { updateContentItem } = await import('../../src/lib/services/cms.js');

			// First call: get existing item
			mockDB.first.mockResolvedValueOnce({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'hello-world',
				title: 'Hello World',
				status: 'draft',
				fields: '{"body":"Old"}',
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: null,
				published_at: null,
				created_at: '2024-01-01',
				updated_at: '2024-01-01'
			});
			// Second call: content type lookup (for lock/provenance checks)
			mockDB.first.mockResolvedValueOnce({
				fields: '[]',
				settings: '{}'
			});
			// Third call: update result
			mockDB.first.mockResolvedValueOnce({
				id: 'ci-1',
				content_type_id: 'ct-1',
				slug: 'hello-world',
				title: 'Updated Title',
				status: 'published',
				fields: '{"body":"New"}',
				seo_title: null,
				seo_description: null,
				seo_image: null,
				author_id: null,
				published_at: '2024-01-15',
				created_at: '2024-01-01',
				updated_at: '2024-01-15'
			});

			const item = await updateContentItem(mockDB, 'ci-1', {
				title: 'Updated Title',
				status: 'published',
				fields: { body: 'New' }
			});

			expect(item).toBeTruthy();
			expect(item!.title).toBe('Updated Title');
			expect(item!.status).toBe('published');
		});

		it('should return null when item not found', async () => {
			const { updateContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue(null);

			const item = await updateContentItem(mockDB, 'nonexistent', {
				title: 'Test'
			});
			expect(item).toBeNull();
		});

		it('preserves the original publishedAt across an unpublish→republish cycle (regression)', async () => {
			const { updateContentItem } = await import('../../src/lib/services/cms.js');

			// Step 1: unpublish an already-published item — published_at must be untouched.
			mockDB.first
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-01'
				})
				.mockResolvedValueOnce({ fields: '[]', settings: '{}' })
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'draft',
					fields: '{}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-02'
				});

			await updateContentItem(mockDB, 'ci-1', { status: 'draft' });

			// The bound published_at value for that UPDATE must be the ORIGINAL
			// timestamp, not null and not a fresh one.
			const firstUpdateBind = mockDB.bind.mock.calls[2];
			expect(firstUpdateBind).toContain('2024-01-01T00:00:00.000Z');

			// Step 2: republish — published_at must STILL be the original value,
			// not reset to "now". This is the actual regression: the old code
			// keyed off `existing.status !== 'published'`, so re-publishing a
			// previously-published-then-unpublished item reset the timestamp.
			mockDB.first
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'draft',
					fields: '{}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-02'
				})
				.mockResolvedValueOnce({ fields: '[]', settings: '{}' })
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-03'
				});

			await updateContentItem(mockDB, 'ci-1', { status: 'published' });

			const secondUpdateBind = mockDB.bind.mock.calls[5];
			expect(secondUpdateBind).toContain('2024-01-01T00:00:00.000Z');
			// A fresh "now" timestamp must NOT have been substituted in.
			expect(secondUpdateBind).not.toContain(new Date().toISOString().slice(0, 10));
		});

		describe('lock-after-publish enforcement', () => {
			function existingRow(overrides: Record<string, unknown> = {}) {
				return {
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{"body":"original","resolution_status":"pending"}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-01',
					...overrides
				};
			}

			const lockedTypeRow = {
				fields: JSON.stringify([
					{ name: 'body', label: 'Body', type: 'richtext', lockedAfterPublish: true },
					{ name: 'resolution_status', label: 'Status', type: 'select' }
				]),
				settings: JSON.stringify({ lockTitleAndSlugAfterPublish: true })
			};

			it('throws when a locked field value would change on a published item', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');
				const { LockedContentError } = await import('../../src/lib/cms/types.js');

				mockDB.first.mockResolvedValueOnce(existingRow()).mockResolvedValueOnce(lockedTypeRow);

				await expect(
					updateContentItem(mockDB, 'ci-1', {
						fields: { body: 'CHANGED', resolution_status: 'pending' }
					})
				).rejects.toThrow(LockedContentError);
			});

			it('allows the update when the locked field value is unchanged', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');

				mockDB.first
					.mockResolvedValueOnce(existingRow())
					.mockResolvedValueOnce(lockedTypeRow)
					.mockResolvedValueOnce(
						existingRow({ fields: '{"body":"original","resolution_status":"correct"}' })
					);

				const result = await updateContentItem(mockDB, 'ci-1', {
					fields: { body: 'original', resolution_status: 'correct' }
				});

				expect(result).toBeTruthy();
			});

			it('throws when the title changes on a published item with lockTitleAndSlugAfterPublish', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');
				const { LockedContentError } = await import('../../src/lib/cms/types.js');

				mockDB.first.mockResolvedValueOnce(existingRow()).mockResolvedValueOnce(lockedTypeRow);

				await expect(
					updateContentItem(mockDB, 'ci-1', { title: 'A whole new title' })
				).rejects.toThrow(LockedContentError);
			});

			it('throws when the slug changes on a published item with lockTitleAndSlugAfterPublish', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');
				const { LockedContentError } = await import('../../src/lib/cms/types.js');

				mockDB.first.mockResolvedValueOnce(existingRow()).mockResolvedValueOnce(lockedTypeRow);

				await expect(updateContentItem(mockDB, 'ci-1', { slug: 'new-slug' })).rejects.toThrow(
					LockedContentError
				);
			});

			it('does not enforce locks on a never-published (draft) item', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');

				mockDB.first
					.mockResolvedValueOnce(existingRow({ status: 'draft', published_at: null }))
					.mockResolvedValueOnce(lockedTypeRow)
					.mockResolvedValueOnce(
						existingRow({ status: 'draft', published_at: null, title: 'Edited' })
					);

				const result = await updateContentItem(mockDB, 'ci-1', {
					title: 'Edited',
					fields: { body: 'freely editable pre-publish', resolution_status: 'pending' }
				});

				expect(result).toBeTruthy();
			});
		});

		describe('resolution-provenance stamping', () => {
			const stampTypeRow = {
				fields: JSON.stringify([
					{ name: 'body', label: 'Body', type: 'richtext', lockedAfterPublish: true },
					{
						name: 'resolution_status',
						label: 'Status',
						type: 'select',
						stampProvenanceOnChange: true
					}
				]),
				settings: '{}'
			};

			function existingRow(overrides: Record<string, unknown> = {}) {
				return {
					id: 'ci-1',
					content_type_id: 'ct-1',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{"body":"x","resolution_status":"pending"}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-01',
					resolution_resolved_at: null,
					resolution_resolved_by: null,
					...overrides
				};
			}

			it('stamps resolution_resolved_at/by when a stamped field changes', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');

				mockDB.first
					.mockResolvedValueOnce(existingRow())
					.mockResolvedValueOnce(stampTypeRow)
					.mockResolvedValueOnce(existingRow({ resolution_resolved_by: 'user-1' }));

				await updateContentItem(
					mockDB,
					'ci-1',
					{ fields: { body: 'x', resolution_status: 'correct' } },
					'user-1'
				);

				const updateBind = mockDB.bind.mock.calls[2];
				expect(updateBind).toContain('user-1');
			});

			it('does not stamp when the stamped field is unchanged', async () => {
				const { updateContentItem } = await import('../../src/lib/services/cms.js');

				mockDB.first
					.mockResolvedValueOnce(existingRow())
					.mockResolvedValueOnce(stampTypeRow)
					.mockResolvedValueOnce(existingRow());

				await updateContentItem(
					mockDB,
					'ci-1',
					{ fields: { body: 'x', resolution_status: 'pending' } },
					'user-1'
				);

				const updateBind = mockDB.bind.mock.calls[2];
				expect(updateBind).not.toContain('user-1');
			});
		});

		it('falls back to empty definitions/settings when the owning content type is missing', async () => {
			const { updateContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-deleted',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{"body":"x"}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-01'
				})
				.mockResolvedValueOnce(null) // content_types row no longer exists
				.mockResolvedValueOnce({
					id: 'ci-1',
					content_type_id: 'ct-deleted',
					slug: 'hello',
					title: 'Hello',
					status: 'published',
					fields: '{"body":"x"}',
					seo_title: null,
					seo_description: null,
					seo_image: null,
					author_id: null,
					published_at: '2024-01-01T00:00:00.000Z',
					created_at: '2024-01-01',
					updated_at: '2024-01-01'
				});

			// No lockedAfterPublish/lockTitleAndSlugAfterPublish to enforce, so this
			// must succeed rather than throw despite the item being published.
			const result = await updateContentItem(mockDB, 'ci-1', { fields: { body: 'x' } });
			expect(result).toBeTruthy();
		});
	});

	describe('recordWaybackSnapshot', () => {
		it('updates the wayback snapshot url and checked-at timestamp', async () => {
			const { recordWaybackSnapshot } = await import('../../src/lib/services/cms.js');

			mockDB.run.mockResolvedValue({ success: true });

			await recordWaybackSnapshot(mockDB, 'ci-1', {
				url: 'https://web.archive.org/web/20240101000000/https://davis9001.dev/predictions/foo',
				checkedAt: '2024-01-01T00:00:00.000Z'
			});

			expect(mockDB.bind).toHaveBeenCalledWith(
				'https://web.archive.org/web/20240101000000/https://davis9001.dev/predictions/foo',
				'2024-01-01T00:00:00.000Z',
				'ci-1'
			);
			expect(mockDB.run).toHaveBeenCalled();
		});
	});

	describe('deleteContentItem', () => {
		it('should delete a content item', async () => {
			const { deleteContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

			const result = await deleteContentItem(mockDB, 'ci-1');
			expect(result).toBe(true);
		});

		it('should return false when item not found', async () => {
			const { deleteContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

			const result = await deleteContentItem(mockDB, 'nonexistent');
			expect(result).toBe(false);
		});

		it('throws when deleting a published item whose content type has enableTimestampProof', async () => {
			const { deleteContentItem } = await import('../../src/lib/services/cms.js');
			const { LockedContentError } = await import('../../src/lib/cms/types.js');

			mockDB.first.mockResolvedValueOnce({
				published_at: '2024-01-01T00:00:00.000Z',
				settings: JSON.stringify({ enableTimestampProof: true })
			});

			await expect(deleteContentItem(mockDB, 'ci-1')).rejects.toThrow(LockedContentError);
			expect(mockDB.run).not.toHaveBeenCalled();
		});

		it('allows deleting a published item whose content type does not have enableTimestampProof', async () => {
			const { deleteContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValueOnce({
				published_at: '2024-01-01T00:00:00.000Z',
				settings: JSON.stringify({})
			});
			mockDB.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

			const result = await deleteContentItem(mockDB, 'ci-1');
			expect(result).toBe(true);
		});

		it('allows deleting a never-published item even with enableTimestampProof', async () => {
			const { deleteContentItem } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValueOnce({
				published_at: null,
				settings: JSON.stringify({ enableTimestampProof: true })
			});
			mockDB.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

			const result = await deleteContentItem(mockDB, 'ci-1');
			expect(result).toBe(true);
		});
	});

	describe('createContentTag', () => {
		it('should create a tag', async () => {
			const { createContentTag } = await import('../../src/lib/services/cms.js');

			mockDB.first.mockResolvedValue({
				id: 'tag-1',
				content_type_id: 'ct-1',
				name: 'JavaScript',
				slug: 'javascript',
				created_at: '2024-01-01'
			});

			const tag = await createContentTag(mockDB, 'ct-1', 'JavaScript');
			expect(tag).toBeTruthy();
			expect(tag!.name).toBe('JavaScript');
			expect(tag!.slug).toBe('javascript');
		});
	});

	describe('getTagsForType', () => {
		it('should return tags for a content type', async () => {
			const { getTagsForType } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({
				results: [
					{
						id: 'tag-1',
						content_type_id: 'ct-1',
						name: 'JS',
						slug: 'js',
						created_at: '2024-01-01'
					},
					{ id: 'tag-2', content_type_id: 'ct-1', name: 'TS', slug: 'ts', created_at: '2024-01-01' }
				]
			});

			const tags = await getTagsForType(mockDB, 'ct-1');
			expect(tags).toHaveLength(2);
			expect(tags[0].name).toBe('JS');
		});
	});

	describe('setItemTags', () => {
		it('should replace item tags', async () => {
			const { setItemTags } = await import('../../src/lib/services/cms.js');

			mockDB.batch.mockResolvedValue([{ success: true }]);

			await setItemTags(mockDB, 'ci-1', ['tag-1', 'tag-2']);
			expect(mockDB.batch).toHaveBeenCalled();
		});
	});

	describe('getItemTags', () => {
		it('should return tags for an item', async () => {
			const { getItemTags } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({
				results: [
					{ id: 'tag-1', content_type_id: 'ct-1', name: 'JS', slug: 'js', created_at: '2024-01-01' }
				]
			});

			const tags = await getItemTags(mockDB, 'ci-1');
			expect(tags).toHaveLength(1);
			expect(tags[0].name).toBe('JS');
		});
	});

	describe('null results handling', () => {
		it('should handle syncContentTypes when db.all returns no results property', async () => {
			const { syncContentTypes } = await import('../../src/lib/services/cms.js');

			// Return object without results (simulates D1 edge case)
			mockDB.all.mockResolvedValue({});
			mockDB.batch.mockResolvedValue([{ success: true }]);

			await syncContentTypes(mockDB);

			// Should still work using || [] fallback
			expect(mockDB.batch).toHaveBeenCalled();
		});

		it('should handle getContentTypes when db.all returns no results property', async () => {
			const { getContentTypes } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({});

			const types = await getContentTypes(mockDB);
			expect(types).toEqual([]);
		});

		it('should handle listContentItems when db.all returns no results', async () => {
			const { listContentItems } = await import('../../src/lib/services/cms.js');

			// count query
			mockDB.first.mockResolvedValueOnce({ count: 0 });
			// items query returns no results property
			mockDB.all.mockResolvedValue({});

			const result = await listContentItems(mockDB, 'ct-1', {
				status: 'published',
				page: 1,
				pageSize: 10
			});
			expect(result.items).toEqual([]);
		});

		it('should handle getItemTags when db.all returns no results', async () => {
			const { getItemTags } = await import('../../src/lib/services/cms.js');

			mockDB.all.mockResolvedValue({});

			const tags = await getItemTags(mockDB, 'ci-1');
			expect(tags).toEqual([]);
		});
	});
});
