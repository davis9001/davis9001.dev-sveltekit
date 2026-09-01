import { describe, it, expect } from 'vitest';
import {
	THEME_VARIANTS,
	THEME_PLACEHOLDER,
	hasThemePlaceholder,
	withTheme,
	themeImgClass,
	escapeAttribute
} from '$lib/utils/theme-image';
import { expandThemeImages } from '$lib/cms/theme-images';

describe('theme-image helpers', () => {
	it('lists light before dark so the default variant renders first', () => {
		expect([...THEME_VARIANTS]).toEqual(['light', 'dark']);
	});

	it('detects the placeholder', () => {
		expect(hasThemePlaceholder(`/a/b-${THEME_PLACEHOLDER}.webp`)).toBe(true);
		expect(hasThemePlaceholder('/a/b.webp')).toBe(false);
	});

	it('replaces every occurrence of the placeholder', () => {
		expect(withTheme('/{theme}/x-{theme}.webp', 'dark')).toBe('/dark/x-dark.webp');
	});

	it('builds the swap classes', () => {
		expect(themeImgClass('light')).toBe('theme-img theme-img--light');
		expect(themeImgClass('dark')).toBe('theme-img theme-img--dark');
	});

	it('escapes attribute-breaking characters', () => {
		expect(escapeAttribute('a"b<c>d&e')).toBe('a&quot;b&lt;c&gt;d&amp;e');
	});
});

describe('expandThemeImages', () => {
	it('leaves content without the placeholder untouched', () => {
		const html = '<p>Hello</p><img src="/media/a.webp" alt="A" />';
		expect(expandThemeImages(html)).toBe(html);
	});

	it('returns empty input unchanged', () => {
		expect(expandThemeImages('')).toBe('');
	});

	it('expands a placeholder image into both variants', () => {
		const out = expandThemeImages('<img src="/media/dash-{theme}.webp" alt="Dash" />');

		expect(out).toContain('src="/media/dash-light.webp"');
		expect(out).toContain('src="/media/dash-dark.webp"');
		expect(out).toContain('class="theme-img theme-img--light"');
		expect(out).toContain('class="theme-img theme-img--dark"');
		expect(out.match(/<img /g)).toHaveLength(2);
	});

	it('keeps the other attributes on both variants', () => {
		const out = expandThemeImages(
			'<img src="/a-{theme}.webp" alt="Alt text" title="T" width="800" height="600" />'
		);

		expect(out.match(/alt="Alt text"/g)).toHaveLength(2);
		expect(out.match(/width="800"/g)).toHaveLength(2);
		expect(out.match(/height="600"/g)).toHaveLength(2);
		expect(out.match(/title="T"/g)).toHaveLength(2);
	});

	it('merges with a class the tag already has', () => {
		const out = expandThemeImages('<img class="wide" src="/a-{theme}.webp" alt="A">');

		expect(out).toContain('class="theme-img theme-img--light wide"');
		expect(out).toContain('class="theme-img theme-img--dark wide"');
	});

	it('handles a tag that is not self-closing', () => {
		const out = expandThemeImages('<img src="/a-{theme}.webp" alt="A">');

		expect(out).toContain('class="theme-img theme-img--light">');
		expect(out.match(/<img /g)).toHaveLength(2);
	});

	it('only expands the images that declare a pair', () => {
		const out = expandThemeImages(
			'<img src="/plain.webp" alt="P" /><img src="/pair-{theme}.webp" alt="Q" />'
		);

		expect(out.match(/<img /g)).toHaveLength(3);
		expect(out).toContain('src="/plain.webp"');
		expect(out).not.toContain('{theme}');
	});

	it('leaves surrounding markup in place', () => {
		const out = expandThemeImages('<p>Before</p><img src="/a-{theme}.webp" alt="A" /><p>After</p>');

		expect(out.startsWith('<p>Before</p>')).toBe(true);
		expect(out.endsWith('<p>After</p>')).toBe(true);
	});

	it('expands several paired images in one body', () => {
		const out = expandThemeImages(
			'<img src="/one-{theme}.webp" alt="1" /><img src="/two-{theme}.webp" alt="2" />'
		);

		expect(out.match(/<img /g)).toHaveLength(4);
		expect(out).toContain('/one-dark.webp');
		expect(out).toContain('/two-light.webp');
	});
});
