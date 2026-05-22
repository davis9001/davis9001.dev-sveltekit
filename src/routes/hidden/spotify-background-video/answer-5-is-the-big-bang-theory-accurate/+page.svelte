<script lang="ts">
	import { onMount } from 'svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import type { CrowPosition, CrowTarget } from '$lib/utils/crow';

	let asciiCharacters: string[] = [];
	let crowTargets: CrowTarget[] = [];
	let manualCrowPosition: CrowPosition | null = null;

	const LOOP_DURATION_MS = 7700;
	const CROW_SCALE = 2.1;
	const HORIZONTAL_MARGIN_PX = 165;
	const VERTICAL_MARGIN_PX = 210;

	let loopAnimationId: number | null = null;

	function computeCrowTargets() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		crowTargets = [
			{
				id: 'center-answer-5',
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

		let startMs: number | null = null;
		let previousX = window.innerWidth * 0.5;

		const animateLoop = (now: number) => {
			if (startMs === null) {
				startMs = now;
				(window as Window & {
					__crowLoopStartWallMsAnswer5?: number;
					__crowLoopStartedAnswer5?: boolean;
				}).__crowLoopStartWallMsAnswer5 = Date.now();
				(window as Window & { __crowLoopStartedAnswer5?: boolean }).__crowLoopStartedAnswer5 = true;
			}

			const elapsed = (now - startMs) % LOOP_DURATION_MS;
			const t = (elapsed / LOOP_DURATION_MS) * Math.PI * 2;

			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const cx = vw * 0.5;
			const cy = vh * 0.5;

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

		manualCrowPosition = {
			x: window.innerWidth * 0.5,
			y: window.innerHeight * 0.5,
			scale: CROW_SCALE,
			rotation: 0,
			flipX: false
		};

		loopAnimationId = requestAnimationFrame(animateLoop);
	}

	function handlePositionTick(x: number, y: number) {
		document.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: false, clientX: x, clientY: y })
		);
	}

	onMount(() => {
		const syncWindow = window as Window & {
			__crowLoopReadyAnswer5?: boolean;
			__crowLoopStartedAnswer5?: boolean;
			__crowLoopStartWallMsAnswer5?: number;
		};

		syncWindow.__crowLoopReadyAnswer5 = false;
		syncWindow.__crowLoopStartedAnswer5 = false;
		syncWindow.__crowLoopStartWallMsAnswer5 = undefined;

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

		document.addEventListener(
			'start-crow-loop',
			() => {
				startInfinityLoop();
			},
			{ once: true }
		);

		syncWindow.__crowLoopReadyAnswer5 = true;

		return () => {
			window.removeEventListener('resize', computeCrowTargets);
			syncWindow.__crowLoopReadyAnswer5 = false;
			syncWindow.__crowLoopStartedAnswer5 = false;
			syncWindow.__crowLoopStartWallMsAnswer5 = undefined;
			if (loopAnimationId !== null) {
				cancelAnimationFrame(loopAnimationId);
				loopAnimationId = null;
			}
			script.remove();
		};
	});
</script>

<main class="spotify-background-video-answer-5-route" aria-label="Hidden Spotify 9:16 background video route answer-5-is-the-big-bang-theory-accurate">
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
			startingTargetId="center-answer-5"
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
	.spotify-background-video-answer-5-route {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		text-align: center;
		background:
			radial-gradient(circle at 10% 14%, color-mix(in srgb, var(--spotify-header-bg-mid) 52%, transparent) 0%, transparent 54%),
			radial-gradient(circle at 86% 18%, color-mix(in srgb, var(--spotify-header-bg-start) 48%, transparent) 0%, transparent 50%),
			radial-gradient(circle at 50% 88%, color-mix(in srgb, var(--spotify-header-bg-end) 66%, transparent) 0%, transparent 52%),
			linear-gradient(
				132deg,
				var(--spotify-header-bg-end) 0%,
				var(--spotify-header-bg-mid) 44%,
				var(--spotify-header-bg-start) 100%
			);
	}

	.ascii-layer {
		pointer-events: none;
	}

	.spotify-background-video-answer-5-route::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 8;
		pointer-events: none;
		background:
			repeating-linear-gradient(
				95deg,
				transparent 0,
				transparent 22px,
				color-mix(in srgb, var(--spotify-header-matrix) 64%, transparent) 22px,
				color-mix(in srgb, var(--spotify-header-matrix) 64%, transparent) 23px
			),
			repeating-linear-gradient(
				-95deg,
				transparent 0,
				transparent 32px,
				color-mix(in srgb, var(--spotify-header-vignette) 36%, transparent) 32px,
				color-mix(in srgb, var(--spotify-header-vignette) 36%, transparent) 33px
			);
		opacity: 0.25;
	}

	.spotify-background-video-answer-5-route::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		background:
			radial-gradient(circle at 50% 38%, transparent 31%, var(--spotify-header-vignette) 100%);
	}
</style>