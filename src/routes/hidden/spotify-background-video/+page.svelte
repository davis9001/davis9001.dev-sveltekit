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
				id: 'center-perch',
				x: Math.round(vw * 0.52),
				y: Math.round(vh * 0.42),
				scale: 1.58,
				zIndex: 47,
				flipX: false
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

<main class="spotify-background-video-route" aria-label="Hidden Spotify 9:16 background video route">
	<div class="ascii-layer fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-54 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen" aria-hidden="true">
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">
				{char}
			</div>
		{/each}
	</div>

	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			startingTargetId="center-perch"
			minIdleSeconds={999}
			maxIdleSeconds={999}
			flightDurationMs={2600}
		/>
	{/if}
</main>

<style>
	.spotify-background-video-route {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		text-align: center;
		background:
			radial-gradient(circle at 18% 14%, color-mix(in srgb, var(--spotify-header-bg-mid) 42%, transparent) 0%, transparent 54%),
			radial-gradient(circle at 78% 70%, color-mix(in srgb, var(--spotify-header-bg-end) 58%, transparent) 0%, transparent 48%),
			linear-gradient(
				160deg,
				var(--spotify-header-bg-start) 0%,
				var(--spotify-header-bg-mid) 54%,
				var(--spotify-header-bg-end) 100%
			);
	}

	.ascii-layer {
		pointer-events: none;
	}

	.spotify-background-video-route::before {
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
				color-mix(in srgb, var(--spotify-header-vignette) 35%, transparent) 24px,
				color-mix(in srgb, var(--spotify-header-vignette) 35%, transparent) 25px
			);
		opacity: 0.25;
	}

	.spotify-background-video-route::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		background:
			radial-gradient(circle at 50% 46%, transparent 37%, var(--spotify-header-vignette) 100%);
	}
</style>
