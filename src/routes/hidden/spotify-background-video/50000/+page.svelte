<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowTarget } from '$lib/utils/crow';

	let asciiCharacters: string[] = [];
	let crowTargets: CrowTarget[] = [];

	// The crow is locked until the capture script fires 'start-crow-loop'.
	// After that event fires, both values snap to 0 so it immediately shuttles
	// back to bottom-right after each landing — producing a perfect 2-leg loop.
	let minIdle = 999999;
	let maxIdle = 999999;

	// bind:this gives us access to AnimatedCrow's exported triggerFlight()
	let crowRef: AnimatedCrow;

	function computeCrowTargets() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		crowTargets = [
			{
				id: 'bottom-left-50000',
				x: Math.round(vw * 0.14),
				y: Math.round(vh * 0.92),
				scale: 1.85,
				zIndex: 47,
				flipX: true
			},
			{
				id: 'top-right-50000',
				x: Math.round(vw * 0.86),
				y: Math.round(vh * 0.08),
				scale: 1.85,
				zIndex: 47,
				flipX: false
			}
		];
	}

	// Each animation frame, fire a synthetic mousemove at the crow's pixel
	// position so ascii-animate.js highlights characters along the flight path.
	function handlePositionTick(x: number, y: number) {
		window.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y })
		);
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

		computeCrowTargets();
		window.addEventListener('resize', computeCrowTargets);

		// The capture script dispatches this event at the precise moment
		// recording should be considered frame-zero of the loop.
		document.addEventListener(
			'start-crow-loop',
			() => {
				minIdle = 0;
				maxIdle = 0;
				crowRef?.triggerFlight();
			},
			{ once: true }
		);

		return () => {
			window.removeEventListener('resize', computeCrowTargets);
			script.remove();
		};
	});
</script>

<main class="spotify-background-video-50000-route" aria-label="Hidden Spotify 9:16 background video route 50,000">
	<div class="ascii-layer fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-27 sm:grid-cols-47 lg:grid-cols-87 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen" aria-hidden="true">
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">
				{char}
			</div>
		{/each}
	</div>

	{#if crowTargets.length > 0}
		<AnimatedCrow
			bind:this={crowRef}
			targets={crowTargets}
			startingTargetId="bottom-left-50000"
			minIdleSeconds={minIdle}
			maxIdleSeconds={maxIdle}
			flightDurationMs={3850}
			scareRadius={0}
			flapWhenPerched={false}
			onPositionTick={handlePositionTick}
		/>
	{/if}
</main>

<style>
	.spotify-background-video-50000-route {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		text-align: center;
		background:
			radial-gradient(circle at 84% 14%, color-mix(in srgb, var(--spotify-header-bg-end) 62%, transparent) 0%, transparent 44%),
			radial-gradient(circle at 18% 70%, color-mix(in srgb, var(--spotify-header-bg-mid) 56%, transparent) 0%, transparent 52%),
			radial-gradient(circle at 56% 46%, color-mix(in srgb, var(--spotify-header-bg-start) 34%, transparent) 0%, transparent 68%),
			linear-gradient(
				125deg,
				var(--spotify-header-bg-end) 0%,
				var(--spotify-header-bg-mid) 42%,
				var(--spotify-header-bg-start) 100%
			);
	}

	.ascii-layer {
		pointer-events: none;
	}

	.spotify-background-video-50000-route::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 8;
		pointer-events: none;
		background:
			repeating-linear-gradient(
				115deg,
				transparent 0,
				transparent 21px,
				color-mix(in srgb, var(--spotify-header-matrix) 66%, transparent) 21px,
				color-mix(in srgb, var(--spotify-header-matrix) 66%, transparent) 22px
			),
			repeating-linear-gradient(
				-115deg,
				transparent 0,
				transparent 29px,
				color-mix(in srgb, var(--spotify-header-vignette) 34%, transparent) 29px,
				color-mix(in srgb, var(--spotify-header-vignette) 34%, transparent) 30px
			);
		opacity: 0.24;
	}

	.spotify-background-video-50000-route::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		background:
			radial-gradient(circle at 66% 36%, transparent 30%, var(--spotify-header-vignette) 100%);
	}
</style>
