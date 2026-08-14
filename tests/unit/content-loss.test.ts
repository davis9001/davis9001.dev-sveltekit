/**
 * Tests for the write-path content-loss guard.
 *
 * The failure this exists to catch is silence: a save that destroys authored
 * markup, reports success, and leaves a plausible-looking post. It happened
 * for real on 2026-08-08 (two chart figures, wrong in public for five days).
 * The guard converts that silence into a refused save.
 */
import { describe, expect, it } from 'vitest';

import {
	GUARDED_ELEMENTS,
	countGuardedElements,
	describeContentLoss,
	detectContentLoss
} from '../../src/lib/cms/content-loss';
import type { ContentFieldDefinition } from '../../src/lib/cms/types';

const FIELDS = [
	{ name: 'body', type: 'richtext' },
	{ name: 'excerpt', type: 'text' }
] as ContentFieldDefinition[];

const CHART = '<figure><svg viewBox="0 0 10 10" class="cms-chart"><text>111</text></svg></figure>';

describe('countGuardedElements', () => {
	it('counts each guarded element', () => {
		const html = `${CHART}${CHART}<table><tr><td>a</td></tr></table><div data-svelte-embed="x"></div>`;
		const counts = countGuardedElements(html);

		expect(counts.svg).toBe(2);
		expect(counts.figure).toBe(2);
		expect(counts.table).toBe(1);
		expect(counts.embed).toBe(1);
		expect(counts.figcaption).toBe(0);
	});

	it('does not count escaped markup discussed in prose', () => {
		// A post explaining SVG is not a post containing one.
		const counts = countGuardedElements('<p>Use &lt;svg&gt; for charts, or &lt;table&gt;.</p>');

		expect(counts.svg).toBe(0);
		expect(counts.table).toBe(0);
	});

	it('does not confuse a prefix for the real tag', () => {
		const counts = countGuardedElements('<svgx></svgx><tablet></tablet>');

		expect(counts.svg).toBe(0);
		expect(counts.table).toBe(0);
	});

	it('is stateless across calls', () => {
		// A shared /g/ RegExp carries lastIndex and would undercount every
		// other call — the kind of bug that makes a guard fail open.
		const first = countGuardedElements(CHART);
		const second = countGuardedElements(CHART);

		expect(second).toEqual(first);
		expect(second.svg).toBe(1);
	});

	it('treats non-strings as empty', () => {
		expect(countGuardedElements(null).svg).toBe(0);
		expect(countGuardedElements(undefined).svg).toBe(0);
		expect(countGuardedElements(42).svg).toBe(0);
	});
});

describe('detectContentLoss', () => {
	it('passes an unchanged save', () => {
		const fields = { body: `<p>a</p>${CHART}` };

		expect(detectContentLoss(fields, { ...fields }, FIELDS)).toEqual([]);
	});

	it('passes a save that only adds', () => {
		const before = { body: `<p>a</p>${CHART}` };
		const after = { body: `<p>a</p>${CHART}${CHART}<p>more</p>` };

		expect(detectContentLoss(before, after, FIELDS)).toEqual([]);
	});

	it('catches the 2026-08-08 flattening', () => {
		// What TipTap actually wrote back: the figure gone, its labels as prose.
		const before = { body: `<p>intro</p>${CHART}<p>outro</p>` };
		const after = { body: '<p>intro</p><p>111</p><p>outro</p>' };

		const losses = detectContentLoss(before, after, FIELDS);

		expect(losses).toHaveLength(2); // svg and its figure wrapper
		expect(losses.map((l) => l.key).sort()).toEqual(['figure', 'svg']);
		expect(losses[0].before).toBe(1);
		expect(losses[0].after).toBe(0);
		expect(losses[0].field).toBe('body');
	});

	it('catches a flattened table', () => {
		// Still unmodelled by StarterKit: <table> round-trips to one paragraph.
		const before = { body: '<table><tr><td>A</td></tr></table>' };
		const after = { body: '<p>A</p>' };

		const losses = detectContentLoss(before, after, FIELDS);

		expect(losses).toHaveLength(1);
		expect(losses[0].key).toBe('table');
	});

	it('ignores non-richtext fields', () => {
		const before = { excerpt: '<svg></svg>' };
		const after = { excerpt: '' };

		expect(detectContentLoss(before, after, FIELDS)).toEqual([]);
	});

	it('ignores a field absent from the payload, which is a partial update', () => {
		const before = { body: CHART };

		expect(detectContentLoss(before, { title: 'x' }, FIELDS)).toEqual([]);
	});

	it('handles a missing side without throwing', () => {
		expect(detectContentLoss(null, { body: '' }, FIELDS)).toEqual([]);
		expect(detectContentLoss({ body: '' }, null, FIELDS)).toEqual([]);
		expect(detectContentLoss({ body: CHART }, { body: 42 }, FIELDS)).toEqual([]);
	});

	it('guards every element it advertises', () => {
		for (const element of GUARDED_ELEMENTS) {
			const marker =
				element.key === 'embed'
					? '<div data-svelte-embed="x"></div>'
					: `<${element.key}></${element.key}>`;
			const losses = detectContentLoss({ body: marker }, { body: '' }, FIELDS);

			expect(losses.some((l) => l.key === element.key)).toBe(true);
		}
	});
});

describe('describeContentLoss', () => {
	it('names what goes and where it goes from', () => {
		const message = describeContentLoss([
			{ field: 'body', key: 'svg', label: 'inline SVG', before: 3, after: 1 }
		]);

		expect(message).toContain('2 inline SVGs');
		expect(message).toContain('"body"');
		expect(message).toContain('stored version is untouched');
	});

	it('stays singular for one', () => {
		const message = describeContentLoss([
			{ field: 'body', key: 'table', label: 'table', before: 1, after: 0 }
		]);

		expect(message).toContain('1 table from');
		expect(message).not.toContain('1 tables');
	});

	it('lists every loss in one message', () => {
		const message = describeContentLoss([
			{ field: 'body', key: 'svg', label: 'inline SVG', before: 2, after: 0 },
			{ field: 'body', key: 'table', label: 'table', before: 1, after: 0 }
		]);

		expect(message).toContain('inline SVG');
		expect(message).toContain('table');
	});
});
