/**
 * Tests for prediction date-window formatting ($lib/predictions/format)
 */
import { describe, expect, it } from 'vitest';
import { formatDateWindow } from '../../src/lib/predictions/format';

describe('formatDateWindow', () => {
	it('formats a full range', () => {
		expect(formatDateWindow('2027-03-01', '2027-06-01')).toBe('Between March 2027 and June 2027');
	});

	it('formats an end-only window', () => {
		expect(formatDateWindow(null, '2027-06-01')).toBe('By June 2027');
	});

	it('formats a start-only window', () => {
		expect(formatDateWindow('2028-03-01', null)).toBe('Sometime after March 2028');
	});

	it('returns an empty string when neither is set', () => {
		expect(formatDateWindow(null, null)).toBe('');
	});

	it('treats undefined the same as null', () => {
		expect(formatDateWindow(undefined, undefined)).toBe('');
	});

	it('treats an empty string the same as unset', () => {
		expect(formatDateWindow('', '')).toBe('');
	});
});
