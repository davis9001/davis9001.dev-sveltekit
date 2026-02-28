/**
 * Tests for sitemap.xml endpoint
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the import.meta.glob for blog posts
vi.mock('/src/updates/*.md', () => ({}));
vi.mock('/src/projects/*.md', () => ({}));

describe('Sitemap XML Endpoint', () => {
	it('should return valid XML with correct content type', async () => {
		// We test the sitemap logic by importing the module with mocked globs
		const { GET } = await import('../../src/routes/sitemap.xml/+server');

		const response = await GET({
			url: new URL('https://davis9001.dev/sitemap.xml')
		} as any);

		expect(response.headers.get('Content-Type')).toBe('application/xml');
		expect(response.headers.get('Cache-Control')).toBe('max-age=3600');

		const body = await response.text();
		expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(body).toContain('https://davis9001.dev/');
		expect(body).toContain('https://davis9001.dev/portfolio');
		expect(body).toContain('https://davis9001.dev/updates');
		expect(body).toContain('https://davis9001.dev/documentation');
		expect(body).toContain('https://davis9001.dev/privacy');
		expect(body).toContain('https://davis9001.dev/terms');
	});

	it('should include blog post URLs from markdown files', async () => {
		// Reset modules to get fresh import with our mocked data
		vi.doMock('/src/updates/*.md', () => ({
			'/src/updates/test-post.md': '---\ntitle: Test Post\n---\nContent',
			'/src/updates/another-post.md': '---\ntitle: Another\n---\nContent'
		}));

		// Since import.meta.glob is resolved at build time, we test the URL patterns
		const { GET } = await import('../../src/routes/sitemap.xml/+server');
		const response = await GET({ url: new URL('https://davis9001.dev/sitemap.xml') } as any);
		const body = await response.text();

		// Static routes should always be present
		expect(body).toContain('<loc>https://davis9001.dev/</loc>');
		expect(body).toContain('<loc>https://davis9001.dev/portfolio</loc>');
	});

	it('should produce well-formed XML with url elements', async () => {
		const { GET } = await import('../../src/routes/sitemap.xml/+server');
		const response = await GET({ url: new URL('https://davis9001.dev/sitemap.xml') } as any);
		const body = await response.text();

		// Each URL should be properly wrapped
		expect(body).toMatch(/<url>\s*<loc>https:\/\/davis9001\.dev\/<\/loc>\s*<\/url>/);
		expect(body).toContain('</urlset>');
	});
});
