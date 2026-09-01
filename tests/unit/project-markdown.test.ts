import { describe, it, expect } from 'vitest';
import {
	renderProjectMarkdown,
	renderThemeImage,
	THEME_PLACEHOLDER
} from '$lib/utils/project-markdown';

describe('renderThemeImage', () => {
	it('emits a single plain image when the source has no placeholder', () => {
		const html = renderThemeImage('/nebulakit/logo.webp', 'A logo');

		expect(html).toBe('<img src="/nebulakit/logo.webp" alt="A logo" loading="lazy" />');
		expect(html).not.toContain('theme-img');
	});

	it('emits a light and a dark variant for a placeholder source', () => {
		const html = renderThemeImage('/agapeverse/home-{theme}.webp', 'Home page');

		expect(html).toContain('src="/agapeverse/home-light.webp"');
		expect(html).toContain('src="/agapeverse/home-dark.webp"');
		expect(html).toContain('class="theme-img theme-img--light"');
		expect(html).toContain('class="theme-img theme-img--dark"');
	});

	it('gives both variants the same alt text', () => {
		const html = renderThemeImage('/a/b-{theme}.webp', 'Same description');

		expect(html.match(/alt="Same description"/g)).toHaveLength(2);
	});

	it('replaces every occurrence of the placeholder', () => {
		const html = renderThemeImage(`/${THEME_PLACEHOLDER}/x-${THEME_PLACEHOLDER}.webp`, 'x');

		expect(html).toContain('src="/light/x-light.webp"');
		expect(html).toContain('src="/dark/x-dark.webp"');
	});

	it('renders a title attribute when one is given, and omits it otherwise', () => {
		expect(renderThemeImage('/a.webp', 'alt', 'A title')).toContain('title="A title"');
		expect(renderThemeImage('/a.webp', 'alt')).not.toContain('title=');
		expect(renderThemeImage('/a.webp', 'alt', null)).not.toContain('title=');
	});

	it('escapes quotes and angle brackets in alt, title and src', () => {
		const html = renderThemeImage('/a"b.webp', 'a "quoted" <alt> & more', 'ti"tle');

		expect(html).toContain('alt="a &quot;quoted&quot; &lt;alt&gt; &amp; more"');
		expect(html).toContain('title="ti&quot;tle"');
		expect(html).toContain('src="/a&quot;b.webp"');
	});

	it('tolerates an empty alt', () => {
		expect(renderThemeImage('/a.webp', '')).toContain('alt=""');
	});
});

describe('renderProjectMarkdown', () => {
	it('renders ordinary markdown', () => {
		const html = renderProjectMarkdown('# Title\n\nSome **bold** text.\n');

		expect(html).toContain('<h1>Title</h1>');
		expect(html).toContain('<strong>bold</strong>');
	});

	it('expands a placeholder image inside a body', () => {
		const html = renderProjectMarkdown('![Stats](/nebulakit/admin-stats-{theme}.webp)\n');

		expect(html).toContain('/nebulakit/admin-stats-light.webp');
		expect(html).toContain('/nebulakit/admin-stats-dark.webp');
	});

	it('leaves a non-placeholder image as one tag', () => {
		const html = renderProjectMarkdown('![Plain](/plain.webp)\n');

		expect(html.match(/<img /g)).toHaveLength(1);
	});

	it('renders links and lists unchanged', () => {
		const html = renderProjectMarkdown('- [a link](https://example.com)\n');

		expect(html).toContain('<li>');
		expect(html).toContain('href="https://example.com"');
	});
});
