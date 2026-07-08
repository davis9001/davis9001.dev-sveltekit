<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let configured = data.configured;
	let maskedToken = data.maskedToken;
	let login = data.login;
	let token = '';
	let saving = false;
	let clearing = false;
	let errorMessage = '';
	let savedFlash = false;

	async function save() {
		if (!token.trim()) {
			errorMessage = 'Paste a token first.';
			return;
		}
		errorMessage = '';
		saving = true;
		try {
			const res = await fetch('/api/admin/github-sync-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: token.trim() })
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				configured = true;
				login = body.login;
				maskedToken = `••••${token.trim().slice(-4)}`;
				token = '';
				savedFlash = true;
				setTimeout(() => (savedFlash = false), 2500);
			} else {
				errorMessage = body.message || 'Failed to save token';
			}
		} catch {
			errorMessage = 'Failed to save token';
		} finally {
			saving = false;
		}
	}

	async function clear() {
		clearing = true;
		try {
			const res = await fetch('/api/admin/github-sync-config', { method: 'DELETE' });
			if (res.ok) {
				configured = false;
				maskedToken = null;
				login = null;
			} else {
				errorMessage = 'Failed to clear token';
			}
		} catch {
			errorMessage = 'Failed to clear token';
		} finally {
			clearing = false;
		}
	}
</script>

<SEO
	title="GitHub Sync - Admin"
	description="Configure the GitHub token used to sync Open Projects tasks with GitHub Projects v2 boards."
	path="/admin/github-sync"
/>

<div class="sync-page">
	<header class="page-header">
		<h1>GitHub Sync</h1>
		<p class="page-description">
			A classic personal access token used to sync Open Projects tasks with GitHub Projects v2
			boards and Issues. Needs the <code>repo</code> and <code>project</code> scopes; add
			<code>read:org</code> too if you want organization boards to show up in the board picker on a project's
			edit page.
		</p>
	</header>

	{#if errorMessage}
		<div class="error-toast" role="alert">{errorMessage}</div>
	{/if}

	<div class="form-card">
		<div class="status-row">
			<span class="status-label">Status</span>
			{#if configured}
				<span class="status-badge status-configured">Configured{login ? ` — ${login}` : ''}</span>
			{:else}
				<span class="status-badge status-unconfigured">Not configured</span>
			{/if}
		</div>

		{#if configured && maskedToken}
			<div class="form-group">
				<span class="label">Current token</span>
				<code class="masked-token">{maskedToken}</code>
			</div>
		{/if}

		<div class="form-group">
			<label for="pat-input">{configured ? 'Replace token' : 'Token'}</label>
			<input
				id="pat-input"
				type="password"
				bind:value={token}
				placeholder="ghp_..."
				autocomplete="off"
			/>
		</div>

		<div class="form-actions">
			{#if savedFlash}
				<span class="saved-flash" role="status">Saved ✓</span>
			{/if}
			<button class="btn btn-primary" on:click={save} disabled={saving}>
				{saving ? 'Saving...' : 'Save'}
			</button>
			{#if configured}
				<button class="btn btn-danger-outline" on:click={clear} disabled={clearing}>
					{clearing ? 'Clearing...' : 'Clear token'}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.sync-page {
		width: 100%;
		max-width: 640px;
	}

	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.page-description {
		color: var(--color-text-secondary);
		font-size: 1rem;
		line-height: 1.5;
	}

	.error-toast {
		padding: var(--spacing-sm) var(--spacing-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid #ef4444;
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: 0.875rem;
		margin-bottom: var(--spacing-md);
	}

	.form-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.status-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.status-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.status-configured {
		background: rgba(34, 197, 94, 0.12);
		color: var(--color-success, #22c55e);
	}

	.status-unconfigured {
		background: var(--color-background);
		color: var(--color-text-secondary);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.form-group .label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.masked-token {
		font-family: monospace;
		font-size: 0.875rem;
		padding: var(--spacing-sm);
		background: var(--color-background);
		border-radius: var(--radius-md);
		width: fit-content;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.form-group input {
		width: 100%;
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.9375rem;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.saved-flash {
		color: var(--color-success, #22c55e);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		font-weight: 500;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--color-background);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-danger-outline {
		background: none;
		border-color: #ef4444;
		color: #ef4444;
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
	}
</style>
