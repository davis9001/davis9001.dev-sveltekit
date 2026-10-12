import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Video from '$lib/cms/embeds/video/Video.svelte';
import { safeMediaPath } from '$lib/cms/embeds/video/definition';
import { getEmbedComponent } from '$lib/cms/embeds';
import { getEmbedDefinition } from '$lib/cms/embeds/manifest';

afterEach(cleanup);

describe('video embed', () => {
	it('is registered with its props schema', () => {
		expect(getEmbedComponent('video')).toBeTruthy();
		expect(getEmbedDefinition('video')?.props?.map((p) => p.key)).toEqual([
			'src',
			'poster',
			'label',
			'caption'
		]);
	});

	it('plays a same-site upload with its poster, label and caption', () => {
		const { container } = render(Video, {
			src: '/media/uploads/clip.mp4',
			poster: '/media/uploads/clip.webp',
			label: 'A clip',
			caption: 'The moment.'
		});
		const video = container.querySelector('video');
		expect(video?.getAttribute('src')).toBe('/media/uploads/clip.mp4');
		expect(video?.getAttribute('poster')).toBe('/media/uploads/clip.webp');
		expect(video?.getAttribute('aria-label')).toBe('A clip');
		expect(video?.getAttribute('preload')).toBe('metadata');
		expect(container.querySelector('figcaption')?.textContent).toBe('The moment.');
	});

	it('drops an unsafe poster and omits empty extras', () => {
		const { container } = render(Video, {
			src: '/media/uploads/clip.mp4',
			poster: 'https://evil.example/x.webp'
		});
		const video = container.querySelector('video');
		expect(video?.hasAttribute('poster')).toBe(false);
		expect(video?.hasAttribute('aria-label')).toBe(false);
		expect(container.querySelector('figcaption')).toBeNull();
	});

	it('renders nothing for a source outside the media library', () => {
		const { container } = render(Video, { src: 'https://evil.example/x.mp4' });
		expect(container.querySelector('video')).toBeNull();
	});

	it('accepts only plain /media paths', () => {
		expect(safeMediaPath('/media/uploads/a.mp4')).toBe('/media/uploads/a.mp4');
		expect(safeMediaPath('/media/../secret')).toBe('');
		expect(safeMediaPath('//evil.example/a.mp4')).toBe('');
		expect(safeMediaPath('javascript:alert(1)')).toBe('');
		expect(safeMediaPath(42)).toBe('');
	});
});
