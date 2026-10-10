<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import {
		closeCommandPalette,
		showCommandPalette,
		toggleCommandPalette
	} from '$lib/stores/commandPalette';
	import { resolvedTheme } from '$lib/stores/theme';
	import { onMount } from 'svelte';
	import '../app.css';
	import type { PageData } from './$types';

	export let data: PageData;

	// Pages where we don't show the footer (full-screen experiences)
	$: hideFooter =
		$page.url.pathname.startsWith('/chat') ||
		$page.url.pathname.startsWith('/admin') ||
		$page.url.pathname.startsWith('/setup');

	// Home page has its own full-screen layout (no nav, no footer)
	$: isHomePage = $page.url.pathname === '/';

	// Standalone full-screen pages (no nav, no footer)
	$: isStandalonePage =
		$page.url.pathname === '/' ||
		$page.url.pathname === '/lifeofastranger' ||
		$page.url.pathname === '/resume' ||
		$page.url.pathname.startsWith('/hidden') ||
		$page.url.pathname.startsWith('/updates') ||
		$page.url.pathname.startsWith('/update') ||
		$page.url.pathname.startsWith('/portfolio');

	// Subscribe to theme changes and apply to DOM
	// URL params ?dark / ?light override for headless PDF generation
	if (browser) {
		const _printParams = new URLSearchParams(location.search);
		const _forcedTheme = _printParams.has('dark') ? 'dark' : _printParams.has('light') ? 'light' : null;
		if (_forcedTheme) {
			document.documentElement.setAttribute('data-theme', _forcedTheme);
		}
		resolvedTheme.subscribe((theme) => {
			if (!_forcedTheme) {
				document.documentElement.setAttribute('data-theme', theme);
			}
		});
	}

	onMount(() => {
		// Listen for keyboard shortcut (Cmd/Ctrl + K)
		const handleKeydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				toggleCommandPalette();
			}
			if (e.key === 'Escape') {
				closeCommandPalette();
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Viewport beacon (admin stats "Viewports" card; docs/ADMIN_STATS.md).
	// Reports the bucketed window width once per session — viewport is the one
	// audience dimension request headers can't supply. Cookieless: the server
	// stores only a daily bucket counter. Admin/setup surfaces are excluded, the
	// same way the page-view hook excludes them.
	if (browser) {
		try {
			const path = window.location.pathname;
			const excluded = path.startsWith('/admin') || path.startsWith('/setup');
			if (!excluded && !sessionStorage.getItem('nk-vp-sent')) {
				sessionStorage.setItem('nk-vp-sent', '1');
				fetch('/api/stats/viewport', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ width: window.innerWidth }),
					keepalive: true
				}).catch(() => {});
			}
		} catch {
			// sessionStorage unavailable (private-mode edge cases) — skip silently.
		}
	}
</script>

{#if isStandalonePage}
	<slot />
{:else}
	<div class="app">
		<Navigation user={data.user} hasAuthConfig={data.hasAuthConfig} onCommandPaletteClick={toggleCommandPalette} />

		<main>
			<slot />
		</main>

		{#if !hideFooter}
			<Footer />
		{/if}
	</div>
{/if}

<GoogleAnalytics measurementId={data.gaMeasurementId ?? null} />

<CommandPalette bind:show={$showCommandPalette} hasAIProviders={data.hasAIProviders} portfolioItems={data.portfolioItems} cmsCommands={data.cmsPaletteItems} initialProjects={data.openProjects} />

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		padding-bottom: var(--spacing-2xl);
	}

	/* In three-column reading the page is exactly the window, so padding under
	   the article is not spacing — it is reading height, taken from the
	   columns and shown as a dead band above the footer. */
	main:has(:global(.river-active)) {
		padding-bottom: 0;
	}
</style>
