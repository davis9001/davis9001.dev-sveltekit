<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { onMount } from 'svelte';

	interface SpotifyStatus {
		hasTokens: boolean;
		hasClientCredentials: boolean;
		expiresInMinutes: number;
		expiresAt: string | null;
	}

	interface TestResult {
		success: boolean;
		error?: string;
		message?: string;
		recentTrack?: {
			name: string;
			artists: string;
			album: string;
			albumArt: string | null;
		} | null;
		tokenStatus?: {
			hasAccessToken: boolean;
			hasRefreshToken: boolean;
			expiresAt: string | null;
			expiresInMinutes: number;
		};
	}

	let status: SpotifyStatus | null = null;
	let loading = true;
	let statusError = '';
	let testing = false;
	let testResult: TestResult | null = null;
	let authorizing = false;

	async function loadStatus() {
		loading = true;
		statusError = '';
		try {
			const response = await fetch('/api/admin/spotify-status');
			if (!response.ok) {
				throw new Error('Failed to load Spotify status');
			}
			status = await response.json();
		} catch (err) {
			statusError = err instanceof Error ? err.message : 'Failed to load status';
		} finally {
			loading = false;
		}
	}

	async function testConnection() {
		testing = true;
		testResult = null;
		try {
			const response = await fetch('/admin/spotify/test');
			testResult = await response.json();
		} catch (err) {
			testResult = {
				success: false,
				error: err instanceof Error ? err.message : 'Test failed'
			};
		} finally {
			testing = false;
		}
	}

	function startAuthorize() {
		authorizing = true;
		window.location.href = '/admin/spotify/authorize';
	}

	onMount(() => {
		loadStatus();

		// Check if we're returning from a callback
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('success')) {
			testResult = {
				success: true,
				message: 'Spotify tokens generated successfully!'
			};
		} else if (urlParams.has('error')) {
			testResult = {
				success: false,
				error: urlParams.get('error') || 'Authorization failed'
			};
		}
	});
</script>

<SEO title="Spotify Token Management" description="Manage Spotify API tokens." path="/admin/spotify" />

<div class="spotify-admin">
	<h1>Spotify Token Management</h1>
	<p class="subtitle">Manage your Spotify API connection for the Now Playing widget.</p>

	{#if loading}
		<div class="loading-card">
			<div class="spinner"></div>
			<span>Loading Spotify status...</span>
		</div>
	{:else if statusError}
		<div class="error-card">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span>{statusError}</span>
			<button class="btn-secondary" on:click={loadStatus}>Retry</button>
		</div>
	{:else if status}
		<div class="status-grid">
			<!-- Client Credentials Card -->
			<div class="info-card">
				<h3>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
					</svg>
					Client Credentials
				</h3>
				{#if status.hasClientCredentials}
					<div class="status status-success">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 6L9 17l-5-5" />
						</svg>
						Configured
					</div>
					<p class="hint">SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set.</p>
				{:else}
					<div class="status status-warning">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						Not Configured
					</div>
					<p class="hint">
						Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment variables
						or Cloudflare dashboard.
					</p>
				{/if}
			</div>

			<!-- Token Status Card -->
			<div class="info-card">
				<h3>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 18V5l12-2v13" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="18" cy="16" r="3" />
					</svg>
					Token Status
				</h3>
				{#if status.hasTokens}
					<div class="info-row">
						<span class="label">Status:</span>
						<span class="value">
							{#if status.expiresInMinutes > 0}
								<span class="badge badge-success">Active</span>
							{:else}
								<span class="badge badge-warning">Expired</span>
							{/if}
						</span>
					</div>
					<div class="info-row">
						<span class="label">Expires:</span>
						<span class="value mono">
							{#if status.expiresInMinutes > 0}
								{status.expiresInMinutes} minutes
							{:else}
								Expired (will auto-refresh)
							{/if}
						</span>
					</div>
					<div class="status status-success">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 6L9 17l-5-5" />
						</svg>
						Tokens Stored
					</div>
				{:else}
					<div class="status status-warning">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						No Tokens
					</div>
					<p class="hint">Generate tokens to enable the Spotify widget.</p>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button
				class="btn-primary"
				on:click={startAuthorize}
				disabled={!status.hasClientCredentials || authorizing}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18V5l12-2v13" />
					<circle cx="6" cy="18" r="3" />
					<circle cx="18" cy="16" r="3" />
				</svg>
				{#if authorizing}
					Redirecting to Spotify...
				{:else if status.hasTokens}
					Regenerate Tokens
				{:else}
					Generate Spotify Tokens
				{/if}
			</button>

			{#if status.hasTokens}
				<button
					class="btn-secondary"
					on:click={testConnection}
					disabled={testing}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					{#if testing}
						Testing...
					{:else}
						Test Connection
					{/if}
				</button>
			{/if}
		</div>

		<!-- Test Result -->
		{#if testResult}
			<div class="test-result" class:success={testResult.success} class:error={!testResult.success}>
				{#if testResult.success}
					<h3>Connection Test Successful</h3>
					{#if testResult.message}
						<p>{testResult.message}</p>
					{/if}
					{#if testResult.recentTrack}
						<div class="track-info">
							<h4>Most Recently Played:</h4>
							<div class="track-detail">
								{#if testResult.recentTrack.albumArt}
									<img
										src={testResult.recentTrack.albumArt}
										alt="Album art"
										width="64"
										height="64"
										class="album-art"
									/>
								{/if}
								<div>
									<p class="track-name">{testResult.recentTrack.name}</p>
									<p class="track-artist">{testResult.recentTrack.artists}</p>
									<p class="track-album">{testResult.recentTrack.album}</p>
								</div>
							</div>
						</div>
					{:else if !testResult.message}
						<p>No recent tracks found.</p>
					{/if}
					{#if testResult.tokenStatus}
						<div class="token-detail">
							<h4>Token Details:</h4>
							<div class="info-row">
								<span class="label">Access Token:</span>
								<span class="value">{testResult.tokenStatus.hasAccessToken ? 'Present' : 'Missing'}</span>
							</div>
							<div class="info-row">
								<span class="label">Refresh Token:</span>
								<span class="value">{testResult.tokenStatus.hasRefreshToken ? 'Present' : 'Missing'}</span>
							</div>
							<div class="info-row">
								<span class="label">Expires In:</span>
								<span class="value mono">{testResult.tokenStatus.expiresInMinutes} minutes</span>
							</div>
						</div>
					{/if}
				{:else}
					<h3>Connection Test Failed</h3>
					<p class="error-text">{testResult.error || 'Unknown error'}</p>
					{#if testResult.message}
						<p class="error-detail">{testResult.message}</p>
					{/if}
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.spotify-admin {
		padding: var(--spacing-xl);
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		margin-bottom: var(--spacing-2xl);
	}

	.loading-card {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-xl);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-card {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: rgb(239, 68, 68);
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.info-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		transition: box-shadow var(--transition-fast);
	}

	.info-card:hover {
		box-shadow: var(--shadow-md);
	}

	.info-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.info-card h3 svg {
		color: var(--color-primary);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.info-row:last-of-type {
		border-bottom: none;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.value {
		font-size: 0.875rem;
		color: var(--color-text);
		font-weight: 500;
	}

	.mono {
		font-family: 'Courier New', monospace;
	}

	.badge {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.badge-success {
		background-color: rgba(34, 197, 94, 0.15);
		color: rgb(34, 197, 94);
	}

	.badge-warning {
		background-color: rgba(234, 179, 8, 0.15);
		color: rgb(234, 179, 8);
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-md);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-success {
		background-color: rgba(34, 197, 94, 0.1);
		color: rgb(34, 197, 94);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.status-warning {
		background-color: rgba(234, 179, 8, 0.1);
		color: rgb(234, 179, 8);
		border: 1px solid rgba(234, 179, 8, 0.3);
	}

	.hint {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-top: var(--spacing-sm);
		font-style: italic;
	}

	.actions {
		display: flex;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
		flex-wrap: wrap;
	}

	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-lg);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all var(--transition-fast);
	}

	.btn-primary {
		background-color: rgb(30, 215, 96);
		color: rgb(0, 0, 0);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: rgb(25, 185, 82);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--color-background);
		border-color: var(--color-text-secondary);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.test-result {
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		margin-top: var(--spacing-md);
	}

	.test-result.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.test-result.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.test-result h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.track-info {
		margin-top: var(--spacing-md);
	}

	.track-info h4,
	.token-detail h4 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.track-detail {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
	}

	.album-art {
		border-radius: var(--radius-sm);
	}

	.track-name {
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.track-artist {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin: 2px 0;
	}

	.track-album {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-style: italic;
		margin: 0;
	}

	.token-detail {
		margin-top: var(--spacing-lg);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}

	.error-text {
		color: rgb(239, 68, 68);
		font-weight: 500;
	}

	.error-detail {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-top: var(--spacing-xs);
	}
</style>
