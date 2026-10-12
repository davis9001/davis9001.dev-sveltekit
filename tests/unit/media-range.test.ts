import { describe, it, expect } from 'vitest';
import { parseByteRange } from '$lib/server/media-range';

describe('parseByteRange', () => {
	it('serves the whole object without a usable header', () => {
		expect(parseByteRange(null, 100)).toBeNull();
		expect(parseByteRange('items=0-5', 100)).toBeNull();
		expect(parseByteRange('bytes=-', 100)).toBeNull();
		expect(parseByteRange('bytes=0-1,4-5', 100)).toBeNull();
		expect(parseByteRange('bytes=9-3', 100)).toBeNull();
	});

	it('resolves closed, open-ended and suffix ranges', () => {
		expect(parseByteRange('bytes=0-9', 100)).toEqual({ offset: 0, length: 10 });
		expect(parseByteRange('bytes=90-', 100)).toEqual({ offset: 90, length: 10 });
		expect(parseByteRange('bytes=95-500', 100)).toEqual({ offset: 95, length: 5 });
		expect(parseByteRange('bytes=-10', 100)).toEqual({ offset: 90, length: 10 });
		expect(parseByteRange('bytes=-500', 100)).toEqual({ offset: 0, length: 100 });
	});

	it('flags ranges that cannot be satisfied', () => {
		expect(parseByteRange('bytes=100-', 100)).toBe('unsatisfiable');
		expect(parseByteRange('bytes=-0', 100)).toBe('unsatisfiable');
	});
});
