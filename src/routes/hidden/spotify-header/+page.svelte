<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowTarget } from '$lib/utils/crow';
	import { computeContainedImageBounds, imageLandmarkToViewport } from '$lib/utils/crow';

	const IMG_NAT_W = 420;
	const IMG_NAT_H = 736;

	type MatrixGlyph = {
		char: string;
		stateClass: string;
		colorToken: string;
	};

	let matrixGlyphs: MatrixGlyph[] = [];
	let crowTargets: CrowTarget[] = [];
	let shoulderPoint = { x: 0, y: 0 };

	function seededRandom(seed: number): () => number {
		let state = seed >>> 0;
		return () => {
			state += 0x6d2b79f5;
			let t = state;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function generateMatrixGlyphs(count: number): MatrixGlyph[] {
		const rand = seededRandom(9001);
		const source = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		const colorTokens = [
			'hsla(var(--accent), 1)',
			'hsla(var(--special), 1)',
			'hsla(var(--secondary), 1)',
			'hsla(var(--link-blue), 1)'
		];
		const glyphs: MatrixGlyph[] = [];

		for (let i = 0; i < count; i += 1) {
			const index = Math.floor(rand() * source.length);
			const stateRoll = rand();
			let stateClass = 'highlighted-secondary';
			if (stateRoll > 0.965) {
				stateClass = 'highlighted-extra-special';
			} else if (stateRoll > 0.84) {
				stateClass = 'highlighted-special';
			} else if (stateRoll > 0.58) {
				stateClass = 'highlighted';
			}
			glyphs.push({
				char: source[index],
				stateClass,
				colorToken: colorTokens[Math.floor(rand() * colorTokens.length)]
			});
		}

		return glyphs;
	}

	function measureBgOffset(): { offsetX: number; offsetY: number } {
		const measure = document.createElement('div');
		measure.style.cssText =
			'position:absolute;visibility:hidden;pointer-events:none;' +
			'width:9ch;height:18em;font:inherit';
		document.body.appendChild(measure);
		const chPx = measure.offsetWidth;
		const emPx = measure.offsetHeight;
		document.body.removeChild(measure);
		return { offsetX: -chPx, offsetY: emPx };
	}

	function computeShoulderTarget() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const { offsetX, offsetY } = measureBgOffset();

		const imageBounds = computeContainedImageBounds(vw, vh, IMG_NAT_W, IMG_NAT_H, offsetX, offsetY);
		const shoulder = imageLandmarkToViewport(0.64, 0.34, imageBounds);
		shoulderPoint = shoulder;

		crowTargets = [
			{
				id: 'shoulder',
				x: shoulder.x,
				y: shoulder.y,
				scale: 1.42,
				zIndex: 42,
				flipX: true
			}
		];
	}

	onMount(() => {
		matrixGlyphs = generateMatrixGlyphs(3200 - 42 + 1);

		computeShoulderTarget();
		window.addEventListener('resize', computeShoulderTarget);

		return () => {
			window.removeEventListener('resize', computeShoulderTarget);
		};
	});
</script>

<main class="spotify-header-route" aria-label="Hidden Spotify header render route">
	<div
		class="header-photo"
		style="
			background-image: url('/davis9001-2.webp');
			background-size: contain;
			background-position: -9ch 18em;
		"
	/>

	<div class="matrix-layer" aria-hidden="true">
		{#each matrixGlyphs as glyph}
			<span
				class="matrix-char ascii-character {glyph.stateClass}"
				style="color: {glyph.colorToken};"
			>
				{glyph.char}
			</span>
		{/each}
	</div>

	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			startingTargetId="shoulder"
			minIdleSeconds={999}
			maxIdleSeconds={999}
			flightDurationMs={2600}
		/>
	{/if}

	<div
		class="shoulder-crow"
		aria-hidden="true"
		style="transform: translate({shoulderPoint.x - 40}px, {shoulderPoint.y - 64}px);"
	>
		<svg viewBox="0 0 84 64" width="84" height="64" role="img">
			<path d="M6 46c4-10 12-14 22-14 4-8 13-13 24-13 12 0 22 7 26 18-4-2-8-2-12 0l-8 4 6 7-10-1-8 9-8-5-12 3 4-8z" fill="var(--spotify-header-crow-body)" />
			<circle cx="57" cy="31" r="2.6" fill="var(--color-accent)" />
		</svg>
	</div>

	<section class="hero-shell" role="banner">
		<img
			class="hero-logo"
			src="/logo-green-Icon-250.webp"
			width="210"
			height="210"
			alt="davis9001 logo"
		/>
		<h1 class="hero-title">davis9001</h1>
		<p class="hero-subtitle">David "davis9001" Monaghan</p>
	</section>
</main>

<style>
	.spotify-header-route {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		text-align: center;
		background:
			linear-gradient(
				115deg,
				var(--spotify-header-bg-start) 0%,
				var(--spotify-header-bg-mid) 52%,
				var(--spotify-header-bg-end) 100%
			);
	}

	.header-photo {
		position: absolute;
		inset: 0;
		z-index: 20;
		background-repeat: no-repeat;
		pointer-events: none;
	}

	.matrix-layer {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(80, minmax(0, 1fr));
		gap: 0;
		place-content: stretch;
		z-index: 10;
		pointer-events: none;
		opacity: 0.6;
	}

	.matrix-char {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		line-height: 1.25;
		opacity: 0.22;
		animation: none;
		transform: none;
		user-select: none;
	}

	.hero-shell {
		position: relative;
		z-index: 40;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem 3rem;
	}

	.hero-logo {
		width: 170px;
		height: 170px;
		margin: 0 auto 0.9rem;
		filter: drop-shadow(0 0 24px color-mix(in srgb, var(--color-accent) 70%, transparent));
	}

	.hero-title {
		font-size: clamp(6.2rem, 11vw, 11.5rem);
		font-weight: 900;
		letter-spacing: -0.045em;
		line-height: 1;
		color: var(--spotify-header-title);
		margin: 0;
		text-shadow: 0 8px 32px color-mix(in srgb, var(--spotify-header-bg-end) 60%, transparent);
	}

	.hero-subtitle {
		margin-top: 0.8rem;
		font-size: clamp(1.5rem, 2vw, 2.1rem);
		font-style: italic;
		line-height: 1.3;
		color: var(--spotify-header-subtitle);
	}

	.hero-role {
		margin-top: 1.1rem;
		font-size: clamp(2.25rem, 3.5vw, 3.85rem);
		font-weight: 500;
		line-height: 1.2;
		color: var(--spotify-header-role);
	}

	.spotify-header-route::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		background:
			radial-gradient(circle at 50% 46%, transparent 40%, var(--spotify-header-vignette) 100%);
	}

	.shoulder-crow {
		position: absolute;
		z-index: 47;
		pointer-events: none;
		filter: drop-shadow(0 3px 7px var(--spotify-header-crow-shadow));
	}
</style>
