<!--
  AnimatedCrow.svelte
  
  A bespoke SVG crow that flies between elements on the page.
  It flaps its wings during flight, changes size based on landing
  target depth, and can optionally carry items in its beak.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		CrowStateMachine,
		getWingFlapAngle,
		getIdleAnimation,
		isMouseTooClose,
		type CrowTarget,
		type CrowPosition,
		type CarriedItem,
		type IdleAnimation
	} from '$lib/utils/crow';

	/** Landing targets the crow can fly to */
	export let targets: CrowTarget[] = [];

	/** Optional item in the crow's beak */
	export let carriedItem: CarriedItem | null = null;

	/** Min seconds between flights */
	export let minIdleSeconds = 5;

	/** Max seconds between flights */
	export let maxIdleSeconds = 12;

	/** Flight duration in ms */
	export let flightDurationMs = 2200;

	/** Distance (px) at which the mouse scares the crow */
	export let scareRadius = 120;

	let machine: CrowStateMachine | null = null;
	let animFrameId: number;
	let idleTimer: ReturnType<typeof setTimeout>;
	let pos: CrowPosition = { x: 0, y: 0, scale: 1, rotation: 0, flipX: false };
	let wingAngle = 0;
	let state: 'perched' | 'taking-off' | 'flying' | 'landing' = 'perched';
	let mounted = false;
	let animStartTime = 0;
	let idleAnim: IdleAnimation = { headTilt: 0, bodyShiftX: 0, bodyShiftY: 0, tailWag: 0, lookDirection: 0 };
	let mouseX = -9999;
	let mouseY = -9999;
	let scareCooldown = false; // Prevent rapid re-scaring
	let currentZIndex = 45;

	$: if (machine && carriedItem !== undefined) {
		machine.setCarriedItem(carriedItem);
	}

	/**
	 * Resolve the live position of a target from the DOM.
	 * If the target has an anchorSelector, query the element's current bounding
	 * rect so the crow follows it during scroll. Falls back to static x/y.
	 */
	function resolveTargetPosition(target: CrowTarget): { x: number; y: number } {
		if (target.anchorSelector) {
			const el = document.querySelector(target.anchorSelector);
			if (el) {
				const rect = el.getBoundingClientRect();
				const align = target.anchorAlign ?? { x: 0.5, y: 0 };
				return {
					x: rect.left + rect.width * align.x,
					y: rect.top + rect.height * align.y
				};
			}
		}
		return { x: target.x, y: target.y };
	}

	/**
	 * Refresh all target x/y from the DOM right before starting a flight.
	 * This ensures the flight arc uses the current on-screen positions,
	 * not stale values captured at mount time.
	 */
	function refreshTargetPositions(): void {
		if (!machine) return;
		const fresh = targets.map((t) => {
			const livePos = resolveTargetPosition(t);
			return { ...t, x: livePos.x, y: livePos.y };
		});
		machine.updateTargets(fresh);
	}

	function onMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	function scheduleNextFlight() {
		if (idleTimer) clearTimeout(idleTimer);
		const delay = (minIdleSeconds + Math.random() * (maxIdleSeconds - minIdleSeconds)) * 1000;
		idleTimer = setTimeout(() => {
			if (machine && machine.getState() === 'perched') {
				refreshTargetPositions();
				machine.setFlightDuration(flightDurationMs);
				machine.startFlight();
				state = 'flying';
				animStartTime = Date.now();
			}
		}, delay);
	}

	function fleeFromMouse() {
		if (!machine || machine.getState() === 'flying' || scareCooldown) return;
		scareCooldown = true;
		if (idleTimer) clearTimeout(idleTimer);

		refreshTargetPositions();
		machine.setFlightDuration(flightDurationMs);
		machine.startFleeingFlight(mouseX, mouseY);
		state = 'flying';
		animStartTime = Date.now();

		// Cooldown prevents re-scaring immediately after landing
		setTimeout(() => { scareCooldown = false; }, 3000);
	}

	function animate() {
		if (!machine || !mounted) return;

		const currentState = machine.getState();

		if (currentState === 'flying') {
			const progress = machine.getFlightProgress();
			pos = machine.getCurrentPosition();
			wingAngle = getWingFlapAngle('flying', Date.now() - animStartTime);
			currentZIndex = machine.getCurrentZIndex();

			if (progress >= 1) {
				machine.completeFlight();
				state = 'perched';
				wingAngle = 0;
				pos = machine.getCurrentPosition();
				currentZIndex = machine.getCurrentZIndex();
				// Restore normal flight duration after fleeing
				machine.setFlightDuration(flightDurationMs);
				scheduleNextFlight();
			}
		} else {
			// When perched, re-resolve anchor position from the DOM each frame
			// so the crow follows its element on scroll.
			const currentTarget = machine.getCurrentTarget();
			if (currentTarget.anchorSelector) {
				const livePos = resolveTargetPosition(currentTarget);
				pos = {
					x: livePos.x,
					y: livePos.y,
					scale: currentTarget.scale,
					rotation: 0,
					flipX: currentTarget.flipX ?? false
				};
			} else {
				pos = machine.getCurrentPosition();
			}
			wingAngle = 0; // Wings folded when perched
			idleAnim = getIdleAnimation(Date.now());
			currentZIndex = machine.getCurrentZIndex();

			// Check if mouse is too close — flee!
			if (
				!scareCooldown &&
				isMouseTooClose(
					{ x: pos.x, y: pos.y },
					{ x: mouseX, y: mouseY },
					scareRadius * pos.scale // Scale scare radius with crow size
				)
			) {
				fleeFromMouse();
			}
		}

		animFrameId = requestAnimationFrame(animate);
	}

	onMount(() => {
		if (targets.length === 0) return;
		mounted = true;
		machine = new CrowStateMachine(targets);
		machine.setFlightDuration(flightDurationMs);
		if (carriedItem) machine.setCarriedItem(carriedItem);
		pos = machine.getCurrentPosition();
		animFrameId = requestAnimationFrame(animate);
		scheduleNextFlight();

		window.addEventListener('mousemove', onMouseMove, { passive: true });
	});

	onDestroy(() => {
		mounted = false;
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (idleTimer) clearTimeout(idleTimer);
		if (typeof window !== 'undefined') {
			window.removeEventListener('mousemove', onMouseMove);
		}
	});

	$: if (machine && targets.length > 0) {
		machine.updateTargets(targets);
	}

	// Carried item SVG helpers
	$: showItem = carriedItem !== null;
</script>

<div
	class="animated-crow"
	style="
		transform: translate({pos.x}px, {pos.y}px) scale({pos.scale}) {pos.flipX ? 'scaleX(-1)' : ''};
		will-change: transform;
		z-index: {currentZIndex};
	"
	aria-hidden="true"
	role="img"
>
	<svg
		viewBox="-55 -45 110 80"
		width="90"
		height="70"
		xmlns="http://www.w3.org/2000/svg"
		class="crow-svg"
		style={state === 'perched' ? `transform: translate(${idleAnim.bodyShiftX}px, ${idleAnim.bodyShiftY}px);` : ''}
	>
		{#if state === 'flying'}
			<!-- ===== FLYING WINGS (spread, flapping) ===== -->
			<!-- Left wing -->
			<g
				class="crow-wing"
				style="transform-origin: 0px -5px; transform: rotate({-wingAngle}deg);"
			>
				<path
					d="M-2,-5 C-15,-20 -35,-32 -50,-28 C-40,-18 -25,-10 -5,-5 Z"
					fill="var(--crow-wing, #1a1a1a)"
					stroke="var(--crow-outline, #0d0d0d)"
					stroke-width="0.8"
				/>
				<path d="M-18,-18 C-28,-26 -42,-28 -48,-26" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.5" />
				<path d="M-12,-14 C-22,-22 -36,-26 -44,-24" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.5" />
			</g>

			<!-- Right wing -->
			<g
				class="crow-wing"
				style="transform-origin: 0px -5px; transform: rotate({wingAngle}deg);"
			>
				<path
					d="M2,-5 C15,-20 35,-32 50,-28 C40,-18 25,-10 5,-5 Z"
					fill="var(--crow-wing, #1a1a1a)"
					stroke="var(--crow-outline, #0d0d0d)"
					stroke-width="0.8"
				/>
				<path d="M18,-18 C28,-26 42,-28 48,-26" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.5" />
				<path d="M12,-14 C22,-22 36,-26 44,-24" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.5" />
			</g>
		{:else}
			<!-- ===== FOLDED WINGS (perched, tucked against body) ===== -->
			<!-- Left wing — folded tight along the back -->
			<path
				d="M-4,-2 C-10,-4 -16,-2 -18,4 C-16,8 -10,10 -4,6 Z"
				fill="var(--crow-wing, #1a1a1a)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<!-- Folded wing feather lines -->
			<path d="M-6,0 C-10,0 -14,1 -16,3" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.4" />
			<path d="M-5,2 C-9,2 -13,3 -15,5" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.4" />
			<path d="M-5,4 C-9,4 -12,5 -14,7" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.3" />

			<!-- Right wing — folded tight along the back -->
			<path
				d="M4,-2 C10,-4 16,-2 18,4 C16,8 10,10 4,6 Z"
				fill="var(--crow-wing, #1a1a1a)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<path d="M6,0 C10,0 14,1 16,3" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.4" />
			<path d="M5,2 C9,2 13,3 15,5" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.4" />
			<path d="M5,4 C9,4 12,5 14,7" fill="none" stroke="var(--crow-feather, #2a2a2a)" stroke-width="0.3" />
		{/if}

		<!-- Tail feathers -->
		<g style={state === 'perched' ? `transform-origin: -6px 8px; transform: rotate(${idleAnim.tailWag}deg);` : ''}>
			<path
				d="M-8,8 C-18,18 -28,22 -32,20 C-24,16 -20,10 -14,6 Z"
				fill="var(--crow-body, #111111)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<path
				d="M-6,10 C-14,22 -22,28 -28,26 C-20,20 -16,14 -10,8 Z"
				fill="var(--crow-body, #111111)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<path
				d="M-4,8 C-12,20 -18,26 -24,24 C-16,18 -12,12 -8,6 Z"
				fill="var(--crow-tail, #191919)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
		</g>

		<!-- Body -->
		<ellipse
			cx="0"
			cy="2"
			rx="18"
			ry="12"
			fill="var(--crow-body, #111111)"
			stroke="var(--crow-outline, #0d0d0d)"
			stroke-width="0.8"
		/>

		<!-- Breast feather texture -->
		<path
			d="M6,6 C4,10 2,12 0,12 C-2,12 -4,10 -6,6"
			fill="none"
			stroke="var(--crow-feather, #2a2a2a)"
			stroke-width="0.4"
		/>
		<path
			d="M8,4 C6,8 3,10 0,10 C-3,10 -6,8 -8,4"
			fill="none"
			stroke="var(--crow-feather, #2a2a2a)"
			stroke-width="0.3"
		/>

		<!-- Head (with subtle idle tilt) -->
		<g style={state === 'perched' ? `transform-origin: 14px -5px; transform: rotate(${idleAnim.headTilt}deg);` : ''}>
			<circle
				cx="18"
				cy="-8"
				r="9"
				fill="var(--crow-head, #0f0f0f)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.8"
			/>

			<!-- Eye ring -->
			<circle cx="22" cy="-10" r="3.5" fill="var(--crow-eye-ring, #1a1a1a)" />

			<!-- Eye -->
			<circle cx="22.5" cy="-10" r="2" fill="var(--crow-eye, #e8e8e8)" />

			<!-- Pupil (shifts with lookDirection when perched) -->
			<circle
				cx={state === 'perched' ? 23 + idleAnim.lookDirection * 0.4 : 23}
				cy={state === 'perched' ? -10.2 + idleAnim.lookDirection * 0.15 : -10.2}
				r="1.1"
				fill="var(--crow-pupil, #111111)"
			/>

			<!-- Eye highlight -->
			<circle
				cx={state === 'perched' ? 23.5 + idleAnim.lookDirection * 0.3 : 23.5}
				cy="-11"
				r="0.5"
				fill="var(--crow-eye-highlight, #ffffff)"
			/>

			<!-- Beak -->
			<path
				d="M26,-8 L34,-6 L32,-4 L26,-5 Z"
				fill="var(--crow-beak, #2c2c2c)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<!-- Beak line (mouth) -->
			<line
				x1="26"
				y1="-6"
				x2="33"
				y2="-5.5"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.4"
			/>

			<!-- Carried item in beak (moved inside head group so it tilts with head) -->
			{#if showItem && carriedItem === 'letter'}
				<g class="crow-carried-item" transform="translate(32, -7) rotate(-10)">
					<rect
						x="0"
						y="-3"
						width="8"
						height="6"
						rx="0.5"
						fill="var(--crow-item-letter, #f5f0e0)"
						stroke="var(--crow-item-outline, #c4a86d)"
						stroke-width="0.5"
					/>
					<path d="M0,-3 L4,0 L8,-3" fill="none" stroke="var(--crow-item-outline, #c4a86d)" stroke-width="0.4" />
				</g>
			{:else if showItem && carriedItem === 'flower'}
				<g class="crow-carried-item" transform="translate(33, -8) rotate(-15)">
					<line x1="3" y1="2" x2="3" y2="8" stroke="#3a7d1e" stroke-width="0.8" />
					<circle cx="3" cy="0" r="2" fill="#e84393" />
					<circle cx="1.5" cy="1" r="1.5" fill="#fd79a8" />
					<circle cx="4.5" cy="1" r="1.5" fill="#fd79a8" />
					<circle cx="3" cy="0.5" r="0.8" fill="#fdcb6e" />
				</g>
			{:else if showItem && carriedItem === 'key'}
				<g class="crow-carried-item" transform="translate(33, -7) rotate(-20)">
					<line x1="0" y1="0" x2="10" y2="0" stroke="#c4a86d" stroke-width="1.2" stroke-linecap="round" />
					<circle cx="0" cy="0" r="2.5" fill="none" stroke="#c4a86d" stroke-width="1" />
					<path d="M7,0 L7,2 M9,0 L9,1.5" stroke="#c4a86d" stroke-width="0.8" stroke-linecap="round" />
				</g>
			{:else if showItem && carriedItem === 'coin'}
				<g class="crow-carried-item" transform="translate(33, -8)">
					<circle cx="3" cy="0" r="3" fill="#f9ca24" stroke="#d4a017" stroke-width="0.5" />
					<text x="3" y="1.5" text-anchor="middle" font-size="4" fill="#d4a017" font-weight="bold">$</text>
				</g>
			{:else if showItem && carriedItem === 'twig'}
				<g class="crow-carried-item" transform="translate(31, -6) rotate(-15)">
					<path d="M0,0 C3,-1 8,0 12,1" fill="none" stroke="#6d4c1d" stroke-width="1.2" stroke-linecap="round" />
					<path d="M5,-0.5 C6,-2 7,-3 8,-3" fill="none" stroke="#6d4c1d" stroke-width="0.6" stroke-linecap="round" />
					<path d="M8,0.5 C9,2 10,2 11,1.5" fill="none" stroke="#6d4c1d" stroke-width="0.6" stroke-linecap="round" />
				</g>
			{/if}
		</g>

		<!-- Legs (visible when perched) -->
		{#if state === 'perched'}
			<g class="crow-legs">
				<!-- Left leg -->
				<line
					x1="-3"
					y1="13"
					x2="-5"
					y2="24"
					stroke="var(--crow-leg, #333333)"
					stroke-width="1.2"
					stroke-linecap="round"
				/>
				<!-- Left foot -->
				<path
					d="M-9,24 L-5,24 L-2,24"
					fill="none"
					stroke="var(--crow-leg, #333333)"
					stroke-width="1"
					stroke-linecap="round"
				/>
				<path
					d="M-5,24 L-6,27"
					fill="none"
					stroke="var(--crow-leg, #333333)"
					stroke-width="0.8"
					stroke-linecap="round"
				/>

				<!-- Right leg -->
				<line
					x1="5"
					y1="13"
					x2="3"
					y2="24"
					stroke="var(--crow-leg, #333333)"
					stroke-width="1.2"
					stroke-linecap="round"
				/>
				<!-- Right foot -->
				<path
					d="M-1,24 L3,24 L6,24"
					fill="none"
					stroke="var(--crow-leg, #333333)"
					stroke-width="1"
					stroke-linecap="round"
				/>
				<path
					d="M3,24 L2,27"
					fill="none"
					stroke="var(--crow-leg, #333333)"
					stroke-width="0.8"
					stroke-linecap="round"
				/>
			</g>
		{/if}
	</svg>
</div>

<style>
	.animated-crow {
		position: fixed;
		/* z-index is set dynamically via inline style */
		pointer-events: none;
		transition: none;
		/* Offset so the crow's feet align with landing point */
		margin-left: -45px;
		margin-top: -55px;
	}

	.crow-svg {
		overflow: visible;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	/* Wing transition smoothing */
	.crow-wing {
		transition: transform 0.05s linear;
	}

	/* Legs fade in when landing */
	.crow-legs {
		animation: crow-legs-appear 0.3s ease-out forwards;
	}

	@keyframes crow-legs-appear {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Carried item subtle sway */
	.crow-carried-item {
		animation: item-sway 2s ease-in-out infinite;
	}

	@keyframes item-sway {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
</style>
