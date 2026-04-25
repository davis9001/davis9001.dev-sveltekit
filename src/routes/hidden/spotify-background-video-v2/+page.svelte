<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowTarget } from '$lib/utils/crow';

	let asciiCharacters: string[] = [];
	let crowTargets: CrowTarget[] = [];

	function computeCrowTarget() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		crowTargets = [
			{
				id: 'center-perch-v2',
				x: Math.round(vw * 0.48),
				y: Math.round(vh * 0.45),
				scale: 2.45,
				zIndex: 47,
				flipX: true
			}
		];
	}

	onMount(() => {
		const chars = [];
		for (let i = 42; i <= 4200; i += 1) {
			chars.push(String.fromCharCode(i));
		}
		asciiCharacters = chars;

		const script = document.createElement('script');
		script.src = '/ascii-animate.js';
		document.head.appendChild(script);

		computeCrowTarget();
		window.addEventListener('resize', computeCrowTarget);

		return () => {
			window.removeEventListener('resize', computeCrowTarget);
			script.remove();
		};
	});
</script>

<main class="spotify-background-video-v2-route" aria-label="Hidden Spotify 9:16 background video route v2">
	<div class="ascii-layer fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-23 sm:grid-cols-42 lg:grid-cols-99 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen" aria-hidden="true">
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">
				{char}
			</div>
		{/each}
	</div>

	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			startingTargetId="center-perch-v2"
			minIdleSeconds={999}
			maxIdleSeconds={999}
			flightDurationMs={2600}
		/>
	{/if}
</main>

<style>
	.spotify-background-video-v2-route {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		text-align: center;
		background:
			radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--spotify-header-bg-mid) 46%, transparent) 0%, transparent 56%),
			radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--spotify-header-bg-start) 52%, transparent) 0%, transparent 44%),
			radial-gradient(circle at 72% 82%, color-mix(in srgb, var(--spotify-header-bg-end) 62%, transparent) 0%, transparent 48%),
			linear-gradient(
				140deg,
				var(--spotify-header-bg-start) 0%,
				var(--spotify-header-bg-mid) 45%,
				var(--spotify-header-bg-end) 100%
			);
	}

	.ascii-layer {
		pointer-events: none;
	}

	.spotify-background-video-v2-route::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 8;
		pointer-events: none;
		background:
			repeating-linear-gradient(
				90deg,
				transparent 0,
				transparent 24px,
				color-mix(in srgb, var(--spotify-header-matrix) 60%, transparent) 24px,
				color-mix(in srgb, var(--spotify-header-matrix) 60%, transparent) 25px
			),
			repeating-linear-gradient(
				0deg,
				transparent 0,
				transparent 18px,
				color-mix(in srgb, var(--spotify-header-vignette) 38%, transparent) 18px,
				color-mix(in srgb, var(--spotify-header-vignette) 38%, transparent) 19px
			);
		opacity: 0.26;
	}

	.spotify-background-video-v2-route::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		background:
			radial-gradient(circle at 50% 42%, transparent 35%, var(--spotify-header-vignette) 100%);
	}
</style>
