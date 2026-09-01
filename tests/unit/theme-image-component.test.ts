import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import ThemeImage from '$lib/components/ThemeImage.svelte';

afterEach(cleanup);

describe('ThemeImage', () => {
	it('renders one plain image when the source has no pair', () => {
		const { container } = render(ThemeImage, { src: '/media/a.webp', alt: 'A photo' });
		const imgs = container.querySelectorAll('img');

		expect(imgs).toHaveLength(1);
		expect(imgs[0].getAttribute('src')).toBe('/media/a.webp');
		expect(imgs[0].className).not.toContain('theme-img');
	});

	it('renders both variants for a {theme} source', () => {
		const { container } = render(ThemeImage, {
			src: '/media/dash-{theme}.webp',
			alt: 'Dashboard'
		});
		const imgs = Array.from(container.querySelectorAll('img'));

		expect(imgs).toHaveLength(2);
		expect(imgs.map((i) => i.getAttribute('src'))).toEqual([
			'/media/dash-light.webp',
			'/media/dash-dark.webp'
		]);
		expect(imgs[0].className).toContain('theme-img--light');
		expect(imgs[1].className).toContain('theme-img--dark');
	});

	it('gives both variants the same alt text', () => {
		const { container } = render(ThemeImage, { src: '/a-{theme}.webp', alt: 'Same' });

		for (const img of container.querySelectorAll('img')) {
			expect(img.getAttribute('alt')).toBe('Same');
		}
	});

	it('passes through a caller class alongside the swap classes', () => {
		const { container } = render(ThemeImage, {
			src: '/a-{theme}.webp',
			alt: 'A',
			class: 'rounded'
		});

		for (const img of container.querySelectorAll('img')) {
			expect(img.className).toContain('rounded');
			expect(img.className).toContain('theme-img');
		}
	});

	it('passes through loading on both the paired and plain forms', () => {
		const paired = render(ThemeImage, { src: '/a-{theme}.webp', alt: 'A', loading: 'lazy' });
		for (const img of paired.container.querySelectorAll('img')) {
			expect(img.getAttribute('loading')).toBe('lazy');
		}
		cleanup();

		const plain = render(ThemeImage, { src: '/a.webp', alt: 'A', loading: 'lazy' });
		expect(plain.container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
	});
});
