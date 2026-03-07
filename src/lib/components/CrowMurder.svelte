<!--
  CrowMurder.svelte

  Easter egg: when the user types "murder" on the page, 42 crows spawn
  off-screen and flock in. They fly around with boids flocking behavior,
  perch occasionally, and gradually depart over ~9 minutes until only
  one remains (joining the original crow).
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		MurderDetector,
		generateOffscreenSpawnPoints,
		computeFlockEntryDelays,
		computeDepartureSchedule,
		computeFlockingForces,
		getWingFlapAngle,
		computeWingMode,
		computeSoaringOffset,
		computeDivingOffset,
		distributeAmongPerchSpots,
		isSpotOccupied,
		pickAvailablePerchSpot,
		computeScareResponse,
		shouldAttemptLanding,
		isMouseTooClose,
		easeInOutCubic,
		type FlockCrow,
		type CrowTarget
	} from '$lib/utils/crow';

	/** Landing targets shared with the main crow */
	export let targets: CrowTarget[] = [];

	/** Optional character perch spots where the murder prefers to gather
	 *  (e.g. character positions on the site title) */
	export let perchSpots: Array<{ x: number; y: number }> = [];

	const FLOCK_COUNT = 42;
	const ENTRY_SPREAD_MS = 8000;
	const DEPARTURE_TOTAL_MS = 9 * 60 * 1000; // 9 minutes
	const CROW_SPEED = 3.5; // px per frame
	const PERCH_DURATION_MIN = 3000;
	const PERCH_DURATION_MAX = 12000;
	const MIN_FLIGHT_TIME_MS = 6000; // must fly at least 6s before landing
	const LANDING_CHANCE = 0.04; // per-frame chance when conditions met
	const SCARE_RADIUS = 80; // mouse proximity to scare a perched crow
	const CHAIN_SCARE_RADIUS = 120; // radius to chain-scare nearby perched crows
	const MIN_PERCH_DISTANCE = 18; // minimum px between perched crows
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

	/** Wing angles for each crow (computed in animate loop) */
	let wingAngles: number[] = [];

	/** Pre-computed perch assignments for each crow */
	let perchPositions: Array<{ x: number; y: number }> = [];

	/** Track where each perched crow is sitting (to prevent overlap) */
	let occupiedSpots: Array<{ x: number; y: number }> = [];

	/** Track when each crow started its current flight */
	let flightStartTimes: number[] = [];

	/** Current mouse position for scare mechanic */
	let mouseX = -1000;
	let mouseY = -1000;

	function onMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	function activate() {
		if (active) return;
		active = true;
		triggerTime = Date.now();

		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const spawnPoints = generateOffscreenSpawnPoints(FLOCK_COUNT, { width: vw, height: vh });
		entryDelays = computeFlockEntryDelays(FLOCK_COUNT, ENTRY_SPREAD_MS);
		departureSchedule = computeDepartureSchedule(FLOCK_COUNT, DEPARTURE_TOTAL_MS);
		departureIndex = 0;

		// Assign each crow a preferred perch spot (cycling through available spots)
		if (perchSpots.length > 0) {
			perchPositions = distributeAmongPerchSpots(FLOCK_COUNT, perchSpots);
		}

		// Initialize flight start times
		flightStartTimes = new Array(FLOCK_COUNT).fill(0);
		occupiedSpots = [];

		// Pick a central target area for crows to initially fly toward
		const centerX = vw / 2;
		const centerY = vh / 2;

		// Compute a flock gathering zone: near the perch area but offset above
		let flockCenterX = centerX;
		let flockCenterY = centerY * 0.5; // upper half of viewport
		if (perchSpots.length > 0) {
			// Average position of perch spots, shifted upward
			flockCenterX = perchSpots.reduce((s, p) => s + p.x, 0) / perchSpots.length;
			flockCenterY = perchSpots.reduce((s, p) => s + p.y, 0) / perchSpots.length - 180;
		}

		crows = spawnPoints.map((sp, i) => {
			// Initial target: a scattered waypoint in the flock gathering zone
			// (NOT the perch spots — they should flock around first)
			const angle = (i / FLOCK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
			const radius = 80 + Math.random() * FLOCK_WANDER_RADIUS;
			const tx = flockCenterX + Math.cos(angle) * radius;
			const ty = flockCenterY + Math.sin(angle) * radius;

			return {
				id: i,
				x: sp.x,
				y: sp.y,
				vx: 0,
				vy: 0,
				targetX: tx,
				targetY: ty,
				state: 'waiting' as const
			};
		});

		wingAngles = new Array(FLOCK_COUNT).fill(0);
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

	function animate() {
		if (!mounted || !active) return;

		const now = Date.now();
		const elapsed = now - triggerTime;

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
			// Find a flying or perched crow to depart
			const candidate = crows.find((c) => c.state === 'flying' || c.state === 'perched');
			if (candidate) {
				const dest = pickDepartureTarget(candidate);
				candidate.targetX = dest.x;
				candidate.targetY = dest.y;
				candidate.state = 'departing';
			}
			departureIndex++;
		}

		// Compute flocking forces for flying crows
		const flyingCrows = crows.filter((c) => c.state === 'flying');
		const forces = computeFlockingForces(crows);

		for (let i = 0; i < crows.length; i++) {
			const crow = crows[i];

			if (crow.state === 'waiting' || crow.state === 'departed') {
				wingAngles[i] = 0;
				continue;
			}

			if (crow.state === 'perched') {
				wingAngles[i] = 0;

				// Check if mouse is too close — scare this crow off!
				if (isMouseTooClose({ x: crow.x, y: crow.y }, { x: mouseX, y: mouseY }, SCARE_RADIUS)) {
					// Compute flee direction and chain-scare nearby crows
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

					// Scare this crow
					occupiedSpots = occupiedSpots.filter(
						(s) => Math.abs(s.x - crow.x) > 2 || Math.abs(s.y - crow.y) > 2
					);
					crow.state = 'flying';
					flightStartTimes[i] = now;
					crow.targetX = crow.x + scare.fleeDirection.dx * 300;
					crow.targetY = crow.y + scare.fleeDirection.dy * 300;
					crow.vx = scare.fleeDirection.dx * CROW_SPEED * 1.5;
					crow.vy = scare.fleeDirection.dy * CROW_SPEED * 1.5;

					// Chain-scare nearby perched crows (with a slight delay effect
					// simulated by giving them smaller velocity)
					for (const scaredId of scare.scaredNearbyIds) {
						const sCrow = crows.find((c) => c.id === scaredId);
						if (sCrow && sCrow.state === 'perched') {
							occupiedSpots = occupiedSpots.filter(
								(s) => Math.abs(s.x - sCrow.x) > 2 || Math.abs(s.y - sCrow.y) > 2
							);
							sCrow.state = 'flying';
							const si = crows.indexOf(sCrow);
							if (si >= 0) flightStartTimes[si] = now;
							// Flee in a similar but slightly randomized direction
							const angle = Math.atan2(scare.fleeDirection.dy, scare.fleeDirection.dx)
								+ (Math.random() - 0.5) * 1.2;
							sCrow.targetX = sCrow.x + Math.cos(angle) * 250;
							sCrow.targetY = sCrow.y + Math.sin(angle) * 250;
							sCrow.vx = Math.cos(angle) * CROW_SPEED;
							sCrow.vy = Math.sin(angle) * CROW_SPEED;
						}
					}
					continue;
				}

				// Check if perch duration has elapsed (stored in vx as perchEndTime hack)
				if (now >= crow.vx) {
					occupiedSpots = occupiedSpots.filter(
						(s) => Math.abs(s.x - crow.x) > 2 || Math.abs(s.y - crow.y) > 2
					);
					crow.state = 'flying';
					flightStartTimes[i] = now;
					// Prefer perch spots; fallback to random targets
					if (perchPositions.length > 0) {
						const pp = perchPositions[i % perchPositions.length];
						crow.targetX = pp.x;
						crow.targetY = pp.y;
					} else if (targets.length > 0) {
						const t = targets[Math.floor(Math.random() * targets.length)];
						crow.targetX = t.x + (Math.random() - 0.5) * 200;
						crow.targetY = t.y + (Math.random() - 0.5) * 100;
					}
				}
				continue;
			}

			// Flying or departing — steer toward target with flocking
			const dx = crow.targetX - crow.x;
			const dy = crow.targetY - crow.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			// Desired velocity toward target
			let desiredVx = dist > 0 ? (dx / dist) * CROW_SPEED : 0;
			let desiredVy = dist > 0 ? (dy / dist) * CROW_SPEED : 0;

			// Add flocking forces (only for flying, not departing)
			if (crow.state === 'flying' && forces[i]) {
				desiredVx += forces[i].dx * 0.05;
				desiredVy += forces[i].dy * 0.05;
			}

			// Smooth velocity transition
			crow.vx += (desiredVx - crow.vx) * 0.08;
			crow.vy += (desiredVy - crow.vy) * 0.08;

			crow.x += crow.vx;
			crow.y += crow.vy;

			// Wing flapping/gliding/soaring
			const crowElapsed = now - triggerTime + i * 37;
			const wingMode = computeWingMode(crowElapsed);
			wingAngles[i] = getWingFlapAngle(wingMode, crowElapsed);

			// During soaring, apply S/C-curve lateral drift
			if (wingMode === 'soaring') {
				const crowScale = 0.28 + (crow.id % 5) * 0.03;
				const soarOffset = computeSoaringOffset(crowElapsed, 18 * crowScale);
				crow.x += soarOffset.dx * 0.06;
				crow.y += soarOffset.dy * 0.06;
			}

			// During diving, apply steep downward plunge with wobble
			if (wingMode === 'diving') {
				const crowScale = 0.28 + (crow.id % 5) * 0.03;
				const diveOffset = computeDivingOffset(crowElapsed, 14 * crowScale);
				crow.x += diveOffset.dx * 0.06;
				crow.y += diveOffset.dy * 0.06;
			}

			// Check if close to target
			const flightTime = now - flightStartTimes[i];
			if (dist < 15) {
				if (crow.state === 'departing') {
					crow.state = 'departed';
					wingAngles[i] = 0;
				} else if (crow.state === 'flying' && inFlockPhase) {
					// During flock phase: reached waypoint, pick a new wandering waypoint
					let fcx = window.innerWidth / 2;
					let fcy = window.innerHeight * 0.25;
					if (perchSpots.length > 0) {
						fcx = perchSpots.reduce((s, p) => s + p.x, 0) / perchSpots.length;
						fcy = perchSpots.reduce((s, p) => s + p.y, 0) / perchSpots.length - 180;
					}
					const angle = Math.random() * Math.PI * 2;
					const radius = 80 + Math.random() * FLOCK_WANDER_RADIUS;
					crow.targetX = fcx + Math.cos(angle) * radius;
					crow.targetY = fcy + Math.sin(angle) * radius;
				} else if (crow.state === 'flying') {
					// Post-flock phase: crows can now attempt landing
					const landChance = perchPositions.length > 0 ? 0.15 : LANDING_CHANCE;
					const willPerch = shouldAttemptLanding(
						dist, flightTime, MIN_FLIGHT_TIME_MS, landChance
					);

					if (willPerch && perchPositions.length > 0) {
						// Find a spot that isn't already occupied
						const spot = pickAvailablePerchSpot(
							i, perchSpots, occupiedSpots, MIN_PERCH_DISTANCE
						);
						if (spot) {
							crow.state = 'perched';
							const perchDuration = PERCH_DURATION_MIN + Math.random() * (PERCH_DURATION_MAX - PERCH_DURATION_MIN);
							crow.vx = now + perchDuration;
							crow.vy = 0;
							crow.x = spot.x;
							crow.y = spot.y;
							occupiedSpots.push({ x: spot.x, y: spot.y });
						} else {
							// All spots taken — pick a new target to circle
							const pp = perchPositions[i % perchPositions.length];
							crow.targetX = pp.x + (Math.random() - 0.5) * 200;
							crow.targetY = pp.y + (Math.random() - 0.5) * 150;
						}
					} else if (willPerch) {
						// No perch spots — land at current position
						if (!isSpotOccupied({ x: crow.x, y: crow.y }, occupiedSpots, MIN_PERCH_DISTANCE)) {
							crow.state = 'perched';
							const perchDuration = PERCH_DURATION_MIN + Math.random() * (PERCH_DURATION_MAX - PERCH_DURATION_MIN);
							crow.vx = now + perchDuration;
							crow.vy = 0;
							occupiedSpots.push({ x: crow.x, y: crow.y });
						} else {
							// Too close to another crow — keep flying
							crow.targetX = crow.x + (Math.random() - 0.5) * 300;
							crow.targetY = crow.y + (Math.random() - 0.5) * 150;
						}
					} else {
						// Didn't land — pick a new target to fly toward
						if (perchPositions.length > 0) {
							// Fly near a perch spot (with some scatter) to circle around
							const pp = perchPositions[i % perchPositions.length];
							crow.targetX = pp.x + (Math.random() - 0.5) * 180;
							crow.targetY = pp.y + (Math.random() - 0.5) * 120;
						} else if (targets.length > 0) {
							const t = targets[Math.floor(Math.random() * targets.length)];
							crow.targetX = t.x + (Math.random() - 0.5) * 300;
							crow.targetY = t.y + (Math.random() - 0.5) * 150;
						} else {
							crow.targetX = Math.random() * window.innerWidth;
							crow.targetY = Math.random() * window.innerHeight;
						}
					}
				}
			}

			// Transition from flock phase to perch-seeking: redirect crows toward perch spots
			// This happens once when flock phase ends, gradually staggered
			if (!inFlockPhase && crow.state === 'flying' && flightTime > MIN_FLIGHT_TIME_MS) {
				// Occasionally redirect this crow toward its assigned perch spot
				// (small per-frame chance so they don't all switch at once)
				if (perchPositions.length > 0 && Math.random() < 0.005) {
					const pp = perchPositions[i % perchPositions.length];
					crow.targetX = pp.x;
					crow.targetY = pp.y;
				}
			}

			// Check if departing crow has left the viewport
			if (crow.state === 'departing') {
				const vw = window.innerWidth;
				const vh = window.innerHeight;
				if (crow.x < -250 || crow.x > vw + 250 || crow.y < -250 || crow.y > vh + 250) {
					crow.state = 'departed';
					wingAngles[i] = 0;
				}
			}
		}

		// Check if all crows have departed (except one stays)
		const remaining = crows.filter((c) => c.state !== 'departed' && c.state !== 'waiting');
		if (remaining.length <= 1 && departureIndex >= departureSchedule.length) {
			// Murder is over — one crow may remain on screen as a bonus
			// Don't deactivate completely, just let it be
		}

		// Force Svelte reactivity
		crows = crows;
		wingAngles = wingAngles;

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
	{#each crows as crow, i}
		{#if crow.state !== 'waiting' && crow.state !== 'departed'}
			{@const isFlying = crow.state === 'flying' || crow.state === 'departing'}
			{@const flipX = crow.vx < -0.2}
			{@const rotation = isFlying ? Math.atan2(crow.vy, crow.vx) * (180 / Math.PI) : 0}
			{@const crowScale = 0.28 + (crow.id % 5) * 0.03}
			<div
				class="murder-crow"
				style="
					transform: translate({crow.x}px, {crow.y}px) scale({crowScale}) {flipX ? 'scaleX(-1)' : ''};
					z-index: 44;
				"
				aria-hidden="true"
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
					<path d="M-8,8 C-18,18 -28,22 -32,20 C-24,16 -20,10 -14,6 Z" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />
					<path d="M-6,10 C-14,22 -22,28 -28,26 C-20,20 -16,14 -10,8 Z" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />

					<!-- Body -->
					<ellipse cx="0" cy="2" rx="18" ry="12" fill="var(--crow-body, #111111)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />

					<!-- Head -->
					<circle cx="18" cy="-8" r="9" fill="var(--crow-head, #0f0f0f)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.8" />
					<!-- Eye -->
					<circle cx="22.5" cy="-10" r="2" fill="var(--crow-eye, #e8e8e8)" />
					<circle cx="23" cy="-10.2" r="1.1" fill="var(--crow-pupil, #111111)" />
					<!-- Beak -->
					<path d="M26,-8 L34,-6 L32,-4 L26,-5 Z" fill="var(--crow-beak, #2c2c2c)" stroke="var(--crow-outline, #0d0d0d)" stroke-width="0.5" />

					<!-- Legs (when perched) -->
					{#if crow.state === 'perched'}
						<line x1="-3" y1="13" x2="-5" y2="24" stroke="var(--crow-leg, #333333)" stroke-width="1.2" stroke-linecap="round" />
						<path d="M-9,24 L-5,24 L-2,24" fill="none" stroke="var(--crow-leg, #333333)" stroke-width="1" stroke-linecap="round" />
						<line x1="5" y1="13" x2="3" y2="24" stroke="var(--crow-leg, #333333)" stroke-width="1.2" stroke-linecap="round" />
						<path d="M-1,24 L3,24 L6,24" fill="none" stroke="var(--crow-leg, #333333)" stroke-width="1" stroke-linecap="round" />
					{/if}
				</svg>
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
		margin-left: -45px;
		margin-top: -55px;
	}

	.murder-crow-svg {
		overflow: visible;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
	}
</style>
