import type { D1Database } from '@cloudflare/workers-types';

export const DEFAULT_DATABASE_APP_ID = 'davis9001.dev-sveltekit';

const verifiedDatabases = new WeakSet<D1Database>();

interface DatabaseIdentityRow {
	value: string;
}

interface AssertDatabaseIdentityOptions {
	expectedAppId?: string;
}

export async function assertDatabaseIdentity(
	db: D1Database | null | undefined,
	options: AssertDatabaseIdentityOptions = {}
): Promise<void> {
	if (!db || verifiedDatabases.has(db)) {
		return;
	}

	const expectedAppId = options.expectedAppId || DEFAULT_DATABASE_APP_ID;
	let row: DatabaseIdentityRow | null;

	try {
		row = await db
			.prepare('SELECT value FROM app_metadata WHERE key = ?')
			.bind('app_id')
			.first<DatabaseIdentityRow>();
	} catch (err) {
		const message = String((err as Error)?.message || err || '');

		if (message.includes('no such table: app_metadata')) {
			throw new Error(
				'Database identity table is missing. Apply the latest D1 migrations before serving this app.'
			);
		}

		throw err;
	}

	if (!row?.value) {
		throw new Error(
			`Database identity is not initialized. Expected app_id '${expectedAppId}'.`
		);
	}

	if (row.value !== expectedAppId) {
		throw new Error(
			`Database identity mismatch. Expected '${expectedAppId}' but found '${row.value}'.`
		);
	}

	verifiedDatabases.add(db);
}

export function shouldEnforceDatabaseIdentity(hostname: string): boolean {
	return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0';
}