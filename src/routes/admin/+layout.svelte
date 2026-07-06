<script lang="ts">
	import { page } from '$app/stores';

	const navItems = [
		{ path: '/admin', label: 'Dashboard', icon: 'home' },
		{ path: '/admin/projects', label: 'Projects', icon: 'rocket' },
		{ path: '/admin/users', label: 'Users', icon: 'users' },
		{ path: '/admin/auth-keys', label: 'Auth Keys', icon: 'key' },
		{ path: '/admin/ai-keys', label: 'AI Keys', icon: 'sparkles' },
		{ path: '/admin/cms', label: 'CMS', icon: 'document' },
		{ path: '/admin/spotify', label: 'Spotify', icon: 'music' }
	];
</script>

<div class="admin-layout">
	<aside class="admin-sidebar">
		<h2 class="admin-title">Admin Settings</h2>
		<nav class="admin-nav">
			{#each navItems as item}
				<a
					href={item.path}
					class="nav-item"
					class:active={$page.url.pathname === item.path}
					aria-current={$page.url.pathname === item.path ? 'page' : undefined}
				>
					{#if item.icon === 'home'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
					{:else if item.icon === 'rocket'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
							/>
							<path
								d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
							/>
							<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
							<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
						</svg>
					{:else if item.icon === 'users'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					{:else if item.icon === 'key'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
							/>
						</svg>
					{:else if item.icon === 'sparkles'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M12 3v18m0-18l-3 3m3-3l3 3M3 12h18M3 12l3-3m-3 3l3 3m12-3l-3-3m3 3l-3 3" />
						</svg>
					{:else if item.icon === 'document'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<polyline points="10 9 9 9 8 9" />
						</svg>
					{:else if item.icon === 'music'}
						<svg
							class="nav-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M9 18V5l12-2v13" />
							<circle cx="6" cy="18" r="3" />
							<circle cx="18" cy="16" r="3" />
						</svg>
					{/if}
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>
	</aside>
	<main class="admin-content">
		<slot />
	</main>
</div>

<style>
	.admin-layout {
		display: flex;
		min-height: 100vh;
		width: 100%;
		background: var(--color-background);
	}

	.admin-sidebar {
		width: clamp(220px, 20vw, 280px);
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		padding: var(--spacing-lg);
	}

	.admin-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-xl);
	}

	.admin-nav {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: all var(--transition-fast);
	}

	.nav-item span {
		white-space: nowrap;
	}

	.nav-item:hover {
		background: var(--color-background);
		color: var(--color-text);
	}

	.nav-item.active {
		background: var(--color-primary);
		color: var(--color-background);
	}

	.nav-icon {
		flex-shrink: 0;
	}

	.admin-content {
		flex: 1;
		min-width: 0;
		width: 100%;
		padding: var(--spacing-xl);
	}

	@media (max-width: 1024px) {
		.admin-layout {
			flex-direction: column;
		}

		.admin-sidebar {
			width: 100%;
			padding: var(--spacing-md);
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}

		.admin-title {
			margin-bottom: var(--spacing-md);
		}

		.admin-nav {
			flex-direction: row;
			overflow-x: auto;
			gap: var(--spacing-xs);
			padding-bottom: var(--spacing-xs);
		}

		.nav-item {
			padding: var(--spacing-sm) var(--spacing-md);
			flex-shrink: 0;
		}

		.admin-content {
			padding: var(--spacing-lg);
		}
	}

	@media (max-width: 640px) {
		.admin-content {
			padding: var(--spacing-md);
		}

		.nav-item span {
			display: none;
		}

		.nav-item {
			padding: var(--spacing-sm);
		}
	}
</style>
