<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import Footer from '$lib/components/Footer.svelte';
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
		$page.url.pathname.startsWith('/updates') ||
		$page.url.pathname.startsWith('/portfolio');

	// Subscribe to theme changes and apply to DOM
	if (browser) {
		resolvedTheme.subscribe((theme) => {
			document.documentElement.setAttribute('data-theme', theme);
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

<CommandPalette bind:show={$showCommandPalette} hasAIProviders={data.hasAIProviders} />

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
</style>
