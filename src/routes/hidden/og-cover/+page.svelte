<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowTarget } from '$lib/utils/crow';

	/**
	 * Hidden render route for the site's Open Graph / share card.
	 *
	 * Captured at exactly 1200x630 by `scripts/capture-og-cover.cjs`, which writes
	 * the result to `static/cover.png` — the image `SEO.svelte` hands to Discord,
	 * Slack, X and friends. Everything here is deterministic so re-running the
	 * capture produces the same card.
	 */
	const WIDTH = 1200;
	const HEIGHT = 630;

	// Deterministic ASCII field — same characters and placement on every render.
	const ASCII_COLUMNS = 60;
	const ASCII_ROWS = 26;
	const ASCII_COUNT = ASCII_COLUMNS * ASCII_ROWS;

	type AsciiCell = { char: string; tone: 'dim' | 'bright' | 'accent' };

	/** Small LCG so the field looks scattered without being random per capture. */
	function seededSequence(seed: number, count: number): number[] {
		const values: number[] = [];
		let state = seed;
		for (let i = 0; i < count; i += 1) {
			state = (state * 1103515245 + 12345) % 2147483648;
			values.push(state / 2147483648);
		}
		return values;
	}

	const asciiCells: AsciiCell[] = seededSequence(9001, ASCII_COUNT * 2).reduce<AsciiCell[]>(
		(cells, _value, index, all) => {
			if (index >= ASCII_COUNT) return cells;
			const charRoll = all[index];
			const toneRoll = all[index + ASCII_COUNT];
			// Same range the homepage grid walks: printable ASCII through the
			// wider Unicode blocks, which is where the "signal field" look comes from.
			const code = 42 + Math.floor(charRoll * (4200 - 42));
			const tone = toneRoll > 0.985 ? 'accent' : toneRoll > 0.88 ? 'bright' : 'dim';
			cells.push({ char: String.fromCharCode(code), tone });
			return cells;
		},
		[]
	);

	// The crow perches on the "davis9001" wordmark, same as it does on the homepage.
	let crowTargets: CrowTarget[] = [];

	/** How long the crow needs to fly in and settle before the shutter. */
	const CROW_FLIGHT_MS = 2600;
	const CROW_SETTLE_MS = CROW_FLIGHT_MS + 900;

	let ready = false;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		// Flips data-og-ready once fonts, layout and the crow have all settled —
		// capture-og-cover.cjs waits on that attribute before screenshotting.
		document.fonts?.ready.then(() => {
			const title = document.querySelector('.title');
			if (title) {
				const rect = title.getBoundingClientRect();
				crowTargets = [
					{
						id: 'title',
						x: rect.left + rect.width * 0.72,
						y: rect.top + rect.height * 0.22,
						scale: 0.42,
						zIndex: 35,
						anchorSelector: '.title',
						// y is a fraction of the line box, whose top sits above the cap
						// height — 0.22 drops the crow's feet onto the glyphs themselves.
						anchorAlign: { x: 0.72, y: 0.22 }
					}
				];
			}
			settleTimer = setTimeout(() => {
				ready = true;
			}, CROW_SETTLE_MS);
		});

		return () => clearTimeout(settleTimer);
	});
</script>

<svelte:head>
	<title>og-cover render</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="og-cover"
	class:is-ready={ready}
	data-og-ready={ready}
	style="width: {WIDTH}px; height: {HEIGHT}px;"
	aria-label="Hidden Open Graph cover render route"
>
	<!-- Signal field texture -->
	<div
		class="ascii-field"
		style="grid-template-columns: repeat({ASCII_COLUMNS}, 1fr);"
		aria-hidden="true"
	>
		{#each asciiCells as cell}
			<span class="ascii-cell tone-{cell.tone}">{cell.char}</span>
		{/each}
	</div>

	<!-- Hero photo — the same hoodie edit the homepage background uses -->
	<div class="photo" aria-hidden="true"></div>

	<div class="content">
		<img
			class="logo"
			src="/logo-green-Icon-250.webp"
			width="250"
			height="250"
			alt="the davis9001 logo"
		/>

		<div class="wordmark">
			<h1 class="title">davis9001</h1>
			<p class="subtitle">David &quot;davis9001&quot; Monaghan</p>
		</div>

		<p class="role">Software and Community Architect</p>

		<p class="domain">davis9001.dev</p>
	</div>

	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			startingTargetId="title"
			minIdleSeconds={999}
			maxIdleSeconds={999}
			flightDurationMs={2600}
		/>
	{/if}
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: hsla(var(--background));
	}

	.og-cover {
		position: relative;
		overflow: hidden;
		font-family: var(--font-sans);
		background:
			radial-gradient(circle at 22% 78%, hsla(265, 95%, 52%, 0.85) 0%, transparent 58%),
			radial-gradient(circle at 82% 12%, hsla(275, 95%, 38%, 0.9) 0%, transparent 62%),
			linear-gradient(
				118deg,
				hsl(265, 95%, 43%) 0%,
				hsl(268, 95%, 38%) 55%,
				hsl(272, 95%, 31%) 100%
			);
	}

	/* ── Signal field ── */
	.ascii-field {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: grid;
		align-content: space-between;
		font-family: var(--font-mono);
		font-size: 15px;
		line-height: 1;
		text-align: center;
		pointer-events: none;
		user-select: none;
	}

	.ascii-cell {
		display: block;
		overflow: hidden;
	}

	.tone-dim {
		color: hsla(34, 96%, 70%, 0.09);
	}

	.tone-bright {
		color: hsla(34, 73%, 90%, 0.2);
	}

	.tone-accent {
		color: hsla(var(--accent), 0.55);
	}

	/* ── Photo ── */
	.photo {
		position: absolute;
		left: -18px;
		bottom: -10px;
		/* Natural 420x736, scaled to sit fully inside the 630px-tall card. */
		width: 348px;
		height: 610px;
		z-index: 20;
		background-image: url('/davis9001-2-hoodie.webp');
		background-size: contain;
		background-repeat: no-repeat;
		background-position: bottom center;
		filter: drop-shadow(28px 0 46px hsla(264, 100%, 4%, 0.55));
	}

	/* Soften the photo into the field on its right edge. */
	.photo::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(100deg, transparent 62%, hsla(268, 95%, 38%, 0.35) 100%);
	}

	/* ── Content ── */
	.content {
		position: absolute;
		z-index: 30;
		top: 0;
		bottom: 0;
		left: 372px;
		right: 60px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		text-align: left;
	}

	.logo {
		width: 104px;
		height: 104px;
		margin-bottom: 22px;
		filter: drop-shadow(0 0 30px hsla(var(--accent), 0.45));
	}

	.wordmark {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.title {
		margin: 0;
		font-size: 104px;
		font-weight: 900;
		letter-spacing: -0.04em;
		line-height: 0.94;
		color: hsla(var(--foreground));
		text-shadow: 0 4px 44px hsla(264, 100%, 3%, 0.55);
	}

	.subtitle {
		margin: 14px 0 0;
		font-size: 25px;
		font-style: italic;
		line-height: 1.3;
		color: hsla(var(--foreground), 0.68);
	}

	.role {
		margin: 26px 0 0;
		font-size: 34px;
		font-weight: 700;
		line-height: 1.2;
		color: hsla(var(--foreground), 0.94);
	}

	.domain {
		margin: 30px 0 0;
		padding: 10px 22px;
		font-family: var(--font-mono);
		font-size: 24px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: hsla(var(--accent));
		background: hsla(264, 100%, 3%, 0.34);
		border: 1px solid hsla(var(--accent), 0.4);
		border-radius: var(--radius-lg);
	}

	/* Vignette, matching the Spotify header render. */
	.og-cover::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 40;
		pointer-events: none;
		background: radial-gradient(circle at 50% 46%, transparent 46%, hsla(264, 100%, 2%, 0.32) 100%);
	}
</style>
