type D1Database = App.Platform['env']['DB'];

const DEFAULT_SESSION_DAYS = 7;

interface LogUserActivityParams {
	db: D1Database;
	userId: string;
	actionType: string;
	actionLabel: string;
	actorUserId?: string;
	metadata?: Record<string, unknown>;
}

export async function createSessionRecord(
	db: D1Database,
	userId: string,
	expiresInDays: number = DEFAULT_SESSION_DAYS
): Promise<void> {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
		.bind(crypto.randomUUID(), userId, expiresAt.toISOString())
		.run();
}

export async function logUserActivity({
	db,
	userId,
	actionType,
	actionLabel,
	actorUserId,
	metadata
}: LogUserActivityParams): Promise<void> {
	const safeMetadata = metadata ? JSON.stringify(metadata) : null;

	await db
		.prepare(
			`INSERT INTO user_activity_logs (id, user_id, actor_user_id, action_type, action_label, metadata, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
		)
		.bind(crypto.randomUUID(), userId, actorUserId || null, actionType, actionLabel, safeMetadata)
		.run();
}

export async function recordLoginActivity(
	db: D1Database,
	userId: string,
	provider: 'github' | 'discord'
): Promise<void> {
	await createSessionRecord(db, userId);
	await logUserActivity({
		db,
		userId,
		actionType: 'auth.login',
		actionLabel: `Logged in with ${provider === 'github' ? 'GitHub' : 'Discord'}`,
		metadata: { provider }
	});
}
