/**
 * Tests for sitemap.xml endpoint (blog URLs come from the CMS in D1)
 */
import { describe, it, expect, vi } from 'vitest';

function makeEvent(rows: Array<Record<string, unknown>> = []) {
	const all = vi.fn().mockResolvedValue({ results: rows });
	const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnThis(), all }) };
	return {
		url: new URL('https://davis9001.dev/sitemap.xml'),
		platform: { env: { DB: db } }
	} as any;
}

const blogRow = {
	slug: 'why-dirac-is-my-hostname',
	title: 'Why Dirac is My Hostname',
	summary: 'x',
	published_at: '2026-06-26 00:00:00'
};

describe('Sitemap XML Endpoint', () => {
	it('should return valid XML with correct content type', async () => {
		const { GET } = await import('../../src/routes/sitemap.xml/+server');

		const response = await GET(makeEvent());

		expect(response.headers.get('Content-Type')).toBe('application/xml');
		expect(response.headers.get('Cache-Control')).toBe('max-age=3600');

		const body = await response.text();
		expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(body).toContain('https://davis9001.dev/');
		expect(body).toContain('https://davis9001.dev/portfolio');
		expect(body).toContain('https://davis9001.dev/blog');
		expect(body).not.toContain('https://davis9001.dev/updates');
		expect(body).not.toContain('https://davis9001.dev/documentation');
		expect(body).toContain('https://davis9001.dev/privacy');
		expect(body).toContain('https://davis9001.dev/terms');
	});

	it('should include published blog post URLs from the CMS', async () => {
		const { GET } = await import('../../src/routes/sitemap.xml/+server');
		const response = await GET(makeEvent([blogRow]));
		const body = await response.text();

		expect(body).toContain('<loc>https://davis9001.dev/blog/why-dirac-is-my-hostname</loc>');
		expect(body).not.toContain('https://davis9001.dev/update/');
	});

	it('should fall back to static routes when the database is unavailable', async () => {
		const { GET } = await import('../../src/routes/sitemap.xml/+server');
		const response = await GET({
			url: new URL('https://davis9001.dev/sitemap.xml'),
			platform: undefined
		} as any);
		const body = await response.text();

		expect(body).toContain('<loc>https://davis9001.dev/blog</loc>');
		expect(body).toContain('</urlset>');
	});

	it('should produce well-formed XML with url elements', async () => {
		const { GET } = await import('../../src/routes/sitemap.xml/+server');
		const response = await GET(makeEvent([blogRow]));
		const body = await response.text();

		expect(body).toMatch(/<url>\s*<loc>https:\/\/davis9001\.dev\/<\/loc>\s*<\/url>/);
		expect(body).toContain('</urlset>');
	});
});
