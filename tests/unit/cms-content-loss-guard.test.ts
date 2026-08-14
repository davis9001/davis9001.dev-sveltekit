/**
 * The content-loss guard on the live write path.
 *
 * content-loss.test.ts covers the detector in isolation. This asserts it is
 * actually wired into PUT /api/cms/[type]/[id] — that a destructive save is
 * refused with 409 and never reaches the database, and that the explicit
 * override still lets a deliberate deletion through.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CHART = '<figure><svg viewBox="0 0 10 10" class="cms-chart"><text>111</text></svg></figure>';

describe('PUT /api/cms/[type]/[id] — content-loss guard', () => {
	let mockPlatform: any;
	let mockLocals: any;
	let mockDB: any;

	const contentTypeRow = {
		id: 'ct-1',
		slug: 'blog',
		name: 'Blog Posts',
		description: '',
		fields: '[{"name":"body","label":"Body","type":"richtext","sortOrder":1,"required":true}]',
		settings: '{}',
		icon: 'article',
		sort_order: 0,
		is_system: 1,
		created_at: '2024-01-01',
		updated_at: '2024-01-01'
	};

	const existingRow = {
		id: 'ci-1',
		content_type_id: 'ct-1',
		slug: 'hello',
		title: 'Hello',
		status: 'published',
		fields: JSON.stringify({ body: `<p>intro</p>${CHART}<p>outro</p>` }),
		seo_title: null,
		seo_description: null,
		seo_image: null,
		author_id: null,
		published_at: '2024-01-01',
		created_at: '2024-01-01',
		updated_at: '2024-01-01'
	};

	/** The body TipTap wrote back on 2026-08-08: figure gone, labels as prose. */
	const FLATTENED = '<p>intro</p><p>111</p><p>outro</p>';

	function makePutRequest(body: Record<string, unknown>) {
		return new Request('http://localhost/api/cms/blog/ci-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	async function callPut(body: Record<string, unknown>) {
		const { PUT } = await import('../../src/routes/api/cms/[type]/[id]/+server.js');
		return (PUT as any)({
			platform: mockPlatform,
			locals: mockLocals,
			params: { type: 'blog', id: 'ci-1' },
			request: makePutRequest(body),
			url: new URL('http://localhost/api/cms/blog/ci-1')
		});
	}

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
		mockPlatform = { env: { DB: mockDB } };
		mockLocals = {
			user: { id: 'user-1', login: 'admin', email: 'a@t.com', isOwner: true, isAdmin: true }
		};
	});

	it('refuses a save that would flatten a chart, and writes nothing', async () => {
		mockDB.first
			.mockResolvedValueOnce(contentTypeRow) // getContentTypeBySlug
			.mockResolvedValueOnce(existingRow); // route pre-fetch

		await expect(callPut({ fields: { body: FLATTENED } })).rejects.toMatchObject({
			status: 409
		});

		// The guard runs before updateContentItem — nothing was written.
		expect(mockDB.run).not.toHaveBeenCalled();
	});

	it('names what would be lost so the message is actionable', async () => {
		mockDB.first.mockResolvedValueOnce(contentTypeRow).mockResolvedValueOnce(existingRow);

		try {
			await callPut({ fields: { body: FLATTENED } });
			expect.fail('Should have refused the save');
		} catch (err: any) {
			expect(err.status).toBe(409);
			expect(err.body?.message ?? err.message).toContain('inline SVG');
			expect(err.body?.message ?? err.message).toContain('"body"');
		}
	});

	it('lets an unchanged body through', async () => {
		mockDB.first
			.mockResolvedValueOnce(contentTypeRow)
			.mockResolvedValueOnce(existingRow)
			.mockResolvedValueOnce(existingRow) // updateContentItem: get existing
			.mockResolvedValueOnce(contentTypeRow) // updateContentItem: type lookup
			.mockResolvedValueOnce(existingRow); // updateContentItem: refetch

		const res: any = await callPut({ fields: { body: `<p>intro</p>${CHART}<p>outro</p>` } });

		expect(res.status).toBe(200);
	});

	it('allows a deliberate deletion when the override is set', async () => {
		mockDB.first
			.mockResolvedValueOnce(contentTypeRow)
			.mockResolvedValueOnce(existingRow)
			.mockResolvedValueOnce(existingRow)
			.mockResolvedValueOnce(contentTypeRow)
			.mockResolvedValueOnce({ ...existingRow, fields: JSON.stringify({ body: FLATTENED }) });

		const res: any = await callPut({ fields: { body: FLATTENED }, allowContentLoss: true });

		expect(res.status).toBe(200);
	});

	it('does not run at all when the payload carries no fields', async () => {
		// A status-only update is a partial write, not a content deletion.
		mockDB.first
			.mockResolvedValueOnce(contentTypeRow)
			.mockResolvedValueOnce(existingRow)
			.mockResolvedValueOnce(existingRow)
			.mockResolvedValueOnce(contentTypeRow)
			.mockResolvedValueOnce(existingRow);

		const res: any = await callPut({ status: 'draft' });

		expect(res.status).toBe(200);
	});
});
