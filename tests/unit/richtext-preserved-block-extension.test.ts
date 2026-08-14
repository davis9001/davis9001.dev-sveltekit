/**
 * Regression tests for authored markup surviving the CMS editor.
 *
 * On 2026-08-08 a save through the admin UI destroyed both chart figures in
 * taking-on-client-websites-again: ProseMirror had no node for <svg>, so it
 * parsed the charts' <text> children as prose and wrote the flattened result
 * back. The post stayed plausible-looking and was wrong on the live site for
 * five days. <figure> and <table> fail the same way.
 *
 * These tests drive the exact path that failed. A real Editor cannot run under
 * happy-dom (prosemirror-view needs layout and selection APIs), but the damage
 * happened in prosemirror-model — DOMParser on load, DOMSerializer on save —
 * which is pure and does run here. Those two calls are what TipTap's
 * setContent and getHTML use, over a schema from the real extension set.
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
	PRESERVED_TAGS,
	PreservedBlock,
	elementFromHtml
} from '../../src/lib/cms/richtext-preserved-block-extension';
import { sanitizeHtml } from '../../src/lib/cms/sanitize';

const readChart = (name: string) =>
	readFileSync(path.join(process.cwd(), 'scripts', 'charts', name), 'utf8').trim();

const CHART_SVG = readChart('donuts.svg');
const BARS_SVG = readChart('bars.svg');
const TABLE =
	'<table><thead><tr><th>Theme</th><th>Contrast</th></tr></thead>' +
	'<tbody><tr><td>Dark</td><td>7.1:1</td></tr></tbody></table>';

/** The editor's real extension set, optionally without the preservation node. */
function schemaFor({ withPreserve }: { withPreserve: boolean }) {
	return getSchema([
		StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
		Link.configure({ openOnClick: false, autolink: true }),
		Image,
		...(withPreserve ? [PreservedBlock] : [])
	]);
}

/** Load HTML into a document and serialize it back, exactly as the editor does. */
function roundTrip(html: string, { withPreserve }: { withPreserve: boolean }): string {
	const schema = schemaFor({ withPreserve });

	const container = document.createElement('div');
	container.innerHTML = html;

	const doc = PMDOMParser.fromSchema(schema).parse(container);
	const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);

	const out = document.createElement('div');
	out.appendChild(fragment);
	return out.innerHTML;
}

describe('PreservedBlock extension spec', () => {
	it('is a block atom named preservedBlock', () => {
		expect(PreservedBlock.name).toBe('preservedBlock');
		expect(PreservedBlock.config.group).toBe('block');
		expect(PreservedBlock.config.atom).toBe(true);
	});

	it('matches figure before svg, so a chart figure is captured whole', () => {
		const rules = (PreservedBlock.config.parseHTML as () => { tag: string }[]).call({});

		expect(rules.map((r) => r.tag)).toEqual(['figure', 'table', 'svg']);
		expect(rules.map((r) => r.tag)).toEqual([...PRESERVED_TAGS]);
	});

	it('sanitizes what it captures, so nothing enters that the write path would reject', () => {
		const attrs = (PreservedBlock.config.addAttributes as () => any).call({});
		const el = document.createElement('div');
		el.innerHTML = '<svg viewBox="0 0 10 10"><script>alert(1)</' + 'script></svg>';

		const captured = attrs.html.parseHTML(el.firstElementChild as HTMLElement);

		expect(captured).toContain('<svg');
		expect(captured).not.toContain('alert(1)');
	});
});

describe('renderHTML', () => {
	const render = (html: unknown) =>
		(PreservedBlock.config.renderHTML as any).call({}, { node: { attrs: { html } } });

	it('emits the stored element itself, not an escaped string', () => {
		const out = render('<figure><svg viewBox="0 0 10 10"></svg></figure>');

		expect((out as HTMLElement).tagName.toLowerCase()).toBe('figure');
		expect((out as HTMLElement).querySelector('svg')).not.toBeNull();
	});

	it('falls back to an empty marker rather than throwing on unusable markup', () => {
		// Serialization runs over the whole body — throwing here would take the
		// entire post down, which is worse than losing one figure.
		expect(render('')).toEqual(['div', { 'data-preserved-block': '' }]);
		expect(render(null)).toEqual(['div', { 'data-preserved-block': '' }]);
		expect(render(undefined)).toEqual(['div', { 'data-preserved-block': '' }]);
	});
});

describe('addNodeView', () => {
	const view = (html: unknown) =>
		(PreservedBlock.config.addNodeView as any).call({})({ node: { attrs: { html } } });

	it('shows the real markup, not editable', () => {
		const { dom } = view('<figure><svg viewBox="0 0 10 10"></svg></figure>');

		expect(dom.className).toBe('rte-preserved-block');
		expect(dom.contentEditable).toBe('false');
		expect(dom.querySelector('svg')).not.toBeNull();
	});

	it('labels the node when the stored markup will not parse', () => {
		expect(view('').dom.textContent).toBe('Preserved markup');
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
		expect(elementFromHtml('just words')).toBeNull();
	});
});

describe('editor round-trip (the 2026-08-08 regression)', () => {
	const body = `<p>Before the chart.</p><figure>${CHART_SVG}</figure><p>After the chart.</p>`;

	it('destroys the chart without the extension — the bug, still reproducible', () => {
		const out = roundTrip(body, { withPreserve: false });

		expect(out).not.toContain('<svg');
		expect(out).not.toContain('cms-chart');
		// Not merely dropped: the chart's labels come back as prose, which is why
		// the damage was invisible in a glance at the post.
		expect(out).toContain('in trouble');
	});

	it('preserves the chart figure with the extension', () => {
		const out = roundTrip(body, { withPreserve: true });

		expect(out).toContain('<figure>');
		expect(out).toContain('<svg');
		expect(out).toContain('cms-chart');
		expect(out).toContain('Before the chart.');
		expect(out).toContain('After the chart.');
	});

	it('keeps every class the animation contract depends on', () => {
		const out = roundTrip(body, { withPreserve: true });

		// scripts/charts/README.md: cms-chart opts in, cr/cg/cf are the marks,
		// s0..s6 are the stagger steps. Losing any of them silently stops the
		// animation while the chart still renders.
		for (const cls of ['cms-chart', 'cr', 'cf', 's0', 's1', 's2']) {
			expect(out).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
		}
	});

	it('preserves a bare svg with no figure wrapper', () => {
		// why-dirac-is-my-hostname carries five of these.
		const out = roundTrip(`<p>a</p>${BARS_SVG}<p>b</p>`, { withPreserve: true });

		expect(out).toContain('<svg');
		expect(out).toContain('cms-chart');
	});

	it('flattens a table to one paragraph without the extension', () => {
		// The same bug, a different element — theme-toggle-button-ux-standard
		// carries a table that this would have destroyed.
		const out = roundTrip(TABLE, { withPreserve: false });

		expect(out).not.toContain('<table');
		expect(out).toContain('Theme');
	});

	it('preserves a table with the extension, cells intact', () => {
		const out = roundTrip(`<p>a</p>${TABLE}<p>b</p>`, { withPreserve: true });

		expect(out).toContain('<table>');
		expect(out).toContain('<th>Theme</th>');
		expect(out).toContain('<td>7.1:1</td>');
	});

	it('preserves a figure caption, which becomes a paragraph otherwise', () => {
		const figure = '<figure><img src="/a.png" alt="a"><figcaption>A caption.</figcaption></figure>';

		expect(roundTrip(figure, { withPreserve: false })).not.toContain('<figcaption');
		expect(roundTrip(figure, { withPreserve: true })).toContain(
			'<figcaption>A caption.</figcaption>'
		);
	});

	it('is a fixed point of the sanitizer, so repeated saves cannot drift', () => {
		const once = sanitizeHtml(roundTrip(body, { withPreserve: true }));
		const twice = sanitizeHtml(roundTrip(once, { withPreserve: true }));

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
		const out = sanitizeHtml(roundTrip(body, { withPreserve: true })).toLowerCase();

		expect(out).toContain('viewbox=');
		expect(out).toContain('pathlength="100"');
		expect(out).toContain('stroke-dasharray=');
	});

	it('leaves ordinary prose untouched', () => {
		const prose = '<h2>Title</h2><p>Some <strong>bold</strong> text.</p><ul><li>one</li></ul>';
		const out = roundTrip(prose, { withPreserve: true });

		expect(out).toContain('<h2>');
		expect(out).toContain('<strong>');
		expect(out).toContain('<li>');
	});
});
