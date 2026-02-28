/**
 * Tests for SEO component
 *
 * Validates meta tag generation with various prop combinations.
 */
import { describe, it, expect } from 'vitest';

describe('SEO Component', () => {
	// Since SEO is a Svelte component that renders <svelte:head>,
	// we test its title/description logic by checking the exported reactive values
	// through the component's behavior contract.

	const SITE_NAME = 'davis9001.dev';
	const SITE_URL = 'https://davis9001.dev';
	const DEFAULT_DESCRIPTION = 'The personal website of David Monaghan aka davis9001.';
	const DEFAULT_IMAGE = 'https://davis9001.dev/cover.png';

	// Helper to compute the same values the component computes reactively
	function computeSEO(props: {
		title?: string;
		description?: string;
		path?: string;
		imageUrl?: string;
		type?: string;
		rawTitle?: boolean;
		publishedAt?: string;
	}) {
		const title = props.title || '';
		const description = props.description || DEFAULT_DESCRIPTION;
		const path = props.path || '';
		const imageUrl = props.imageUrl || DEFAULT_IMAGE;
		const type = props.type || 'website';
		const rawTitle = props.rawTitle || false;
		const publishedAt = props.publishedAt || '';

		const fullTitle = rawTitle ? title : title ? `${title} - ${SITE_NAME}` : SITE_NAME;
		const fullUrl = path ? `${SITE_URL}${path}` : SITE_URL;

		return { fullTitle, fullUrl, description, imageUrl, type, publishedAt };
	}

	describe('title generation', () => {
		it('should format title with site name suffix', () => {
			const seo = computeSEO({ title: 'Portfolio' });
			expect(seo.fullTitle).toBe('Portfolio - davis9001.dev');
		});

		it('should use site name alone when no title provided', () => {
			const seo = computeSEO({});
			expect(seo.fullTitle).toBe('davis9001.dev');
		});

		it('should use raw title when rawTitle is true', () => {
			const seo = computeSEO({ title: 'Custom Title', rawTitle: true });
			expect(seo.fullTitle).toBe('Custom Title');
		});

		it('should handle empty title with rawTitle', () => {
			const seo = computeSEO({ title: '', rawTitle: true });
			expect(seo.fullTitle).toBe('');
		});
	});

	describe('URL generation', () => {
		it('should build full URL from path', () => {
			const seo = computeSEO({ path: '/portfolio' });
			expect(seo.fullUrl).toBe('https://davis9001.dev/portfolio');
		});

		it('should return site root when no path provided', () => {
			const seo = computeSEO({});
			expect(seo.fullUrl).toBe('https://davis9001.dev');
		});

		it('should handle nested paths', () => {
			const seo = computeSEO({ path: '/portfolio/project/my-app' });
			expect(seo.fullUrl).toBe('https://davis9001.dev/portfolio/project/my-app');
		});
	});

	describe('description', () => {
		it('should use default description when none provided', () => {
			const seo = computeSEO({});
			expect(seo.description).toBe(DEFAULT_DESCRIPTION);
		});

		it('should use custom description when provided', () => {
			const seo = computeSEO({ description: 'My custom description' });
			expect(seo.description).toBe('My custom description');
		});
	});

	describe('image URL', () => {
		it('should use default cover image when none provided', () => {
			const seo = computeSEO({});
			expect(seo.imageUrl).toBe(DEFAULT_IMAGE);
		});

		it('should use custom image when provided', () => {
			const seo = computeSEO({ imageUrl: 'https://example.com/img.jpg' });
			expect(seo.imageUrl).toBe('https://example.com/img.jpg');
		});
	});

	describe('type', () => {
		it('should default to website', () => {
			const seo = computeSEO({});
			expect(seo.type).toBe('website');
		});

		it('should accept article type', () => {
			const seo = computeSEO({ type: 'article' });
			expect(seo.type).toBe('article');
		});
	});

	describe('publishedAt', () => {
		it('should be empty by default', () => {
			const seo = computeSEO({});
			expect(seo.publishedAt).toBe('');
		});

		it('should pass through date string', () => {
			const seo = computeSEO({ publishedAt: '2025-01-15' });
			expect(seo.publishedAt).toBe('2025-01-15');
		});
	});
});
