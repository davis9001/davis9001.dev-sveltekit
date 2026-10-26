import { describe, expect, it } from 'vitest';
import { errorCopy } from '$lib/utils/error-copy';

describe('errorCopy', () => {
	it('has copy for each common status', () => {
		for (const s of [400, 401, 403, 404, 405, 429, 500, 502, 503, 504]) {
			const c = errorCopy(s);
			expect(c.title.length).toBeGreaterThan(0);
			expect(c.message.length).toBeGreaterThan(0);
		}
	});

	it('uses the fallback message for unknown 4xx', () => {
		expect(errorCopy(418, 'teapot').message).toBe('teapot');
		expect(errorCopy(418).message).toBe('That did not work.');
	});

	it('hides internals for unknown 5xx', () => {
		expect(errorCopy(599, 'stack trace here').message).not.toContain('stack');
	});
});
