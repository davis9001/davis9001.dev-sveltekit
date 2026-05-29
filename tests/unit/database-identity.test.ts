import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('database identity guard', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('accepts a matching app identity', async () => {
		const first = vi.fn().mockResolvedValue({ value: 'davis9001.dev-sveltekit' });
		const bind = vi.fn().mockReturnValue({ first });
		const prepare = vi.fn().mockReturnValue({ bind });

		const { assertDatabaseIdentity } = await import('../../src/lib/server/database-identity');

		await expect(assertDatabaseIdentity({ prepare } as any)).resolves.toBeUndefined();
		expect(prepare).toHaveBeenCalledWith('SELECT value FROM app_metadata WHERE key = ?');
		expect(bind).toHaveBeenCalledWith('app_id');
	});

	it('rejects an uninitialized database identity', async () => {
		const prepare = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null)
			})
		});

		const { assertDatabaseIdentity } = await import('../../src/lib/server/database-identity');

		await expect(assertDatabaseIdentity({ prepare } as any)).rejects.toThrow(
			"Database identity is not initialized. Expected app_id 'davis9001.dev-sveltekit'."
		);
	});

	it('rejects a mismatched database identity', async () => {
		const prepare = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue({ value: 'agapeverse-nebulakit' })
			})
		});

		const { assertDatabaseIdentity } = await import('../../src/lib/server/database-identity');

		await expect(assertDatabaseIdentity({ prepare } as any)).rejects.toThrow(
			"Database identity mismatch. Expected 'davis9001.dev-sveltekit' but found 'agapeverse-nebulakit'."
		);
	});

	it('surfaces a missing migration table clearly', async () => {
		const prepare = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockRejectedValue(new Error('no such table: app_metadata'))
			})
		});

		const { assertDatabaseIdentity } = await import('../../src/lib/server/database-identity');

		await expect(assertDatabaseIdentity({ prepare } as any)).rejects.toThrow(
			'Database identity table is missing. Apply the latest D1 migrations before serving this app.'
		);
	});

	it('skips identity enforcement for localhost hosts', async () => {
		const { shouldEnforceDatabaseIdentity } = await import('../../src/lib/server/database-identity');

		expect(shouldEnforceDatabaseIdentity('localhost')).toBe(false);
		expect(shouldEnforceDatabaseIdentity('127.0.0.1')).toBe(false);
		expect(shouldEnforceDatabaseIdentity('0.0.0.0')).toBe(false);
		expect(shouldEnforceDatabaseIdentity('davis9001.dev')).toBe(true);
	});
});