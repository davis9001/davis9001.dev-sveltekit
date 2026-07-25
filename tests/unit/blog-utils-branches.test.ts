/**
 * Branch coverage for lib/utils/blog.ts
 *
 * Covers the frontmatter parser's malformed-input arms — an unterminated
 * delimiter block, blank and colonless lines, single-quoted values and empty
 * array literals — plus formatBlogDate's unparseable-date guard.
 */
import { describe, expect, it } from 'vitest';
import { formatBlogDate, parseFrontmatter } from '$lib/utils/blog';

describe('parseFrontmatter', () => {
	it('treats content with no frontmatter as body only', () => {
		const result = parseFrontmatter('# Just a heading\n\nBody text.');
		expect(result.content).toContain('# Just a heading');
	});

	it('treats an unterminated frontmatter block as body only', () => {
		// endIndex === -1: opening --- with no closing delimiter.
		const raw = '---\ntitle: Unterminated\nstill going';
		const result = parseFrontmatter(raw);
		expect(result.content).toBe(raw);
	});

	it('skips blank and colonless lines inside frontmatter', () => {
		const raw = [
			'---',
			'title: Real Title',
			'',
			'a line with no colon',
			'draft: true',
			'---',
			'Body'
		].join('\n');
		const result = parseFrontmatter(raw);
		expect(result.meta.title).toBe('Real Title');
	});

	it('strips single quotes as well as double quotes', () => {
		const raw = ['---', "title: 'Single Quoted'", '---', 'Body'].join('\n');
		const result = parseFrontmatter(raw);
		expect(result.meta.title).toBe('Single Quoted');
	});

	it('strips double-quoted values', () => {
		const raw = ['---', 'title: "Double Quoted"', '---', 'Body'].join('\n');
		const result = parseFrontmatter(raw);
		expect(result.meta.title).toBe('Double Quoted');
	});

	it('parses an empty array literal as an empty array', () => {
		// parseArrayValue's `if (!inner) return []`
		const raw = ['---', 'title: T', 'tags: []', '---', 'Body'].join('\n');
		const result = parseFrontmatter(raw);
		expect(result.meta.tags).toEqual([]);
	});

	it('parses a populated array literal', () => {
		const raw = ['---', 'title: T', 'tags: [one, \'two\', "three"]', '---', 'Body'].join('\n');
		const result = parseFrontmatter(raw);
		expect(result.meta.tags).toEqual(['one', 'two', 'three']);
	});
});

describe('formatBlogDate', () => {
	it('returns an empty string for an empty input', () => {
		expect(formatBlogDate('')).toBe('');
	});

	it('returns an empty string for an unparseable date', () => {
		// isNaN(date.getTime()) guard
		expect(formatBlogDate('not-a-real-date')).toBe('');
	});

	it('formats a valid date', () => {
		expect(formatBlogDate('2026-01-28')).toContain('2026');
	});
});
