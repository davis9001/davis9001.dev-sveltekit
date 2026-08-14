/**
 * Regression tests for inline SVG surviving the CMS editor.
 *
 * On 2026-08-08 a save through the admin UI destroyed both chart figures in
 * taking-on-client-websites-again: ProseMirror had no node for <svg>, so it
 * parsed the charts' <text> children as prose and wrote the flattened result
 * back. The post stayed plausible-looking and was wrong on the live site for
 * five days.
 *
 * These tests drive the exact path that failed. A real Editor cannot run under
 * happy-dom (prosemirror-view needs layout and selection APIs), but the damage
 * happened in prosemirror-model — DOMParser on load, DOMSerializer on save —
 * which is pure and does run here. getSchema() builds the same schema the live
 * editor uses, so a round-trip through these two is the round-trip that broke.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getSchema } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import {
	InlineSvg,
	elementFromHtml,
	figureHoldsSvg
} from '../../src/lib/cms/richtext-svg-extension';
import { sanitizeHtml } from '../../src/lib/cms/sanitize';

const CHART_SVG = readFileSync(
	path.join(process.cwd(), 'scripts', 'charts', 'donuts.svg'),
	'utf8'
).trim();

const BARS_SVG = readFileSync(
	path.join(process.cwd(), 'scripts', 'charts', 'bars.svg'),
	'utf8'
).trim();

/** The editor's real extension set, optionally without the SVG node. */
function schemaFor({ withSvg }: { withSvg: boolean }) {
	const extensions = [
		StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
		Link.configure({ openOnClick: false, autolink: true }),
		Image,
		...(withSvg ? [InlineSvg] : [])
	];
	return getSchema(extensions);
}

/** Load HTML into a document and serialize it back, exactly as the editor does. */
function roundTrip(html: string, { withSvg }: { withSvg: boolean }): string {
	const schema = schemaFor({ withSvg });

	const container = document.createElement('div');
	container.innerHTML = html;

	const doc = PMDOMParser.fromSchema(schema).parse(container);
	const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);

	const out = document.createElement('div');
	out.appendChild(fragment);
	return out.innerHTML;
}

describe('InlineSvg extension spec', () => {
	it('is a block atom named inlineSvg', () => {
		expect(InlineSvg.name).toBe('inlineSvg');
		expect(InlineSvg.config.group).toBe('block');
		expect(InlineSvg.config.atom).toBe(true);
	});

	it('matches both bare svg and figures that wrap one', () => {
		const rules = (InlineSvg.config.parseHTML as () => { tag: string }[]).call({});
		expect(rules.map((r) => r.tag)).toEqual(['figure', 'svg']);
	});

	it('declines a figure with no svg in it, so image figures stay editable', () => {
		const rules = (InlineSvg.config.parseHTML as () => any[]).call({});
		const figureRule = rules[0];

		const withSvg = document.createElement('figure');
		withSvg.innerHTML = '<svg viewBox="0 0 10 10"></svg>';
		const withImage = document.createElement('figure');
		withImage.innerHTML = '<img src="/a.png" alt="a"><figcaption>a</figcaption>';

		expect(figureRule.getAttrs(withSvg)).not.toBe(false);
		expect(figureRule.getAttrs(withImage)).toBe(false);
	});

	it('sanitizes what it captures, so nothing enters that the write path would reject', () => {
		const attrs = (InlineSvg.config.addAttributes as () => any).call({});
		const el = document.createElement('div');
		el.innerHTML = '<svg viewBox="0 0 10 10"><script>alert(1)</' + 'script></svg>';

		const captured = attrs.html.parseHTML(el.firstElementChild as HTMLElement);
		expect(captured).toContain('<svg');
		expect(captured).not.toContain('alert(1)');
	});
});

describe('renderHTML', () => {
	const render = (html: unknown) =>
		(InlineSvg.config.renderHTML as any).call({}, { node: { attrs: { html } } });

	it('emits the stored element itself, not an escaped string', () => {
		const out = render('<figure><svg viewBox="0 0 10 10"></svg></figure>');

		expect(out).toBeInstanceOf(Object);
		expect((out as HTMLElement).tagName.toLowerCase()).toBe('figure');
		expect((out as HTMLElement).querySelector('svg')).not.toBeNull();
	});

	it('falls back to an empty marker rather than throwing on unusable markup', () => {
		// Serialization runs over the whole body — throwing here would take the
		// entire post down, which is worse than losing one figure.
		expect(render('')).toEqual(['div', { 'data-inline-svg': '' }]);
		expect(render(null)).toEqual(['div', { 'data-inline-svg': '' }]);
		expect(render(undefined)).toEqual(['div', { 'data-inline-svg': '' }]);
	});
});

describe('addNodeView', () => {
	const view = (html: unknown) =>
		(InlineSvg.config.addNodeView as any).call({})({ node: { attrs: { html } } });

	it('shows the real figure, not editable', () => {
		const { dom } = view('<figure><svg viewBox="0 0 10 10"></svg></figure>');

		expect(dom.className).toBe('rte-svg-figure');
		expect(dom.contentEditable).toBe('false');
		expect(dom.querySelector('svg')).not.toBeNull();
	});

	it('labels the node when the stored markup will not parse', () => {
		const { dom } = view('');

		expect(dom.textContent).toBe('Inline SVG');
	});
});

describe('elementFromHtml', () => {
	it('builds the stored markup back into an element', () => {
		const el = elementFromHtml('<figure><svg viewBox="0 0 10 10"></svg></figure>');
		expect(el?.tagName.toLowerCase()).toBe('figure');
		expect(el?.querySelector('svg')).not.toBeNull();
	});

	it('returns null for empty or unparseable input rather than throwing', () => {
		expect(elementFromHtml('')).toBeNull();
		expect(elementFromHtml('   ')).toBeNull();
		expect(elementFromHtml(null as unknown as string)).toBeNull();
		expect(elementFromHtml(123 as unknown as string)).toBeNull();
		// Text with no element in it has no firstElementChild.
		expect(elementFromHtml('just words')).toBeNull();
	});
});

describe('figureHoldsSvg', () => {
	it('sees an svg at any depth', () => {
		const el = document.createElement('figure');
		el.innerHTML = '<div><span><svg viewBox="0 0 1 1"></svg></span></div>';
		expect(figureHoldsSvg(el)).toBe(true);
	});

	it('is false for a figure with no svg', () => {
		const el = document.createElement('figure');
		el.innerHTML = '<img src="/a.png" alt="a">';
		expect(figureHoldsSvg(el)).toBe(false);
	});
});

describe('editor round-trip (the 2026-08-08 regression)', () => {
	const body = `<p>Before the chart.</p><figure>${CHART_SVG}</figure><p>After the chart.</p>`;

	it('destroys the chart without the extension — the bug, still reproducible', () => {
		const out = roundTrip(body, { withSvg: false });

		expect(out).not.toContain('<svg');
		expect(out).not.toContain('cms-chart');
		// Not merely dropped: the chart's labels come back as prose, which is why
		// the damage was invisible in a glance at the post.
		expect(out).toContain('in trouble');
	});

	it('preserves the chart figure with the extension', () => {
		const out = roundTrip(body, { withSvg: true });

		expect(out).toContain('<figure>');
		expect(out).toContain('<svg');
		expect(out).toContain('cms-chart');
		expect(out).toContain('Before the chart.');
		expect(out).toContain('After the chart.');
	});

	it('keeps every class the animation contract depends on', () => {
		const out = roundTrip(body, { withSvg: true });

		// scripts/charts/README.md: cms-chart opts in, cr/cg/cf are the marks,
		// s0..s6 are the stagger steps. Losing any of them silently stops the
		// animation while the chart still renders.
		for (const cls of ['cms-chart', 'cr', 'cf', 's0', 's1', 's2']) {
			expect(out).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
		}
	});

	it('preserves a bare svg with no figure wrapper', () => {
		// why-dirac-is-my-hostname carries five of these.
		const out = roundTrip(`<p>a</p>${BARS_SVG}<p>b</p>`, { withSvg: true });

		expect(out).toContain('<svg');
		expect(out).toContain('cms-chart');
	});

	it('is a fixed point of the sanitizer, so repeated saves cannot drift', () => {
		const once = sanitizeHtml(roundTrip(body, { withSvg: true }));
		const twice = sanitizeHtml(roundTrip(once, { withSvg: true }));

		expect(twice).toBe(once);
		expect(once).toContain('cms-chart');
	});

	it('keeps the geometry attributes the charts are built on', () => {
		// js-xss lowercases attribute names, so a saved chart is stored as
		// viewbox/pathlength rather than viewBox/pathLength. That is safe ONLY
		// because bodies are rendered as HTML, and the HTML parser case-corrects
		// SVG attributes — confirmed in Chromium: pathlength="100" yields
		// pathLength.baseVal === 100, identical to the authored casing. happy-dom
		// does not implement that adjustment, so this asserts the attributes
		// survive at all rather than asserting a casing this environment fakes.
		// If a future sanitizer change drops them, the donut's stroke-dashoffset
		// sweep loses its 0–100 normalisation and the rings stop animating.
		const out = sanitizeHtml(roundTrip(body, { withSvg: true })).toLowerCase();

		expect(out).toContain('viewbox=');
		expect(out).toContain('pathlength="100"');
		expect(out).toContain('stroke-dasharray=');
	});

	it('leaves ordinary prose untouched', () => {
		const prose = '<h2>Title</h2><p>Some <strong>bold</strong> text.</p><ul><li>one</li></ul>';
		const out = roundTrip(prose, { withSvg: true });

		expect(out).toContain('<h2>');
		expect(out).toContain('<strong>');
		expect(out).toContain('<li>');
	});
});
