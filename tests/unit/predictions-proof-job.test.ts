/**
 * Tests for the predictions timestamp-proof background job
 * ($lib/predictions/proof-job).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTimestampProofJob } from '../../src/lib/predictions/proof-job';

function makeItem(overrides: Record<string, unknown> = {}) {
	return {
		id: 'ci-1',
		title: 'The Future',
		slug: 'the-future',
		fields: { body: 'It will happen', date_window_start: null, date_window_end: null },
		...overrides
	} as any;
}

describe('runTimestampProofJob', () => {
	let mockDB: any;

	beforeEach(() => {
		mockDB = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ success: true })
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('records a successful timestamp proof and triggers a Wayback capture', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new Uint8Array([0, 1, 2]).buffer
		});

		await runTimestampProofJob(mockDB, makeItem(), 'https://davis9001.dev/predictions/the-future');

		// One UPDATE for the proof attempt, and the wayback save endpoint hit.
		const boundValues = mockDB.bind.mock.calls.flat();
		expect(boundValues).toContain(null); // error column should be null on success
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining('web.archive.org/save/'),
			expect.any(Object)
		);
	});

	it('records the TSA error and still triggers a Wayback capture when the request fails', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, status: 500 }) // requestTimestamp fails
			.mockResolvedValueOnce({ ok: true }); // wayback save

		await runTimestampProofJob(mockDB, makeItem(), 'https://davis9001.dev/predictions/the-future');

		const boundValues = mockDB.bind.mock.calls.flat();
		expect(boundValues.some((v: unknown) => typeof v === 'string' && v.length > 0)).toBe(true);
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it('never throws and still triggers Wayback when hash computation fails', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

		// crypto.subtle.digest is what computeCanonicalHash relies on — break it
		// to force the catch branch. Use vi.spyOn (not a raw reassignment) so
		// afterEach's vi.restoreAllMocks() cleans this up even if an assertion
		// below throws — a leaked digest mock would poison every other test file
		// sharing this worker.
		vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValue(new Error('boom'));

		await expect(
			runTimestampProofJob(mockDB, makeItem(), 'https://davis9001.dev/predictions/the-future')
		).resolves.toBeUndefined();

		const boundValues = mockDB.bind.mock.calls.flat();
		expect(boundValues).toContain('boom');
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining('web.archive.org/save/'),
			expect.any(Object)
		);
	});

	it('never throws even when recordTimestampProofAttempt itself rejects', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
		mockDB.run.mockRejectedValue(new Error('db unavailable'));

		await expect(
			runTimestampProofJob(mockDB, makeItem(), 'https://davis9001.dev/predictions/the-future')
		).resolves.toBeUndefined();
	});
});
