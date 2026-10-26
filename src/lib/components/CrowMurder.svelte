<!--
  CrowMurder.svelte

  Easter egg: type "murder" and 23 crows fly in from the edges in small
  sub-flocks. They weave round the page, settle together on ledges (letters,
  buttons, headings), preen, and lift off again; a mouse close to a perched
  crow spooks it and the fright runs through its neighbours. Over about nine
  minutes they leave in groups until one remains.

  All of the behaviour lives in `$lib/utils/flock` (a seeded, tested
  simulation). This component feeds it the clock, the scroll, the mouse and the
  perch spots, and draws what it reports.

  `perchSpots` are in DOCUMENT coordinates; the flock subtracts the live scroll,
  so a perched crow rides its letter or button as the page scrolls.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { MurderDetector, CROW_FEET_X, CROW_FEET_Y, CROW_BODY_PIVOT_Y } from '$lib/utils/crow';
	import { Flock, type Bird } from '$lib/utils/flock';

	/** Places the murder can perch, in document coordinates */
	export let perchSpots: Array<{ x: number; y: number }> = [];

	let active = false;
	let mounted = false;
	let animFrameId: number;
	let flock: Flock | null = null;
	let birds: Bird[] = [];
	let mouse: { x: number; y: number } | null = null;

	$: flock?.setSpots(perchSpots);

	function onMouseMove(e: MouseEvent) {
		mouse = { x: e.clientX, y: e.clientY };
	}

	function activate() {
		if (active) return;
		active = true;
		flock = new Flock({
			now: Date.now(),
			viewport: { width: window.innerWidth, height: window.innerHeight }
		});
		flock.setSpots(perchSpots);
		birds = flock.birds;
		window.addEventListener('mousemove', onMouseMove);
		animFrameId = requestAnimationFrame(animate);
	}

	function animate() {
		if (!mounted || !flock) return;
		flock.step({
			now: Date.now(),
			viewport: { width: window.innerWidth, height: window.innerHeight },
			scroll: { x: window.scrollX, y: window.scrollY },
			mouse
		});
		// Same objects, mutated: tell Svelte to redraw
		birds = birds;
		animFrameId = requestAnimationFrame(animate);
	}

	let detector: MurderDetector;

	function onKeyDown(e: KeyboardEvent) {
		if (e.key.length === 1) {
			detector.feed(e.key);
		}
	}

	onMount(() => {
		mounted = true;
		detector = new MurderDetector(activate);
		window.addEventListener('keydown', onKeyDown);
	});

	onDestroy(() => {
		mounted = false;
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('mousemove', onMouseMove);
		}
	});
</script>

{#if active}
	{#each birds as crow (crow.id)}
		{#if crow.state !== 'waiting' && crow.state !== 'departed'}
			{@const isPerched = crow.state === 'perched'}
			{@const flipX = crow.facing === -1}
			<div
				class="murder-crow"
				data-crow-id={crow.id}
				data-state={crow.state}
				style="
					margin-left: -{CROW_FEET_X}px;
					margin-top: -{CROW_FEET_Y}px;
					transform-origin: {CROW_FEET_X}px {CROW_FEET_Y}px;
					transform: translate({crow.x}px, {crow.y + (isPerched ? crow.hop : 0)}px) scale({crow.scale}) {flipX ? 'scaleX(-1)' : ''};
					z-index: {40 + Math.round(crow.depth * 5)};
				"
				aria-hidden="true"
			>
				<div
					class="murder-crow-bank"
					style="transform-origin: {CROW_FEET_X}px {CROW_BODY_PIVOT_Y}px; transform: rotate({isPerched ? crow.idleTilt : crow.bank}deg);"
				>
				<svg
					viewBox="-55 -45 110 80"
					width="90"
					height="70"
					xmlns="http://www.w3.org/2000/svg"
					class="murder-crow-svg"
				>
					{#if !isPerched}
						<!-- Flying wings -->
						<g style="transform-origin: 0px -5px; transform: rotate({-crow.wing}deg);">
							<path d="M-2,-5 C-15,-20 -35,-32 -50,-28 C-40,-18 -25,-10 -5,-5 Z" fill="var(--crow-wing, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />
						</g>
						<g style="transform-origin: 0px -5px; transform: rotate({crow.wing}deg);">
							<path d="M2,-5 C15,-20 35,-32 50,-28 C40,-18 25,-10 5,-5 Z" fill="var(--crow-wing, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />
						</g>
					{:else}
						<!-- Folded wings -->
						<path d="M-4,-2 C-10,-4 -16,-2 -18,4 C-16,8 -10,10 -4,6 Z" fill="var(--crow-wing, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
						<path d="M4,-2 C10,-4 16,-2 18,4 C16,8 10,10 4,6 Z" fill="var(--crow-wing, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
					{/if}

					<!-- Tail -->
					<path d="M-8,6 C-16,14 -30,22 -36,20 C-28,14 -20,8 -14,4 Z" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
					<path d="M-6,8 C-14,18 -28,28 -34,26 C-24,18 -16,12 -10,6 Z" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
					<path d="M-4,7 C-12,17 -24,26 -30,24 C-20,16 -14,10 -8,5 Z" fill="var(--crow-tail, #191919)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />

					<!-- Body -->
					<ellipse cx="0" cy="2" rx="20" ry="11" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />

					<!-- Head -->
					<ellipse cx="18" cy="-8" rx="9" ry="8.5" fill="var(--crow-head, #0f0f0f)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />
					<!-- Eye — dark with subtle sheen -->
					<circle cx="22" cy="-10" r="2.8" fill="var(--crow-eye, #0a0a0a)" />
					<circle cx="22.2" cy="-10" r="2" fill="var(--crow-iris, #151010)" />
					<circle cx="22.5" cy="-10.1" r="1.3" fill="var(--crow-pupil, #050505)" />
					<circle cx="23.2" cy="-11" r="0.6" fill="var(--crow-eye-highlight, #333333)" opacity="0.6" />
					<circle cx="21.5" cy="-9.5" r="0.3" fill="var(--crow-eye-highlight, #333333)" opacity="0.35" />
					<!-- Beak — longer, slightly curved -->
					<path d="M26,-9 C28,-9.5 32,-8 35,-6.5 C33,-5 30,-4.5 26,-5 Z" fill="var(--crow-beak, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
					<path d="M26,-8 C29,-8 32,-7 34,-6.5" fill="none" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.6" />
					<line x1="26" y1="-6.5" x2="34" y2="-6" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.4" />
					<circle cx="28" cy="-8" r="0.5" fill="var(--crow-outline, #0d0d0d)" />

					<!-- Legs (when perched) -->
					{#if isPerched}
						<line x1="-3" y1="13" x2="-5" y2="24" stroke="var(--crow-leg, #333333)" stroke-width="1.2" stroke-linecap="round" />
						<path d="M-9,24 L-5,24 L-2,24" fill="none" stroke="var(--crow-leg, #333333)" stroke-width="1" stroke-linecap="round" />
						<line x1="5" y1="13" x2="3" y2="24" stroke="var(--crow-leg, #333333)" stroke-width="1.2" stroke-linecap="round" />
						<path d="M-1,24 L3,24 L6,24" fill="none" stroke="var(--crow-leg, #333333)" stroke-width="1" stroke-linecap="round" />
					{/if}
				</svg>
				</div>
			</div>
		{/if}
	{/each}
{/if}

<style>
	.murder-crow {
		position: fixed;
		pointer-events: none;
		transition: none;
		will-change: transform;
		top: 0;
		left: 0;
	}

	.murder-crow-bank {
		width: 90px;
		height: 70px;
	}

	.murder-crow-svg {
		overflow: visible;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
	}
</style>
