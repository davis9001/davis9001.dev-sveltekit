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
		computeWingMode,
		computeSoaringOffset,
		computeDivingOffset,
		getIdleAnimation,
		isMouseTooClose,
		pickRandomCharIndex,
		findTextNodeOffset,
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

	/** ID of the target the crow should start perched on (defaults to first target) */
	export let startingTargetId: string | undefined = undefined;

	/** Optional: keep wings gently flapping while perched */
	export let flapWhenPerched = false;

	/** Perched flap amplitude in degrees */
	export let perchedFlapAmplitude = 16;

	/** Perched flap cycles per second */
	export let perchedFlapFrequencyHz = 2.2;

	/** Optional callback fired every animation frame with the crow's current pixel position.
	 * Useful for pages that want to synthesise mouse events at the crow's location. */
	export let onPositionTick: ((x: number, y: number) => void) | null = null;

	/** Optional externally-driven crow position override. */
	export let manualPosition: CrowPosition | null = null;

	let machine: CrowStateMachine | null = null;
	let animFrameId: number;
	let idleTimer: ReturnType<typeof setTimeout>;
	let pos: CrowPosition = { x: 0, y: 0, scale: 1, rotation: 0, flipX: false };
	let wingAngle = 0;
	let state: 'perched' | 'taking-off' | 'flying' | 'gliding' | 'soaring' | 'diving' | 'landing' = 'perched';
	let mounted = false;
	let animStartTime = 0;
	let idleAnim: IdleAnimation = { headTilt: 0, bodyShiftX: 0, bodyShiftY: 0, tailWag: 0, lookDirection: 0, wingStretch: 0, bowAmount: 0 };
	let mouseX = -9999;
	let mouseY = -9999;
	let scareCooldown = false; // Prevent rapid re-scaring
	let currentZIndex = 45;
	let perchedFlapping = false;
	/** Base devicePixelRatio captured at mount — used to compensate for zoom */
	let baseDPR = 1;
	/** Zoom compensation factor: baseDPR / currentDPR */
	let zoomCompensation = 1;

	/** Cached character index per text-aware target, chosen once per landing */
	let textCharMap = new Map<string, number>();

	$: if (machine && carriedItem !== undefined) {
		machine.setCarriedItem(carriedItem);
	}

	/**
	 * Select a random character in a text-aware target's element and cache it.
	 * Called once per landing so the crow sticks to the same character while perched.
	 */
	function selectTextChar(target: CrowTarget): void {
		if (!target.textAware || !target.anchorSelector) return;
		const el = document.querySelector(target.anchorSelector);
		if (!el) return;
		const text = el.textContent || '';
		const charIndex = pickRandomCharIndex(text);
		if (charIndex >= 0) {
			textCharMap.set(target.id, charIndex);
		}
	}

	/**
	 * Use the Range API to get the viewport position of a specific character
	 * inside an element. Walks all text nodes to find the right one.
	 */
	function getCharPosition(el: Element, flatIndex: number): { x: number; y: number } | null {
		const textNodes: Text[] = [];
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			textNodes.push(node);
		}
		if (textNodes.length === 0) return null;

		const nodeLengths = textNodes.map((n) => n.length);
		const result = findTextNodeOffset(nodeLengths, flatIndex);
		if (!result) return null;

		const textNode = textNodes[result.nodeIndex];
		const range = document.createRange();
		range.setStart(textNode, result.offset);
		range.setEnd(textNode, Math.min(result.offset + 1, textNode.length));
		const rect = range.getBoundingClientRect();
		range.detach();

		return {
			x: rect.left + rect.width / 2,
			y: rect.top
		};
	}

	/**
	 * Resolve the live position of a target from the DOM.
	 * For text-aware targets, uses the Range API to land on a specific character.
	 * Otherwise uses the bounding-box + anchorAlign approach.
	 * Falls back to static x/y when no anchor element is found.
	 */
	function resolveTargetPosition(target: CrowTarget): { x: number; y: number } {
		if (target.anchorSelector) {
			const el = document.querySelector(target.anchorSelector);
			if (el) {
				// Text-aware: land on a specific character
				if (target.textAware && textCharMap.has(target.id)) {
					const charIndex = textCharMap.get(target.id)!;
					const charPos = getCharPosition(el, charIndex);
					if (charPos) return charPos;
				}
				// Fallback: bounding box
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
				// Pre-select a character for text-aware targets
				const flightTarget = machine.getFlightTarget();
				if (flightTarget?.textAware) {
					selectTextChar(flightTarget);
				}
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
		// Pre-select a character for text-aware targets
		const flightTarget = machine.getFlightTarget();
		if (flightTarget?.textAware) {
			selectTextChar(flightTarget);
		}
		state = 'flying';
		animStartTime = Date.now();

		// Cooldown prevents re-scaring immediately after landing
		setTimeout(() => { scareCooldown = false; }, 3000);
	}

	function animate() {
		if (!machine || !mounted) return;

		// Compensate for browser zoom so the crow stays the same visual size
		zoomCompensation = baseDPR / (window.devicePixelRatio || 1);

		const currentState = machine.getState();

		if (currentState === 'flying') {
			perchedFlapping = false;
			const progress = machine.getFlightProgress();
			pos = machine.getCurrentPosition();
			const elapsed = Date.now() - animStartTime;
			const wingMode = computeWingMode(elapsed);
			wingAngle = getWingFlapAngle(wingMode, elapsed);
			state = wingMode === 'flapping' ? 'flying' : wingMode;
			currentZIndex = machine.getCurrentZIndex();

			// During soaring, add S/C-curve lateral drift
			if (wingMode === 'soaring') {
				const soarOffset = computeSoaringOffset(elapsed, 25 * pos.scale);
				pos = { ...pos, x: pos.x + soarOffset.dx, y: pos.y + soarOffset.dy };
			}

			// During diving, add steep downward plunge with wobble
			if (wingMode === 'diving') {
				const diveOffset = computeDivingOffset(elapsed, 20 * pos.scale);
				pos = { ...pos, x: pos.x + diveOffset.dx, y: pos.y + diveOffset.dy };
			}

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
			if (flapWhenPerched) {
				const elapsedSec = Date.now() / 1000;
				wingAngle = Math.sin(elapsedSec * Math.PI * 2 * perchedFlapFrequencyHz) * perchedFlapAmplitude;
				perchedFlapping = true;
			} else {
				wingAngle = 0; // Wings folded when perched
				perchedFlapping = false;
			}
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

		if (manualPosition) {
			pos = manualPosition;
			state = 'flying';
			perchedFlapping = false;
			wingAngle = getWingFlapAngle('flapping', Date.now());
		}

		if (onPositionTick) onPositionTick(pos.x, pos.y);
		animFrameId = requestAnimationFrame(animate);
	}

	/**
	 * Immediately start a flight from the current perch to the next target.
	 * Intended for external triggering via bind:this — e.g. from a hidden canvas route
	 * that dispatches a custom event to launch the crow at a precise moment.
	 */
	export function triggerFlight(): void {
		if (!machine || machine.getState() !== 'perched') return;
		if (idleTimer) clearTimeout(idleTimer);
		refreshTargetPositions();
		machine.setFlightDuration(flightDurationMs);
		machine.startFlight();
		state = 'flying';
		animStartTime = Date.now();
	}

	onMount(() => {
		if (targets.length === 0) return;
		mounted = true;
		baseDPR = window.devicePixelRatio || 1;
		machine = new CrowStateMachine(targets, startingTargetId);
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
		transform: translate({pos.x}px, {pos.y}px) scale({pos.scale * zoomCompensation}) {pos.flipX ? 'scaleX(-1)' : ''};
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
	>
		{#if state === 'flying' || state === 'gliding' || state === 'soaring' || state === 'diving' || perchedFlapping}
			<!-- ===== FLYING WINGS (spread: flapping, gliding, soaring, or diving) ===== -->
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
		{:else if idleAnim.wingStretch > 0}
			<!-- ===== STRETCHING WINGS (idle wing open/close) ===== -->
			<!-- Left wing — partially open -->
			<g
				class="crow-wing"
				style="transform-origin: 0px -5px; transform: rotate({-idleAnim.wingStretch * 35}deg);"
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

			<!-- Right wing — partially open -->
			<g
				class="crow-wing"
				style="transform-origin: 0px -5px; transform: rotate({idleAnim.wingStretch * 35}deg);"
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

		<!-- Tail feathers — longer, more tapered for realism -->
		<g style={state === 'perched' ? `transform-origin: -6px 8px; transform: rotate(${idleAnim.tailWag}deg);` : ''}>
			<path
				d="M-8,6 C-16,14 -30,22 -36,20 C-28,14 -20,8 -14,4 Z"
				fill="var(--crow-body, #111111)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<path
				d="M-6,8 C-14,18 -28,28 -34,26 C-24,18 -16,12 -10,6 Z"
				fill="var(--crow-body, #111111)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<path
				d="M-4,7 C-12,17 -24,26 -30,24 C-20,16 -14,10 -8,5 Z"
				fill="var(--crow-tail, #191919)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<!-- Tail feather barb lines -->
			<path d="M-14,12 C-20,16 -26,19 -30,20" fill="none" stroke="var(--crow-feather, #1e1e1e)" stroke-width="0.3" />
			<path d="M-12,14 C-18,18 -24,22 -28,24" fill="none" stroke="var(--crow-feather, #1e1e1e)" stroke-width="0.3" />
		</g>

		<!-- Body — sleeker, more elongated ellipse -->
		<ellipse
			cx="0"
			cy="2"
			rx="20"
			ry="11"
			fill="var(--crow-body, #111111)"
			stroke="var(--crow-outline, #0d0d0d)"
			stroke-width="0.8"
		/>

		<!-- Iridescent sheen on back (subtle blue-green highlight) -->
		<ellipse
			cx="-2"
			cy="-1"
			rx="14"
			ry="7"
			fill="none"
			stroke="var(--crow-sheen, #1a2030)"
			stroke-width="1.5"
			opacity="0.3"
		/>

		<!-- Breast feather texture — layered scallops -->
		<path
			d="M8,5 C6,9 3,11 0,11 C-3,11 -6,9 -8,5"
			fill="none"
			stroke="var(--crow-feather, #1e1e1e)"
			stroke-width="0.4"
		/>
		<path
			d="M10,3 C8,7 4,9 0,9 C-4,9 -8,7 -10,3"
			fill="none"
			stroke="var(--crow-feather, #1e1e1e)"
			stroke-width="0.35"
		/>
		<path
			d="M6,7 C4,10 2,12 0,12 C-2,12 -4,10 -6,7"
			fill="none"
			stroke="var(--crow-feather, #1e1e1e)"
			stroke-width="0.3"
		/>

		<!-- Head (with subtle idle tilt) — slightly smaller, more angular -->
		<g style={state === 'perched' ? `transform-origin: 14px -5px; transform: rotate(${idleAnim.headTilt}deg);` : ''}>
			<!-- Head shape — slightly flattened on top like a real crow -->
			<ellipse
				cx="18"
				cy="-8"
				rx="9"
				ry="8.5"
				fill="var(--crow-head, #0f0f0f)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.8"
			/>

			<!-- Forehead bump — crows have a slight forehead ridge -->
			<path
				d="M14,-14 C16,-16 20,-16.5 24,-14"
				fill="var(--crow-head, #0f0f0f)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.6"
			/>

			<!-- Eye — dark, almost all-black with subtle sheen -->
			<circle cx="22" cy="-10" r="2.8" fill="var(--crow-eye, #0a0a0a)" />
			<!-- Iris — very dark brown, barely visible -->
			<circle cx="22.2" cy="-10" r="2" fill="var(--crow-iris, #151010)" />
			<!-- Pupil -->
			<circle
				cx={state === 'perched' ? 22.5 + idleAnim.lookDirection * 0.3 : 22.5}
				cy={state === 'perched' ? -10.1 + idleAnim.lookDirection * 0.1 : -10.1}
				r="1.3"
				fill="var(--crow-pupil, #050505)"
			/>
			<!-- Eye highlight — tiny, subtle sheen -->
			<circle
				cx={state === 'perched' ? 23.2 + idleAnim.lookDirection * 0.2 : 23.2}
				cy="-11"
				r="0.6"
				fill="var(--crow-eye-highlight, #333333)"
				opacity="0.6"
			/>
			<!-- Secondary micro-highlight -->
			<circle cx="21.5" cy="-9.5" r="0.3" fill="var(--crow-eye-highlight, #333333)" opacity="0.35" />

			<!-- Beak — longer, slightly curved like a real crow -->
			<path
				d="M26,-9 C28,-9.5 32,-8 35,-6.5 C33,-5 30,-4.5 26,-5 Z"
				fill="var(--crow-beak, #1a1a1a)"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.5"
			/>
			<!-- Beak ridge -->
			<path
				d="M26,-8 C29,-8 32,-7 34,-6.5"
				fill="none"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.6"
			/>
			<!-- Beak line (mouth) -->
			<line
				x1="26"
				y1="-6.5"
				x2="34"
				y2="-6"
				stroke="var(--crow-outline, #0d0d0d)"
				stroke-width="0.4"
			/>
			<!-- Nostril -->
			<circle cx="28" cy="-8" r="0.5" fill="var(--crow-outline, #0d0d0d)" />

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
