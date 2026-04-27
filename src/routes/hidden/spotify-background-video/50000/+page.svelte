<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowPosition, CrowTarget } from '$lib/utils/crow';

	let asciiCharacters: string[] = [];
	let crowTargets: CrowTarget[] = [];
	let manualCrowPosition: CrowPosition | null = null;

	const LOOP_DURATION_MS = 7700;
	const CROW_SCALE = 1.85;
	const HORIZONTAL_MARGIN_PX = 170;
	const VERTICAL_MARGIN_PX = 220;

	let loopAnimationId: number | null = null;

	function computeCrowTargets() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		crowTargets = [
			{
				id: 'center-50000',
				x: Math.round(vw * 0.5),
				y: Math.round(vh * 0.5),
				scale: CROW_SCALE,
				zIndex: 47,
				flipX: false
			}
		];
	}

	function startInfinityLoop() {
		if (loopAnimationId !== null) {
			cancelAnimationFrame(loopAnimationId);
			loopAnimationId = null;
		}

		// startMs is set from the rAF `now` on the FIRST frame so the loop
		// clock and __crowLoopStarted50000 are both set at the same instant.
		// This allows the capture script to compute clipStartSeconds within
		// ~1ms of true t=0, avoiding drift between JS and Node.js clocks.
		let startMs: number | null = null;
		let previousX = window.innerWidth * 0.5;

		const animateLoop = (now: number) => {
			if (startMs === null) {
				startMs = now;
				// Store the wall-clock time of the first frame so the capture
				// script can compute clipStartSeconds without polling lag.
				(window as Window & { __crowLoopStartWallMs50000?: number; __crowLoopStarted50000?: boolean }).__crowLoopStartWallMs50000 = Date.now();
				(window as Window & { __crowLoopStarted50000?: boolean }).__crowLoopStarted50000 = true;
			}
			const elapsed = (now - startMs) % LOOP_DURATION_MS;
			const t = (elapsed / LOOP_DURATION_MS) * Math.PI * 2;

			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const cx = vw * 0.5;
			const cy = vh * 0.5;

			// Rotated 90deg infinity (vertical): x=sin(2t), y=sin(t)
			const ampX = Math.max(0, vw * 0.5 - HORIZONTAL_MARGIN_PX);
			const ampY = Math.max(0, vh * 0.5 - VERTICAL_MARGIN_PX);
			const x = cx + ampX * Math.sin(2 * t);
			const y = cy + ampY * Math.sin(t);

			manualCrowPosition = {
				x,
				y,
				scale: CROW_SCALE,
				rotation: 0,
				flipX: x < previousX
			};

			previousX = x;
			loopAnimationId = requestAnimationFrame(animateLoop);
		};

		// At t=0, place crow at exact center before the first frame advances.
		manualCrowPosition = {
			x: window.innerWidth * 0.5,
			y: window.innerHeight * 0.5,
			scale: CROW_SCALE,
			rotation: 0,
			flipX: false
		};

		loopAnimationId = requestAnimationFrame(animateLoop);
	}

	// Each animation frame, fire a synthetic mousemove at the crow's pixel
	// position so ascii-animate.js highlights characters along the flight path.
	function handlePositionTick(x: number, y: number) {
		document.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: false, clientX: x, clientY: y })
		);
	}

	onMount(() => {
		const syncWindow = window as Window & {
			__crowLoopReady50000?: boolean;
			__crowLoopStarted50000?: boolean;
			__crowLoopStartWallMs50000?: number;
		};
		syncWindow.__crowLoopReady50000 = false;
		syncWindow.__crowLoopStarted50000 = false;
		syncWindow.__crowLoopStartWallMs50000 = undefined;

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

		// The capture script dispatches this event to trigger frame-zero.
		// __crowLoopStarted50000 is set from the first rAF frame (not here)
		// so clipStartSeconds in the script aligns with the actual first frame.
		document.addEventListener(
			'start-crow-loop',
			() => {
				startInfinityLoop();
			},
			{ once: true }
		);

		syncWindow.__crowLoopReady50000 = true;

		return () => {
			window.removeEventListener('resize', computeCrowTargets);
			syncWindow.__crowLoopReady50000 = false;
			syncWindow.__crowLoopStarted50000 = false;
			syncWindow.__crowLoopStartWallMs50000 = undefined;
			if (loopAnimationId !== null) {
				cancelAnimationFrame(loopAnimationId);
				loopAnimationId = null;
			}
			script.remove();
		};
	});
</script>

<main class="spotify-background-video-50000-route" aria-label="Hidden Spotify 9:16 background video route 50,000">
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
			startingTargetId="center-50000"
			minIdleSeconds={999999}
			maxIdleSeconds={999999}
			flightDurationMs={3850}
			scareRadius={0}
			flapWhenPerched={false}
			manualPosition={manualCrowPosition}
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
