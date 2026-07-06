/**
 * CMS rich text sanitization
 *
 * Server-side HTML sanitization for richtext fields, run on every CMS write
 * (POST and PUT). Uses js-xss (pure JS — works identically in Cloudflare
 * Workers, Vitest, and the browser). The whitelist covers standard article
 * markup plus the Svelte embed placeholder:
 *
 *   <div data-svelte-embed="name" data-props="{...}"></div>
 *
 * Content is rendered with {@html} on the public site, so this sanitizer is
 * the write-time defense (writes are additionally owner/admin-gated).
 */

import { FilterXSS, escapeAttrValue } from 'xss';
import { decodeAttrEntities, encodeAttrEntities, EMBED_NAME_PATTERN } from './embed';
import type { ContentFieldDefinition } from './types';

const ALLOWED_TAGS: Record<string, string[]> = {
	h2: [],
	h3: [],
	h4: [],
	p: [],
	a: ['href', 'title', 'target', 'rel'],
	strong: [],
	b: [],
	em: [],
	i: [],
	s: [],
	u: [],
	code: ['class'],
	pre: ['class'],
	blockquote: [],
	ul: [],
	ol: ['start'],
	li: [],
	hr: [],
	br: [],
	img: ['src', 'alt', 'title', 'width', 'height'],
	figure: [],
	figcaption: [],
	table: [],
	thead: [],
	tbody: [],
	tr: [],
	th: [],
	td: [],
	span: [],
	div: ['data-svelte-embed', 'data-props']
};

function isSafeUrl(value: string): boolean {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
		return false;
	}
	if (trimmed.startsWith('data:')) {
		return false;
	}
	return true;
}

const filter = new FilterXSS({
	whiteList: ALLOWED_TAGS,
	stripIgnoreTag: true,
	stripIgnoreTagBody: ['script', 'style'],
	onTagAttr(tag, name, value) {
		if (tag === 'div' && name === 'data-svelte-embed') {
			return EMBED_NAME_PATTERN.test(value) ? `data-svelte-embed="${escapeAttrValue(value)}"` : '';
		}
		if (tag === 'div' && name === 'data-props') {
			// The value arrives raw from the parser (entity-escaped as stored)
			try {
				const decoded = decodeAttrEntities(value);
				const parsed = JSON.parse(decoded);
				if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
					return `data-props="${encodeAttrEntities(JSON.stringify(parsed))}"`;
				}
			} catch {
				// fall through — drop the attribute
			}
			return '';
		}
		if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
			return '';
		}
		return undefined; // default handling
	}
});

/** Sanitize a rich text HTML string for storage */
export function sanitizeHtml(html: string): string {
	if (typeof html !== 'string' || !html) {
		return '';
	}
	return filter.process(html);
}

/**
 * Return a copy of a CMS item's fields with every richtext field sanitized.
 * Non-richtext fields pass through untouched.
 */
export function sanitizeRichtextFields(
	fields: Record<string, unknown>,
	definitions: ContentFieldDefinition[]
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...fields };
	for (const def of definitions) {
		if (def.type === 'richtext' && typeof result[def.name] === 'string') {
			result[def.name] = sanitizeHtml(result[def.name] as string);
		}
	}
	return result;
}
