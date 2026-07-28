<script lang="ts">
	import ResumeContent from '$lib/components/ResumeContent.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import { fitSheetToPage, type FitResult } from '$lib/utils/fit-to-page';
	import { onMount } from 'svelte';

	let asciiCharacters: string[] = [];

	const ASCII_CHAR_START = 42;
	const ASCII_CHAR_END = 4200;
	const ASCII_CHUNK_SIZE = 220;

	/** Sheet element — the fixed 8.5in-wide copy of the résumé that prints. */
	let sheetEl: HTMLDivElement;
	/** Show the print sheet on screen instead of the web layout. */
	let previewMode = false;
	let fit: FitResult | null = null;

	function populateAsciiCharactersProgressively() {
		asciiCharacters = [];
		let currentCodePoint = ASCII_CHAR_START;
		const appendChunk = () => {
			const chunk: string[] = [];
			const max = Math.min(currentCodePoint + ASCII_CHUNK_SIZE - 1, ASCII_CHAR_END);
			for (; currentCodePoint <= max; currentCodePoint++) {
				chunk.push(String.fromCharCode(currentCodePoint));
			}
			asciiCharacters = [...asciiCharacters, ...chunk];
			if (currentCodePoint <= ASCII_CHAR_END) setTimeout(appendChunk, 0);
		};
		appendChunk();
	}

	/**
	 * Solve for the type scale that makes the sheet exactly one page tall.
	 * Cheap (a dozen synchronous layout reads on an off-screen subtree), so it
	 * runs on mount, after webfonts settle, on content changes, and once more
	 * right before the browser paginates.
	 */
	function refit() {
		if (!sheetEl) return;
		fit = fitSheetToPage(sheetEl);
	}

	onMount(() => {
		// Force theme for headless PDF generation via URL param
		const params = new URLSearchParams(window.location.search);
		if (params.has('dark')) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else if (params.has('light')) {
			document.documentElement.removeAttribute('data-theme');
		}
		previewMode = params.has('preview');

		requestAnimationFrame(() => populateAsciiCharactersProgressively());
		const s = document.createElement('script');
		s.src = '/ascii-animate.js';
		document.head.appendChild(s);

		let frame = 0;
		const scheduleRefit = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(refit);
		};

		refit();
		// Webfonts land after first paint and change every line box.
		document.fonts?.ready.then(scheduleRefit);
		// Any future edit to the résumé re-solves the scale by itself. Attribute
		// mutations are deliberately not watched — refit() writes one.
		const observer = new MutationObserver(scheduleRefit);
		observer.observe(sheetEl, { childList: true, characterData: true, subtree: true });
		window.addEventListener('beforeprint', refit);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('beforeprint', refit);
		};
	});
</script>

<svelte:head>
	<title>David Monaghan — Résumé</title>
	<meta
		name="description"
		content="Full-Stack Software Engineer · Community Architect · Founder. Clarkdale, Arizona."
	/>
</svelte:head>

<main class="resume-shell relative text-foreground bg-primary/5 dark:bg-primary/100 min-h-screen">
	<!-- Controls -->
	<div class="resume-actions no-print">
		<button class="resume-action" on:click={() => (previewMode = !previewMode)}>
			{previewMode ? 'Web view' : 'Page view'}
		</button>
		<button class="resume-action" on:click={() => window.print()}>Print / PDF</button>
		<ThemeSwitcher variant="inline" simpleToggle={true} />
	</div>

	<!-- ASCII signal-field background -->
	<div
		class="no-print fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-23 sm:grid-cols-42 lg:grid-cols-99 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen"
		aria-hidden="true"
	>
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">{char}</div>
		{/each}
	</div>

	<!-- ─── Web layout ─────────────────────────────────────────── -->
	<div class="web-layer relative z-40 resume-page" class:is-hidden={previewMode}>
		<div class="resume-card bg-background/70 backdrop-blur-sm">
			<ResumeContent />
		</div>
	</div>

	<!--
		Print sheet. Always rendered at true page width so its height can be
		measured for real; parked off-screen unless previewing. This — not the
		web layout — is what goes to the printer.
	-->
	<div
		class="sheet-host relative z-40"
		class:preview={previewMode}
		aria-hidden={previewMode ? null : 'true'}
	>
		<div class="resume-sheet" bind:this={sheetEl}>
			<ResumeContent mode="sheet" />
		</div>
	</div>

	{#if previewMode}
		<p class="fit-readout no-print">
			one page · type scale {fit ? Math.round(fit.scale * 100) : 100}%
			{#if fit && !fit.fits}
				<span class="fit-warn">— content overflows even at minimum size, trim something</span>
			{/if}
		</p>
	{/if}
</main>

<style>
	/* ── Controls ─────────────────────────────────────────────── */
	.resume-actions {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 50;
		margin: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.resume-action {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.45rem 0.7rem;
		border-radius: 0.4rem;
		border: 1px solid hsla(var(--foreground), 0.15);
		background: hsla(var(--background), 0.7);
		color: hsla(var(--foreground), 0.75);
		backdrop-filter: blur(4px);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.resume-action:hover {
		color: hsla(var(--accent));
		border-color: hsla(var(--accent), 0.5);
	}

	/* ── Web layer ────────────────────────────────────────────── */
	.resume-page {
		padding: 2rem 1rem 3rem;
	}

	.is-hidden {
		display: none;
	}

	.resume-card {
		max-width: 72rem;
		margin: 0 auto;
		border: 1px solid hsla(var(--foreground), 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 12px 40px hsla(var(--background), 0.5);
		overflow: hidden;
	}

	@media (min-width: 768px) {
		.resume-page {
			padding: 2.5rem 1.5rem 4rem;
		}
	}

	/* ── Print sheet ──────────────────────────────────────────────
	   Fixed at the real page width so what is measured on screen is
	   exactly what the printer lays out. Gutters are page padding
	   rather than @page margin, so they survive the print dialog's
	   "Margins: None" and never land in a printer's dead zone.
	   ─────────────────────────────────────────────────────────── */
	.sheet-host {
		position: fixed;
		top: 0;
		left: -20000px;
		width: 8.5in;
		visibility: hidden;
		pointer-events: none;
	}

	.sheet-host.preview {
		position: relative;
		top: auto;
		left: auto;
		visibility: visible;
		pointer-events: auto;
		margin: 2.5rem auto 1rem;
		min-height: 11in;
		background: #ffffff;
		box-shadow: 0 18px 60px hsla(var(--background), 0.6);
	}

	.resume-sheet {
		--s: 1;
		width: 8.5in;
		box-sizing: border-box;
		padding: 0.25in 0.3in;
		background: #ffffff;
	}

	:global([data-theme='dark']) .sheet-host.preview,
	:global([data-theme='dark']) .resume-sheet {
		background: #0f0c16;
	}

	.fit-readout {
		position: relative;
		z-index: 40;
		text-align: center;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: hsla(var(--foreground), 0.45);
		padding-bottom: 3rem;
	}

	.fit-warn {
		color: hsla(var(--secondary));
		text-transform: none;
		letter-spacing: 0.02em;
	}

	/* ── Print ────────────────────────────────────────────────────
	   The sheet is already solved to one page, so printing is just:
	   strip the chrome, unpark the sheet, keep colors.
	   ─────────────────────────────────────────────────────────── */
	@media print {
		@page {
			size: 8.5in 11in;
			margin: 0;
		}

		.no-print,
		.web-layer {
			display: none !important;
		}

		:global(html),
		:global(body) {
			background: #ffffff !important;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		main {
			background: #ffffff !important;
			min-height: 0 !important;
		}

		.sheet-host {
			position: static !important;
			left: auto !important;
			width: auto !important;
			visibility: visible !important;
			pointer-events: auto !important;
			margin: 0 !important;
			min-height: 0 !important;
			box-shadow: none !important;
			background: transparent !important;
		}

		.resume-sheet {
			margin: 0 auto;
		}

		:global([data-theme='dark']) :global(html),
		:global([data-theme='dark']) :global(body) {
			background: #0f0c16 !important;
		}

		:global([data-theme='dark']) main {
			background: #0f0c16 !important;
		}
	}
</style>
