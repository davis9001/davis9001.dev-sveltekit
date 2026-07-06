/**
 * Tests for the Open Projects admin API validation helpers
 */
import { describe, expect, it } from 'vitest';

import { validateProjectInput, validateReorderInput } from '../../src/lib/projects/validate';

describe('validateProjectInput', () => {
	it('rejects non-object bodies', () => {
		expect(validateProjectInput(null).ok).toBe(false);
		expect(validateProjectInput('x').ok).toBe(false);
		expect(validateProjectInput([1]).ok).toBe(false);
	});

	it('accepts an empty patch (no keys)', () => {
		const result = validateProjectInput({});
		expect(result).toEqual({ ok: true, input: {} });
	});

	it('requires group and name when requireIdentity is set', () => {
		expect(validateProjectInput({}, { requireIdentity: true })).toMatchObject({
			ok: false,
			message: 'group is required'
		});
		expect(validateProjectInput({ group: 'G' }, { requireIdentity: true })).toMatchObject({
			ok: false,
			message: 'name is required'
		});
		expect(
			validateProjectInput({ group: 'G', name: 'N' }, { requireIdentity: true })
		).toMatchObject({ ok: true, input: { group: 'G', name: 'N' } });
	});

	it('trims group and name and rejects blank values', () => {
		expect(validateProjectInput({ group: '  G  ', name: ' N ' })).toMatchObject({
			ok: true,
			input: { group: 'G', name: 'N' }
		});
		expect(validateProjectInput({ group: '   ' }).ok).toBe(false);
		expect(validateProjectInput({ name: 42 }).ok).toBe(false);
	});

	it('validates enums', () => {
		expect(validateProjectInput({ status: 'paused' })).toMatchObject({
			ok: true,
			input: { status: 'paused' }
		});
		expect(validateProjectInput({ status: 'bogus' }).ok).toBe(false);
		expect(validateProjectInput({ priority: 'low' })).toMatchObject({
			ok: true,
			input: { priority: 'low' }
		});
		expect(validateProjectInput({ priority: 'urgent' }).ok).toBe(false);
	});

	it('coerces non-string description and blockers to empty strings', () => {
		expect(validateProjectInput({ description: 42, blockers: null })).toMatchObject({
			ok: true,
			input: { description: '', blockers: '' }
		});
		expect(validateProjectInput({ description: 'd', blockers: 'b' })).toMatchObject({
			ok: true,
			input: { description: 'd', blockers: 'b' }
		});
	});

	it('normalises links: blank or non-string becomes null, values get trimmed', () => {
		expect(validateProjectInput({ primaryLink: '  https://x  ', githubUrl: '' })).toMatchObject({
			ok: true,
			input: { primaryLink: 'https://x', githubUrl: null }
		});
		expect(validateProjectInput({ primaryLink: null, githubUrl: 42 })).toMatchObject({
			ok: true,
			input: { primaryLink: null, githubUrl: null }
		});
	});

	it('normalises extraLinks and tasks', () => {
		const result = validateProjectInput({
			extraLinks: [{ label: 'L', href: 'H' }, 'junk'],
			tasks: ['legacy', { text: 't', done: true }]
		});
		expect(result).toMatchObject({
			ok: true,
			input: {
				extraLinks: [{ label: 'L', href: 'H' }],
				tasks: [
					{ text: 'legacy', done: false },
					{ text: 't', done: true }
				]
			}
		});
	});

	it('validates sortOrder as a finite number', () => {
		expect(validateProjectInput({ sortOrder: 3 })).toMatchObject({
			ok: true,
			input: { sortOrder: 3 }
		});
		expect(validateProjectInput({ sortOrder: 'x' }).ok).toBe(false);
		expect(validateProjectInput({ sortOrder: Infinity }).ok).toBe(false);
	});
});

describe('validateReorderInput', () => {
	it('rejects non-object bodies', () => {
		expect(validateReorderInput(null).ok).toBe(false);
		expect(validateReorderInput([]).ok).toBe(false);
	});

	it('rejects missing or empty updates', () => {
		expect(validateReorderInput({}).ok).toBe(false);
		expect(validateReorderInput({ updates: [] }).ok).toBe(false);
	});

	it('rejects malformed entries', () => {
		expect(validateReorderInput({ updates: [null] }).ok).toBe(false);
		expect(validateReorderInput({ updates: [{ id: '', sortOrder: 1 }] }).ok).toBe(false);
		expect(validateReorderInput({ updates: [{ id: 'a', sortOrder: NaN }] }).ok).toBe(false);
		expect(validateReorderInput({ updates: [{ id: 'a' }] }).ok).toBe(false);
	});

	it('returns cleaned updates', () => {
		expect(validateReorderInput({ updates: [{ id: 'a', sortOrder: 0, junk: true }] })).toEqual({
			ok: true,
			updates: [{ id: 'a', sortOrder: 0 }]
		});
	});
});
