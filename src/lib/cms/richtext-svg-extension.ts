/**
 * TipTap atom node for inline SVG in CMS bodies.
 *
 * Charts in post bodies are authored as inline SVG (see scripts/charts/README.md).
 * ProseMirror's schema has no node for <svg>, so without this extension the
 * editor does not merely drop them — it parses their <text> children as prose
 * and writes the flattened result back on save. That is what destroyed the
 * figures in taking-on-client-websites-again on 2026-08-08: the post looked
 * saved, stayed the right sort of length, and read as garbage.
 *
 * The node stores the element's outerHTML verbatim and renders it back out, so
 * a load/save round-trip through the editor is lossless. Two shapes are matched:
 *
 *   <svg class="cms-chart">…</svg>          a bare inline illustration
 *   <figure><svg …></svg></figure>          a chart figure, captured whole
 *
 * A <figure> WITHOUT an SVG is deliberately left to the normal schema — this
 * exists to protect markup TipTap would destroy, not to freeze every figure.
 *
 * The captured HTML is passed through sanitizeHtml on the way in, the same
 * filter the write path applies. The stored form is therefore already a fixed
 * point of the sanitizer, and nothing can enter the document that the write
 * path would have rejected anyway.
 */

import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from 'prosemirror-model';
import { sanitizeHtml } from './sanitize';

/** Build a detached element from stored HTML. Returns null when it won't parse. */
export function elementFromHtml(html: string): HTMLElement | null {
	if (typeof document === 'undefined' || typeof html !== 'string' || !html.trim()) {
		return null;
	}
	const template = document.createElement('template');
	template.innerHTML = html.trim();
	return (template.content.firstElementChild as HTMLElement) ?? null;
}

/** True when this <figure> is one of the chart figures worth preserving whole. */
export function figureHoldsSvg(element: HTMLElement): boolean {
	return element.querySelector('svg') !== null;
}

export const InlineSvg = Node.create({
	name: 'inlineSvg',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			html: {
				default: '',
				parseHTML: (element: HTMLElement) => sanitizeHtml(element.outerHTML),
				// The markup lives in the node's own output, never as an attribute.
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [
			// Ahead of the svg rule: a chart figure is captured as one unit, so the
			// wrapper survives and the inner svg is not matched separately.
			{
				tag: 'figure',
				priority: 60,
				getAttrs: (element: HTMLElement | string) =>
					typeof element === 'string' || !figureHoldsSvg(element) ? false : null
			},
			{ tag: 'svg', priority: 60 }
		];
	},

	renderHTML({ node }) {
		const element = elementFromHtml(String(node.attrs.html ?? ''));
		if (element) {
			return element as unknown as DOMOutputSpec;
		}
		// Only reachable with no document (SSR) or unparseable stored HTML. An
		// empty marker is preferable to throwing mid-serialize and losing the body.
		return ['div', { 'data-inline-svg': '' }] as DOMOutputSpec;
	},

	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('div');
			dom.className = 'rte-svg-figure';
			dom.contentEditable = 'false';
			const element = elementFromHtml(String(node.attrs.html ?? ''));
			if (element) {
				dom.appendChild(element);
			} else {
				dom.textContent = 'Inline SVG';
			}
			return { dom };
		};
	}
});
