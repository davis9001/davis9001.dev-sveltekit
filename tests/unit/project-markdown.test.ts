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
		expect(html).not.toContain('theme-figure');
	});

	it('emits a switchable figure with both variants for a placeholder source', () => {
		const html = renderThemeImage('/agapeverse/home-{theme}.webp', 'Home page', null, 'fig');

		expect(html).toContain('class="theme-figure"');
		expect(html).toContain('src="/agapeverse/home-light.webp"');
		expect(html).toContain('src="/agapeverse/home-dark.webp"');
		expect(html).toContain('theme-swap--light');
		expect(html).toContain('theme-swap--dark');
	});

	it('wires the label to its own checkbox', () => {
		const html = renderThemeImage('/a/b-{theme}.webp', 'B', null, 'my-figure');

		expect(html).toContain('id="my-figure"');
		expect(html).toContain('for="my-figure"');
		expect(html).toContain('type="checkbox"');
	});

	it('offers the theme that is not currently showing', () => {
		const html = renderThemeImage('/a/b-{theme}.webp', 'B');

		// The label on the light variant offers dark, and the other way round.
		expect(html).toContain('<span class="theme-swap theme-swap--light">See it in dark</span>');
		expect(html).toContain('<span class="theme-swap theme-swap--dark">See it in light</span>');
	});

	it('puts the checkbox before the images, so CSS can key off it', () => {
		const html = renderThemeImage('/a/b-{theme}.webp', 'B');

		expect(html.indexOf('type="checkbox"')).toBeLessThan(html.indexOf('<img'));
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
		expect(renderThemeImage('/a-{theme}.webp', 'alt', 'A title')).toContain('title="A title"');
		expect(renderThemeImage('/a.webp', 'alt')).not.toContain('title=');
		expect(renderThemeImage('/a.webp', 'alt', null)).not.toContain('title=');
	});

	it('escapes quotes and angle brackets in alt, title and src', () => {
		const html = renderThemeImage('/a"b.webp', 'a "quoted" <alt> & more', 'ti"tle');

		expect(html).toContain('alt="a &quot;quoted&quot; &lt;alt&gt; &amp; more"');
		expect(html).toContain('title="ti&quot;tle"');
		expect(html).toContain('src="/a&quot;b.webp"');
	});

	it('escapes the figure id', () => {
		const html = renderThemeImage('/a-{theme}.webp', 'A', null, 'id"break');

		expect(html).toContain('id="id&quot;break"');
		expect(html).not.toContain('id="id"break"');
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

	it('gives every switchable figure in a body its own checkbox id', () => {
		const html = renderProjectMarkdown(
			'![One](/a-{theme}.webp)\n\n![Two](/b-{theme}.webp)\n\n![Three](/c-{theme}.webp)\n'
		);
		const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

		expect(ids).toEqual(['theme-figure-1', 'theme-figure-2', 'theme-figure-3']);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('restarts numbering per render, so ids depend only on the body', () => {
		const body = '![One](/a-{theme}.webp)\n';

		expect(renderProjectMarkdown(body)).toBe(renderProjectMarkdown(body));
	});

	it('does not number plain images', () => {
		const html = renderProjectMarkdown('![Plain](/plain.webp)\n\n![Pair](/p-{theme}.webp)\n');

		expect([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1])).toEqual(['theme-figure-1']);
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
