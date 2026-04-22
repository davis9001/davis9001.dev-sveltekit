<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowTarget } from '$lib/utils/crow';
	import { computeContainedImageBounds, imageLandmarkToViewport } from '$lib/utils/crow';

	const IMG_NAT_W = 420;
	const IMG_NAT_H = 736;

	let asciiCharacters: string[] = [];
	let haloPoint = { x: 0, y: 0 };
	let crowTargets: CrowTarget[] = [];

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

	function computeHaloPoint() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const { offsetX, offsetY } = measureBgOffset();
		const imgBounds = computeContainedImageBounds(vw, vh, IMG_NAT_W, IMG_NAT_H, offsetX, offsetY);
		haloPoint = imageLandmarkToViewport(0.5, -0.01, imgBounds);

		crowTargets = [
			{
				id: 'halo',
				x: haloPoint.x,
				y: haloPoint.y,
				scale: 1.56,
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

		computeHaloPoint();
		window.addEventListener('resize', computeHaloPoint);

		return () => {
			window.removeEventListener('resize', computeHaloPoint);
			script.remove();
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
			startingTargetId="halo"
			minIdleSeconds={999}
			maxIdleSeconds={999}
			flightDurationMs={2600}
		/>
	{/if}

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

	.ascii-layer {
		pointer-events: none;
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

</style>
