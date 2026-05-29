<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let user = data.user;
	let oauthAccounts = data.oauthAccounts || [];
	let sessions = data.sessions || [];
	let activityLogs = data.activityLogs || [];
	let stats = data.stats || { totalSessions: 0, totalChatMessages: 0 };

	let name = user.name || '';
	let email = user.email || '';
	let githubLogin = user.github_login || '';
	let githubAvatarUrl = user.github_avatar_url || '';
	let discordUsername = user.discord_username || '';
	let discordAvatarUrl = user.discord_avatar_url || '';
	let isAdmin = Boolean(user.is_admin);
	let isSaving = false;
	let saveMessage = '';
	let saveError = '';

	function formatDate(value: string) {
		return new Date(value).toLocaleString();
	}

	function formatMaybeDate(value: string | null | undefined) {
		return value ? formatDate(value) : 'Not available';
	}

	function syncFormFromUser(nextUser: typeof user) {
		name = nextUser.name || '';
		email = nextUser.email || '';
		githubLogin = nextUser.github_login || '';
		githubAvatarUrl = nextUser.github_avatar_url || '';
		discordUsername = nextUser.discord_username || '';
		discordAvatarUrl = nextUser.discord_avatar_url || '';
		isAdmin = Boolean(nextUser.is_admin);
	}

	async function saveUser() {
		isSaving = true;
		saveMessage = '';
		saveError = '';

		try {
			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					email,
					githubLogin,
					githubAvatarUrl,
					discordUsername,
					discordAvatarUrl,
					isAdmin
				})
			});

			const result = await response.json();

			if (!response.ok) {
				saveError = result.message || 'Failed to update user';
				return;
			}

			user = result.user || user;
			syncFormFromUser(user);
			if (result.activityLog) {
				activityLogs = [result.activityLog, ...activityLogs];
			}
			stats = {
				...stats
			};
			saveMessage = result.message || 'User updated successfully';
		} catch (error) {
			console.error('Failed to save user:', error);
			saveError = 'Failed to update user';
		} finally {
			isSaving = false;
		}
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
			<p><strong>Updated:</strong> {formatMaybeDate(user.updated_at)}</p>
		</div>
	</section>

	<section class="card edit-card">
		<div class="section-heading">
			<h2>Edit user data</h2>
			<p class="muted">Use this to backfill legacy records and normalize whatever profile data we already have.</p>
		</div>

		<form class="edit-form" on:submit|preventDefault={saveUser}>
			<div class="form-grid">
				<label>
					<span>Full name</span>
					<input bind:value={name} type="text" placeholder="Name from auth provider" />
				</label>
				<label>
					<span>Email</span>
					<input bind:value={email} type="email" placeholder="user@example.com" required />
				</label>
				<label>
					<span>GitHub login</span>
					<input bind:value={githubLogin} type="text" placeholder="octocat" />
				</label>
				<label>
					<span>GitHub avatar URL</span>
					<input bind:value={githubAvatarUrl} type="url" placeholder="https://avatars.githubusercontent.com/..." />
				</label>
				<label>
					<span>Discord username</span>
					<input bind:value={discordUsername} type="text" placeholder="discord-handle" />
				</label>
				<label>
					<span>Discord avatar URL</span>
					<input bind:value={discordAvatarUrl} type="url" placeholder="https://cdn.discordapp.com/..." />
				</label>
			</div>

			<div class="form-footer">
				<label class="checkbox">
					<input bind:checked={isAdmin} type="checkbox" />
					<span>Admin access</span>
				</label>

				<div class="form-actions">
					{#if saveError}
						<p class="form-feedback error">{saveError}</p>
					{/if}
					{#if saveMessage}
						<p class="form-feedback success">{saveMessage}</p>
					{/if}
					<button class="save-button" type="submit" disabled={isSaving}>
						{isSaving ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</div>
		</form>
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

	.section-heading h2 {
		margin: 0;
	}

	.section-heading p {
		margin: var(--spacing-xs) 0 0;
	}

	.identity {
		display: flex;
		gap: var(--spacing-lg);
		align-items: center;
	}

	.edit-card {
		display: grid;
		gap: var(--spacing-md);
	}

	.edit-form {
		display: grid;
		gap: var(--spacing-md);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-md);
	}

	.form-grid label,
	.checkbox {
		display: grid;
		gap: var(--spacing-xs);
		color: var(--color-text-secondary);
		font-size: 0.95rem;
	}

	.form-grid input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-background);
		color: var(--color-text);
	}

	.form-grid input:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.form-footer {
		display: flex;
		justify-content: space-between;
		gap: var(--spacing-md);
		align-items: end;
		flex-wrap: wrap;
	}

	.checkbox {
		grid-auto-flow: column;
		align-items: center;
		justify-content: start;
		color: var(--color-text);
	}

	.form-actions {
		display: grid;
		justify-items: end;
		gap: var(--spacing-sm);
	}

	.form-feedback {
		margin: 0;
		font-size: 0.9rem;
	}

	.form-feedback.success {
		color: var(--color-primary);
	}

	.form-feedback.error {
		color: var(--color-danger, var(--color-text));
	}

	.save-button {
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 0;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-background);
		font-weight: 600;
		cursor: pointer;
	}

	.save-button:disabled {
		opacity: 0.7;
		cursor: progress;
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

		.form-grid {
			grid-template-columns: 1fr;
		}

		.identity {
			flex-direction: column;
			align-items: flex-start;
		}

		.form-footer {
			align-items: start;
		}
	}
</style>
