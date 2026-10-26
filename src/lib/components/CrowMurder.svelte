<!--
  CrowMurder.svelte

	Easter egg: when the user types "murder" on the page, 23 crows spawn
  off-screen and flock in. They fly around with boids flocking behavior,
  land on the page's ledges one crow per spot, and gradually depart over
  ~9 minutes until only one remains (joining the original crow).

  `perchSpots` are in DOCUMENT coordinates. Every frame the live scroll is
  subtracted, so a perched crow rides its letter or button as the page scrolls.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		MurderDetector,
		generateOffscreenSpawnPoints,
		computeFlockEntryDelays,
		computeDepartureSchedule,
		hasCrowExitedViewport,
		startFlockCrowPerch,
		startFlockCrowFlight,
		hasPerchExpired,
		computeFlockingForces,
		getWingFlapAngle,
		computeWingMode,
		computeSoaringOffset,
		computeDivingOffset,
		computeScareResponse,
		computeArriveVelocity,
		computeBankAngle,
		documentToViewport,
		frameScale,
		isInViewport,
		isMouseTooClose,
		pickNearestFreeSpot,
		CROW_FEET_X,
		CROW_FEET_Y,
		CROW_BODY_PIVOT_Y,
		type FlockCrow
	} from '$lib/utils/crow';

	/** Places the murder can perch, in document coordinates */
	export let perchSpots: Array<{ x: number; y: number }> = [];

	const FLOCK_COUNT = 23;
	const ENTRY_SPREAD_MS = 8000;
	const DEPARTURE_TOTAL_MS = 9 * 60 * 1000; // 9 minutes
	const CROW_SPEED = 3.5; // px per 60 Hz frame (scaled by real frame time)
	const PERCH_DURATION_MIN = 3000;
	const PERCH_DURATION_MAX = 12000;
	const MIN_FLIGHT_TIME_MS = 6000; // must fly at least 6s before landing
	const SEEK_CHANCE_PER_SECOND = 0.35; // chance per second a free crow heads for a perch
	const WAYPOINT_SEEK_CHANCE = 0.5; // chance a crow that reaches a waypoint heads for a perch
	const SCARE_RADIUS = 80; // mouse proximity to scare a perched crow
	const CHAIN_SCARE_RADIUS = 120; // radius to chain-scare nearby perched crows
	const MIN_PERCH_DISTANCE = 28; // minimum px between perched crows
	const LANDING_SLOW_RADIUS = 70; // start easing in this far from the perch
	const LANDED_WITHIN = 2.5; // px: close enough to settle onto the perch
	const SPOT_MARGIN = 24; // a spot must be this far inside the screen to be used
	const FLOCK_PHASE_MS = 12000; // crows flock freely for 12s before seeking perches
	const FLOCK_WANDER_RADIUS = 250; // how far waypoints scatter from flock center

	let active = false;
	let mounted = false;
	let animFrameId: number;
	let crows: FlockCrow[] = [];
	let entryDelays: number[] = [];
	let departureSchedule: number[] = [];
	let triggerTime = 0;
	let departureIndex = 0;
	let lastFrameTime = 0;

	/** Wing angles for each crow (computed in animate loop) */
	let wingAngles: number[] = [];

	/** Nose tilt in degrees for each crow while flying */
	let banks: number[] = [];

	/** Track when each crow started its current flight */
	let flightStartTimes: number[] = [];

	/** Current mouse position for scare mechanic */
	let mouseX = -1000;
	let mouseY = -1000;

	/** Perch spots as of the last frame, in viewport coordinates */
	let viewSpots: Array<{ x: number; y: number }> = [];

	function onMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	/** Spot positions for this frame: document coordinates minus the live scroll. */
	function currentViewSpots(): Array<{ x: number; y: number }> {
		const scroll = { x: window.scrollX, y: window.scrollY };
		return perchSpots.map((spot) => documentToViewport(spot, scroll));
	}

	function spotIsUsable(spot: { x: number; y: number }): boolean {
		return isInViewport(spot, { width: window.innerWidth, height: window.innerHeight }, SPOT_MARGIN);
	}

	/** Where the flock gathers while it wanders: over the visible perches, a little above. */
	function gatherPoint(): { x: number; y: number } {
		const visible = viewSpots.filter(spotIsUsable);
		if (visible.length === 0) {
			return { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
		}
		return {
			x: visible.reduce((sum, p) => sum + p.x, 0) / visible.length,
			y: visible.reduce((sum, p) => sum + p.y, 0) / visible.length - 180
		};
	}

	function wanderTarget(center: { x: number; y: number }): { x: number; y: number } {
		const angle = Math.random() * Math.PI * 2;
		const radius = 80 + Math.random() * FLOCK_WANDER_RADIUS;
		return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
	}

	function activate() {
		if (active) return;
		active = true;
		triggerTime = Date.now();
		lastFrameTime = triggerTime;

		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const spawnPoints = generateOffscreenSpawnPoints(FLOCK_COUNT, { width: vw, height: vh });
		entryDelays = computeFlockEntryDelays(FLOCK_COUNT, ENTRY_SPREAD_MS);
		departureSchedule = computeDepartureSchedule(FLOCK_COUNT, DEPARTURE_TOTAL_MS);
		departureIndex = 0;
		flightStartTimes = new Array(FLOCK_COUNT).fill(0);
		viewSpots = currentViewSpots();

		const center = gatherPoint();
		crows = spawnPoints.map((sp, i) => {
			// Initial target: a scattered waypoint in the flock gathering zone
			// (NOT the perch spots: they flock around first)
			const angle = (i / FLOCK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
			const radius = 80 + Math.random() * FLOCK_WANDER_RADIUS;
			return {
				id: i,
				x: sp.x,
				y: sp.y,
				vx: 0,
				vy: 0,
				targetX: center.x + Math.cos(angle) * radius,
				targetY: center.y + Math.sin(angle) * radius,
				state: 'waiting' as const,
				facing: (Math.random() < 0.5 ? -1 : 1) as 1 | -1
			};
		});

		wingAngles = new Array(FLOCK_COUNT).fill(0);
		banks = new Array(FLOCK_COUNT).fill(0);
		window.addEventListener('mousemove', onMouseMove);
		animFrameId = requestAnimationFrame(animate);
	}

	function pickDepartureTarget(crow: FlockCrow): { x: number; y: number } {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		// Pick a random off-screen point to fly toward
		const edge = Math.floor(Math.random() * 4);
		const margin = 200 + Math.random() * 200;
		switch (edge) {
			case 0: return { x: crow.x + (Math.random() - 0.5) * 400, y: -margin };
			case 1: return { x: vw + margin, y: crow.y + (Math.random() - 0.5) * 400 };
			case 2: return { x: crow.x + (Math.random() - 0.5) * 400, y: vh + margin };
			default: return { x: -margin, y: crow.y + (Math.random() - 0.5) * 400 };
		}
	}

	/** Positions that are taken: perched crows, and the spots others are flying to. */
	function occupiedPositions(except: number): Array<{ x: number; y: number }> {
		const taken: Array<{ x: number; y: number }> = [];
		for (let j = 0; j < crows.length; j++) {
			if (j === except) continue;
			const other = crows[j];
			if (other.spotIndex === undefined) continue;
			const spot = viewSpots[other.spotIndex];
			if (spot) taken.push(spot);
		}
		return taken;
	}

	/**
	 * Whether a crow heading for `spot` has lost it: another crow already sits
	 * near it, or another crow is flying to the same spot and is closer (ties go
	 * to the lower id), so exactly one of two rivals backs off.
	 */
	function isContested(i: number, spot: { x: number; y: number }): boolean {
		const me = crows[i];
		const myDist = Math.hypot(spot.x - me.x, spot.y - me.y);
		for (let j = 0; j < crows.length; j++) {
			if (j === i) continue;
			const other = crows[j];
			if (other.state === 'perched') {
				if (Math.hypot(other.x - spot.x, other.y - spot.y) < MIN_PERCH_DISTANCE) return true;
			} else if (other.state === 'flying' && other.spotIndex !== undefined) {
				const theirSpot = viewSpots[other.spotIndex];
				if (!theirSpot || Math.hypot(theirSpot.x - spot.x, theirSpot.y - spot.y) >= MIN_PERCH_DISTANCE) {
					continue;
				}
				const theirDist = Math.hypot(spot.x - other.x, spot.y - other.y);
				if (theirDist < myDist || (theirDist === myDist && other.id < me.id)) return true;
			}
		}
		return false;
	}

	/** Send a crow to the nearest free, visible perch. True when it found one. */
	function seekPerch(i: number): boolean {
		const crow = crows[i];
		const index = pickNearestFreeSpot(
			{ x: crow.x, y: crow.y },
			viewSpots,
			occupiedPositions(i),
			MIN_PERCH_DISTANCE,
			spotIsUsable
		);
		if (index < 0) return false;
		crow.spotIndex = index;
		crow.targetX = viewSpots[index].x;
		crow.targetY = viewSpots[index].y;
		return true;
	}

	/** Give up a perch it was heading for and go back to wandering. */
	function abandonPerch(crow: FlockCrow, center: { x: number; y: number }) {
		crow.spotIndex = undefined;
		const w = wanderTarget(center);
		crow.targetX = w.x;
		crow.targetY = w.y;
	}

	function leavePerch(i: number, now: number, target: { x: number; y: number }) {
		flightStartTimes[i] = now;
		startFlockCrowFlight(crows[i], target);
	}

	function animate() {
		if (!mounted || !active) return;

		const now = Date.now();
		const fs = frameScale(now - lastFrameTime);
		lastFrameTime = now;
		const elapsed = now - triggerTime;
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		viewSpots = currentViewSpots();
		const center = gatherPoint();

		// Are we still in the flock phase? (first FLOCK_PHASE_MS ms)
		const inFlockPhase = elapsed < FLOCK_PHASE_MS;

		// Activate waiting crows whose entry delay has passed
		for (let i = 0; i < crows.length; i++) {
			if (crows[i].state === 'waiting' && elapsed >= entryDelays[i]) {
				crows[i].state = 'flying';
				flightStartTimes[i] = now;
			}
		}

		// Trigger departures according to schedule
		while (departureIndex < departureSchedule.length && elapsed >= departureSchedule[departureIndex]) {
			// Anyone still on the page can be the one to leave, not always the first
			const leaving = crows.filter((c) => c.state === 'flying' || c.state === 'perched');
			if (leaving.length > 0) {
				const candidate = leaving[Math.floor(Math.random() * leaving.length)];
				startFlockCrowFlight(candidate, pickDepartureTarget(candidate), 'departing');
			}
			departureIndex++;
		}

		// Compute flocking forces for flying crows
		const forces = computeFlockingForces(crows);

		for (let i = 0; i < crows.length; i++) {
			const crow = crows[i];

			if (crow.state === 'waiting' || crow.state === 'departed') {
				wingAngles[i] = 0;
				banks[i] = 0;
				continue;
			}

			if (crow.state === 'perched') {
				wingAngles[i] = 0;
				banks[i] = 0;

				// Ride the perch as the page scrolls; leave if it has gone off screen.
				const spot = crow.spotIndex !== undefined ? viewSpots[crow.spotIndex] : undefined;
				if (!spot || !spotIsUsable(spot)) {
					leavePerch(i, now, wanderTarget(center));
					continue;
				}
				crow.x = spot.x;
				crow.y = spot.y;

				// Check if mouse is too close — scare this crow off!
				if (isMouseTooClose({ x: crow.x, y: crow.y }, { x: mouseX, y: mouseY }, SCARE_RADIUS)) {
					const nearbyPerched = crows
						.filter((c, ci) => ci !== i && c.state === 'perched')
						.map((c) => ({ id: c.id, x: c.x, y: c.y }));
					const scare = computeScareResponse(
						{ x: crow.x, y: crow.y },
						{ x: mouseX, y: mouseY },
						nearbyPerched,
						SCARE_RADIUS,
						CHAIN_SCARE_RADIUS
					);

					leavePerch(i, now, {
						x: crow.x + scare.fleeDirection.dx * 300,
						y: crow.y + scare.fleeDirection.dy * 300
					});
					crow.vx = scare.fleeDirection.dx * CROW_SPEED * 1.5;
					crow.vy = scare.fleeDirection.dy * CROW_SPEED * 1.5;

					// Chain-scare nearby perched crows, each in a slightly different direction
					for (const scaredId of scare.scaredNearbyIds) {
						const si = crows.findIndex((c) => c.id === scaredId);
						const sCrow = crows[si];
						if (!sCrow || sCrow.state !== 'perched') continue;
						const angle = Math.atan2(scare.fleeDirection.dy, scare.fleeDirection.dx)
							+ (Math.random() - 0.5) * 1.2;
						leavePerch(si, now, {
							x: sCrow.x + Math.cos(angle) * 250,
							y: sCrow.y + Math.sin(angle) * 250
						});
						sCrow.vx = Math.cos(angle) * CROW_SPEED;
						sCrow.vy = Math.sin(angle) * CROW_SPEED;
					}
					continue;
				}

				if (hasPerchExpired(crow, now)) {
					leavePerch(i, now, wanderTarget(center));
				}
				continue;
			}

			// ── Flying or departing ──
			const flightTime = now - flightStartTimes[i];
			let landing = false;

			if (crow.state === 'flying') {
				if (crow.spotIndex !== undefined) {
					// Heading for a perch: follow it (it moves when the page scrolls) and
					// give it up if it vanished, went off screen, or someone else took it.
					const spot = viewSpots[crow.spotIndex];
					const contested = spot ? isContested(i, spot) : true;
					if (!spot || !spotIsUsable(spot) || contested) {
						abandonPerch(crow, center);
					} else {
						crow.targetX = spot.x;
						crow.targetY = spot.y;
						landing = true;
					}
				} else if (!inFlockPhase && flightTime > MIN_FLIGHT_TIME_MS) {
					// Free to pick a perch now and then
					if (Math.random() < SEEK_CHANCE_PER_SECOND * (fs / 60)) {
						landing = seekPerch(i);
					}
				}
			}

			const dx = crow.targetX - crow.x;
			const dy = crow.targetY - crow.y;
			const dist = Math.hypot(dx, dy);

			// Landed: settle exactly onto the spot, no snapping from somewhere else
			if (landing && dist <= LANDED_WITHIN) {
				const spot = viewSpots[crow.spotIndex as number];
				const duration =
					PERCH_DURATION_MIN + Math.random() * (PERCH_DURATION_MAX - PERCH_DURATION_MIN);
				const index = crow.spotIndex as number;
				startFlockCrowPerch(crow, spot, now, duration);
				crow.spotIndex = index;
				wingAngles[i] = 0;
				banks[i] = 0;
				continue;
			}

			// Desired velocity: ease in while landing, cruise otherwise
			let desiredVx: number;
			let desiredVy: number;
			if (landing) {
				const v = computeArriveVelocity(
					{ x: crow.x, y: crow.y },
					{ x: crow.targetX, y: crow.targetY },
					CROW_SPEED,
					LANDING_SLOW_RADIUS
				);
				desiredVx = v.vx;
				desiredVy = v.vy;
			} else {
				desiredVx = dist > 0 ? (dx / dist) * CROW_SPEED : 0;
				desiredVy = dist > 0 ? (dy / dist) * CROW_SPEED : 0;
				// Flocking forces apply to free flight only
				if (crow.state === 'flying' && forces[i]) {
					desiredVx += forces[i].dx * 0.05;
					desiredVy += forces[i].dy * 0.05;
				}
			}

			// Smooth velocity transition, independent of the screen's refresh rate
			const smoothing = 1 - Math.pow(1 - 0.08, fs);
			crow.vx += (desiredVx - crow.vx) * smoothing;
			crow.vy += (desiredVy - crow.vy) * smoothing;

			// Never overshoot the perch in a single step
			const step = Math.hypot(crow.vx, crow.vy) * fs;
			if (landing && step > dist) {
				crow.x = crow.targetX;
				crow.y = crow.targetY;
			} else {
				crow.x += crow.vx * fs;
				crow.y += crow.vy * fs;
			}

			// Wing flapping/gliding/soaring
			const crowElapsed = now - triggerTime + i * 37;
			const wingMode = landing ? 'flapping' : computeWingMode(crowElapsed);
			wingAngles[i] = getWingFlapAngle(wingMode, crowElapsed);

			// Free flight only: S/C-curve drift while soaring, a plunge while diving
			if (!landing) {
				const crowScale = 0.28 + (crow.id % 5) * 0.03;
				if (wingMode === 'soaring') {
					const soarOffset = computeSoaringOffset(crowElapsed, 18 * crowScale);
					crow.x += soarOffset.dx * 0.06 * fs;
					crow.y += soarOffset.dy * 0.06 * fs;
				} else if (wingMode === 'diving') {
					const diveOffset = computeDivingOffset(crowElapsed, 14 * crowScale);
					crow.x += diveOffset.dx * 0.06 * fs;
					crow.y += diveOffset.dy * 0.06 * fs;
				}
			}

			// Face the way it is flying; tilt along its path
			if (Math.abs(crow.vx) > 0.3) crow.facing = crow.vx < 0 ? -1 : 1;
			banks[i] = computeBankAngle(crow.facing === -1 ? -Math.abs(crow.vx) : Math.abs(crow.vx), crow.vy);

			if (crow.state === 'flying' && !landing && dist < 15) {
				if (inFlockPhase || flightTime <= MIN_FLIGHT_TIME_MS) {
					// Reached a waypoint: pick a new wandering one
					const w = wanderTarget(center);
					crow.targetX = w.x;
					crow.targetY = w.y;
				} else if (Math.random() < WAYPOINT_SEEK_CHANCE && seekPerch(i)) {
					// found a perch to head for
				} else {
					const w = wanderTarget(center);
					crow.targetX = w.x;
					crow.targetY = w.y;
				}
			}

			// Check if departing crow has left the viewport
			if (crow.state === 'departing') {
				if (hasCrowExitedViewport({ x: crow.x, y: crow.y }, viewport, 120)) {
					crow.state = 'departed';
					wingAngles[i] = 0;
					banks[i] = 0;
				}
			}
		}

		// Force Svelte reactivity
		crows = crows;
		wingAngles = wingAngles;
		banks = banks;

		animFrameId = requestAnimationFrame(animate);
	}

	/**
	 * The spot list is rebuilt when the page re-measures (resize, fonts, layout).
	 * Re-point each crow that holds or is heading to a spot at the nearest spot in
	 * the new list, or let it go if that spot no longer exists.
	 */
	let knownSpots: Array<{ x: number; y: number }> = [];
	$: remapSpots(perchSpots);

	function remapSpots(next: Array<{ x: number; y: number }>) {
		const previous = knownSpots;
		knownSpots = next;
		if (!active || previous.length === 0) return;
		for (const crow of crows) {
			if (crow.spotIndex === undefined) continue;
			const old = previous[crow.spotIndex];
			let best = -1;
			let bestDist = 40;
			if (old) {
				for (let k = 0; k < next.length; k++) {
					const d = Math.hypot(next[k].x - old.x, next[k].y - old.y);
					if (d < bestDist) {
						bestDist = d;
						best = k;
					}
				}
			}
			crow.spotIndex = best >= 0 ? best : undefined;
		}
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
	{#each crows as crow, i}
		{#if crow.state !== 'waiting' && crow.state !== 'departed'}
			{@const isFlying = crow.state === 'flying' || crow.state === 'departing'}
			{@const flipX = crow.facing === -1}
			{@const crowScale = 0.28 + (crow.id % 5) * 0.03}
			<div
				class="murder-crow"
				data-crow-id={crow.id}
				data-state={crow.state}
				style="
					margin-left: -{CROW_FEET_X}px;
					margin-top: -{CROW_FEET_Y}px;
					transform-origin: {CROW_FEET_X}px {CROW_FEET_Y}px;
					transform: translate({crow.x}px, {crow.y}px) scale({crowScale}) {flipX ? 'scaleX(-1)' : ''};
					z-index: 44;
				"
				aria-hidden="true"
			>
				<div
					class="murder-crow-bank"
					style="transform-origin: {CROW_FEET_X}px {CROW_BODY_PIVOT_Y}px; transform: rotate({isFlying ? banks[i] : 0}deg);"
				>
				<svg
					viewBox="-55 -45 110 80"
					width="90"
					height="70"
					xmlns="http://www.w3.org/2000/svg"
					class="murder-crow-svg"
				>
					{#if isFlying}
						<!-- Flying wings -->
						<g style="transform-origin: 0px -5px; transform: rotate({-wingAngles[i]}deg);">
							<path d="M-2,-5 C-15,-20 -35,-32 -50,-28 C-40,-18 -25,-10 -5,-5 Z" fill="var(--crow-wing, #1a1a1a)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />
						</g>
						<g style="transform-origin: 0px -5px; transform: rotate({wingAngles[i]}deg);">
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
					{#if crow.state === 'perched'}
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
