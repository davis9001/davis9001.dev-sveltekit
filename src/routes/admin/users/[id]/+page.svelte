<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const user = data.user;
	const oauthAccounts = data.oauthAccounts || [];
	const sessions = data.sessions || [];
	const activityLogs = data.activityLogs || [];
	const stats = data.stats || { totalSessions: 0, totalChatMessages: 0 };

	function formatDate(value: string) {
		return new Date(value).toLocaleString();
	}

	function prettyProvider(provider: string) {
		if (provider === 'github') {
			return 'GitHub';
		}
		if (provider === 'discord') {
			return 'Discord';
		}
		return provider;
	}

	function actorName(log: any) {
		return (
			log.actor_name ||
			log.actor_github_login ||
			log.actor_discord_username ||
			(log.actor_user_id ? `User ${log.actor_user_id}` : 'System')
		);
	}

	function parseMetadata(metadata: string | null) {
		if (!metadata) {
			return null;
		}
		try {
			return JSON.parse(metadata);
		} catch {
			return null;
		}
	}
</script>

<div class="details-page">
	<header class="header">
		<a href="/admin/users" class="back-link">← Back to users</a>
		<h1>{user.name || user.email}</h1>
		<p class="subhead">Comprehensive account activity and authentication details.</p>
	</header>

	<section class="card identity">
		<div class="avatar-wrap">
			{#if user.github_avatar_url || user.discord_avatar_url}
				<img src={user.github_avatar_url || user.discord_avatar_url} alt={user.name || user.email} class="avatar" />
			{:else}
				<div class="avatar-placeholder">{(user.name || user.email).charAt(0).toUpperCase()}</div>
			{/if}
		</div>
		<div>
			<p><strong>Email:</strong> {user.email}</p>
			<p><strong>GitHub:</strong> {user.github_login || 'Not connected'}</p>
			<p><strong>Discord:</strong> {user.discord_username || 'Not connected'}</p>
			<p><strong>Role:</strong> {user.is_admin ? 'Admin' : 'User'}</p>
			<p><strong>Joined:</strong> {formatDate(user.created_at)}</p>
		</div>
	</section>

	<section class="grid">
		<div class="card stat">
			<h2>Logins</h2>
			<p>{stats.totalSessions}</p>
		</div>
		<div class="card stat">
			<h2>Chat Messages</h2>
			<p>{stats.totalChatMessages}</p>
		</div>
		<div class="card stat">
			<h2>Activity Events</h2>
			<p>{activityLogs.length}</p>
		</div>
	</section>

	<section class="card">
		<h2>Linked Accounts</h2>
		{#if oauthAccounts.length === 0}
			<p class="muted">No OAuth accounts linked.</p>
		{:else}
			<ul class="plain-list">
				{#each oauthAccounts as account}
					<li>
						<strong>{prettyProvider(account.provider)}:</strong> {account.provider_account_id}
						<span class="muted">({formatDate(account.created_at)})</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<h2>Login History</h2>
		{#if sessions.length === 0}
			<p class="muted">No login sessions recorded yet.</p>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Started</th>
							<th>Expires</th>
						</tr>
					</thead>
					<tbody>
						{#each sessions as session}
							<tr>
								<td>{formatDate(session.created_at)}</td>
								<td>{formatDate(session.expires_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="card">
		<h2>Actions Timeline</h2>
		{#if activityLogs.length === 0}
			<p class="muted">No activity logged yet.</p>
		{:else}
			<ul class="timeline">
				{#each activityLogs as log}
					<li>
						<div class="timeline-row">
							<span class="event">{log.action_label}</span>
							<span class="time">{formatDate(log.created_at)}</span>
						</div>
						<div class="meta">By {actorName(log)}</div>
						{#if parseMetadata(log.metadata)}
							<pre>{JSON.stringify(parseMetadata(log.metadata), null, 2)}</pre>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.details-page {
		width: 100%;
		display: grid;
		gap: var(--spacing-lg);
	}

	.header h1 {
		margin: var(--spacing-sm) 0;
		color: var(--color-text);
	}

	.subhead,
	.muted {
		color: var(--color-text-secondary);
	}

	.back-link {
		color: var(--color-primary);
		text-decoration: none;
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
	}

	.identity {
		display: flex;
		gap: var(--spacing-lg);
		align-items: center;
	}

	.avatar-wrap {
		flex-shrink: 0;
	}

	.avatar,
	.avatar-placeholder {
		width: 72px;
		height: 72px;
		border-radius: 50%;
	}

	.avatar {
		object-fit: cover;
	}

	.avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		background: var(--color-primary);
		color: var(--color-background);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-md);
	}

	.stat h2 {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-secondary);
	}

	.stat p {
		margin: var(--spacing-sm) 0 0;
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.plain-list {
		margin: 0;
		padding-left: 1rem;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--spacing-md);
	}

	.timeline li {
		padding: var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
	}

	.timeline-row {
		display: flex;
		justify-content: space-between;
		gap: var(--spacing-md);
	}

	.event {
		font-weight: 600;
		color: var(--color-text);
	}

	.time,
	.meta {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	pre {
		margin: var(--spacing-sm) 0 0;
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		font-size: 0.8rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.identity {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
