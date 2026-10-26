/**
 * Murder-of-crows flock simulation.
 *
 * Pure and deterministic given a seeded random source: the Svelte component
 * only feeds it the clock, the viewport, the scroll offset and the mouse, and
 * draws whatever it reports. Units are pixels and seconds.
 *
 * What the flock does:
 *  - arrives as small sub-flocks ("squads") from different edges
 *  - each squad weaves round a slowly orbiting anchor with proper boids rules
 *    (separation, alignment, cohesion), a little wander and soft screen edges
 *  - a squad settles together: it picks a cluster of free ledges, lands there
 *    one crow per ledge, dwells, then lifts off a crow at a time
 *  - perched crows preen, look about, and spook in a wave spreading from the
 *    mouse; flying crows swerve round it
 *  - near crows are bigger, faster and in front; wings flap in bursts and glide
 *  - the flock thins out in groups over nine minutes and one crow stays
 */
import {
	computeArriveVelocity,
	computeBankAngle,
	documentToViewport,
	hasCrowExitedViewport,
	isInViewport,
	pickNearestFreeSpot
} from './crow';

export type BirdState =
	| 'waiting'
	| 'flying'
	| 'landing'
	| 'perched'
	| 'takeoff'
	| 'departing'
	| 'departed';

export type WingKind = 'flap' | 'glide' | 'soar';

export interface Bird {
	id: number;
	squad: number;
	state: BirdState;
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** 0 = far away, 1 = close to the glass */
	depth: number;
	/** Drawn size (the SVG is scaled by this) */
	scale: number;
	/** Multiplier on the flock's cruise speed */
	speedFactor: number;
	flapHz: number;
	/** Where in the squad's formation this crow likes to fly */
	slotAngle: number;
	slotRadius: number;
	facing: 1 | -1;
	/** Nose-up/down tilt in degrees while flying (smoothed) */
	bank: number;
	/** Wing angle in degrees, eased towards the current wing mode */
	wing: number;
	wingKind: WingKind;
	wingUntil: number;
	flapPhase: number;
	/** Index into the document-space perch spots this crow holds or is flying to */
	spot: number;
	/** When to lift off if scared or the squad is done (ms, 0 = not set) */
	liftAt: number;
	takeoffUntil: number;
	/** Delay after the murder is called before this crow shows up (ms) */
	enterAt: number;
	/** Has it been on screen yet (edges only pull back crows that have) */
	entered: boolean;
	idlePhase: number;
	nextLook: number;
	landedAt: number;
	/** Perch-time hop offset in px (negative = up) */
	hop: number;
	/** Idle tilt while perched, degrees */
	idleTilt: number;
	departTo: { x: number; y: number } | null;
}

export type SquadMode = 'roam' | 'settle' | 'perch';

export interface Squad {
	id: number;
	members: number[];
	mode: SquadMode;
	/** When the current mode ends (ms since the flock was called) */
	until: number;
	/** Absolute deadline for settling (ms since called) */
	settleDeadline: number;
	phase: number;
	radiusX: number;
	radiusY: number;
	periodS: number;
}

export interface FlockConfig {
	count: number;
	squadSize: number;
	entrySpreadMs: number;
	departureTotalMs: number;
	departureGraceMs: number;
	/** Cruise speed, px per second, before depth and per-crow factors */
	cruise: number;
	maxAccel: number;
	freePhaseMs: number;
	perchMinMs: number;
	perchMaxMs: number;
	roamMinMs: number;
	roamMaxMs: number;
	maxPerchedFraction: number;
	minPerchDistance: number;
	landSlowRadius: number;
	landedWithin: number;
	spotMargin: number;
	scareRadius: number;
	chainRadius: number;
	mouseAvoidRadius: number;
	separationRadius: number;
	neighbourRadius: number;
}

export const FLOCK_CONFIG: FlockConfig = {
	count: 23,
	squadSize: 4,
	entrySpreadMs: 8000,
	departureTotalMs: 9 * 60 * 1000,
	departureGraceMs: 30_000,
	cruise: 215,
	maxAccel: 520,
	freePhaseMs: 12_000,
	perchMinMs: 5000,
	perchMaxMs: 15_000,
	roamMinMs: 9000,
	roamMaxMs: 24_000,
	maxPerchedFraction: 0.6,
	minPerchDistance: 28,
	landSlowRadius: 120,
	landedWithin: 2.5,
	spotMargin: 24,
	scareRadius: 80,
	chainRadius: 160,
	mouseAvoidRadius: 120,
	separationRadius: 38,
	neighbourRadius: 210
};

export interface FlockEnv {
	/** Wall clock in ms */
	now: number;
	viewport: { width: number; height: number };
	scroll: { x: number; y: number };
	mouse: { x: number; y: number } | null;
}

/** Small seeded generator (mulberry32) so tests can replay a flock exactly. */
export function createRng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Wing angle in degrees for a wing mode and flap phase (radians). */
export function computeWingAngle(kind: WingKind, flapPhase: number): number {
	switch (kind) {
		case 'flap':
			return Math.sin(flapPhase) * 40;
		case 'glide':
			return -15;
		case 'soar':
			return -3;
	}
}

/**
 * Small movements for a perched crow: a slow sway, now and then a preen where
 * the head dips. Phase is per crow so the murder does not move in unison.
 */
export function computePerchedIdle(timeMs: number, phase: number): number {
	const s = timeMs / 1000;
	const sway = Math.sin(s * 0.9 + phase * 6.28) * 2.2;
	const preenClock = (s + phase * 40) % 13;
	const preen = preenClock < 1.4 ? Math.sin((preenClock / 1.4) * Math.PI) * 13 : 0;
	return sway + preen;
}

/** Hop height in px (negative is up) for the settle after touching down. */
export function computeLandingHop(sinceLandedMs: number): number {
	const u = sinceLandedMs / 280;
	if (u < 0 || u > 1) return 0;
	return -6 * Math.sin(u * Math.PI);
}

/** Depth to drawn size: near crows are bigger. */
export function depthToScale(depth: number): number {
	return 0.27 + depth * 0.14;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

function limit(v: { x: number; y: number }, max: number): { x: number; y: number } {
	const m = Math.hypot(v.x, v.y);
	if (m <= max || m === 0) return v;
	return { x: (v.x / m) * max, y: (v.y / m) * max };
}

export class Flock {
	readonly config: FlockConfig;
	readonly birds: Bird[] = [];
	readonly squads: Squad[] = [];
	/** The crow that never leaves */
	readonly stayer: number;

	private readonly rng: () => number;
	private readonly t0: number;
	private last: number;
	private docSpots: Array<{ x: number; y: number }> = [];
	private groupSizes: number[] = [];
	private departureTimes: number[] = [];
	private departureIndex = 0;
	private viewSpots: Array<{ x: number; y: number }> = [];

	constructor(options: {
		now: number;
		viewport: { width: number; height: number };
		rng?: () => number;
		config?: Partial<FlockConfig>;
	}) {
		this.config = { ...FLOCK_CONFIG, ...options.config };
		this.rng = options.rng ?? Math.random;
		this.t0 = options.now;
		this.last = options.now;
		const { count, squadSize } = this.config;
		const squadCount = Math.max(1, Math.ceil(count / squadSize));

		for (let s = 0; s < squadCount; s++) {
			this.squads.push({
				id: s,
				members: [],
				mode: 'roam',
				until: this.config.freePhaseMs + this.rng() * 9000,
				settleDeadline: 0,
				phase: this.rng() * Math.PI * 2,
				radiusX: 150 + this.rng() * 150,
				radiusY: 70 + this.rng() * 90,
				periodS: 16 + this.rng() * 12
			});
		}

		for (let i = 0; i < count; i++) {
			const squad = i % squadCount;
			const depth = this.rng();
			const bird: Bird = {
				id: i,
				squad,
				state: 'waiting',
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				depth,
				scale: depthToScale(depth),
				speedFactor: 0.82 + depth * 0.3 + (this.rng() - 0.5) * 0.12,
				flapHz: 3.6 + this.rng() * 1.8,
				slotAngle: 0,
				slotRadius: 0,
				facing: this.rng() < 0.5 ? -1 : 1,
				bank: 0,
				wing: 0,
				wingKind: 'flap',
				wingUntil: 0,
				flapPhase: this.rng() * Math.PI * 2,
				spot: -1,
				liftAt: 0,
				takeoffUntil: 0,
				enterAt: 0,
				entered: false,
				idlePhase: this.rng(),
				nextLook: 0,
				landedAt: 0,
				hop: 0,
				idleTilt: 0,
				departTo: null
			};
			this.birds.push(bird);
			this.squads[squad].members.push(i);
		}

		// Each member gets its own place in the squad's formation, evenly spread
		// round the anchor and alternating near and far, so no two aim for the same spot
		for (const squad of this.squads) {
			squad.members.forEach((id, k) => {
				const bird = this.birds[id];
				bird.slotAngle = (k / squad.members.length) * Math.PI * 2 + (this.rng() - 0.5) * 0.4;
				bird.slotRadius = 45 + (k % 2) * 40 + this.rng() * 12;
			});
		}

		this.placeEntries(options.viewport);
		this.stayer = Math.floor(this.rng() * count);
		this.planDepartures();
	}

	/** Squads come in from a different edge each, a beat apart. */
	private placeEntries(viewport: { width: number; height: number }) {
		const { entrySpreadMs } = this.config;
		for (const squad of this.squads) {
			const edge = squad.id % 4;
			const margin = 60 + this.rng() * 120;
			const along = this.rng();
			const base = { x: 0, y: 0 };
			if (edge === 0) {
				base.x = along * viewport.width;
				base.y = -margin;
			} else if (edge === 1) {
				base.x = viewport.width + margin;
				base.y = along * viewport.height;
			} else if (edge === 2) {
				base.x = along * viewport.width;
				base.y = viewport.height + margin;
			} else {
				base.x = -margin;
				base.y = along * viewport.height;
			}
			const arrival = (squad.id / this.squads.length) * entrySpreadMs + this.rng() * 600;
			// Spread along the edge, and only ever further out, so nobody pops in on screen
			const out = {
				x: edge === 1 ? 1 : edge === 3 ? -1 : 0,
				y: edge === 2 ? 1 : edge === 0 ? -1 : 0
			};
			for (const id of squad.members) {
				const bird = this.birds[id];
				const along = (this.rng() - 0.5) * 140;
				const deeper = this.rng() * 80;
				bird.x = base.x + (out.x !== 0 ? out.x * deeper : along);
				bird.y = base.y + (out.y !== 0 ? out.y * deeper : along);
				bird.enterAt = arrival + this.rng() * 700;
			}
		}
	}

	/** Groups of one to three leave, spread over the schedule; the stayer never goes. */
	private planDepartures() {
		let remaining = this.config.count - 1;
		while (remaining > 0) {
			const size = Math.min(remaining, 1 + Math.floor(this.rng() * 3));
			this.groupSizes.push(size);
			remaining -= size;
		}
		const { departureGraceMs: grace, departureTotalMs: total } = this.config;
		const groups = this.groupSizes.length;
		this.departureTimes = this.groupSizes
			.map((_, i) => grace + ((i + this.rng() * 0.8) / groups) * (total - grace))
			.sort((a, b) => a - b);
	}

	/**
	 * Give the flock new places to perch, in document coordinates. Crows holding
	 * or heading for a spot are re-pointed at the nearest spot in the new list,
	 * or let go if it no longer exists.
	 */
	setSpots(next: Array<{ x: number; y: number }>) {
		const previous = this.docSpots;
		this.docSpots = next;
		if (previous.length === 0) return;
		for (const bird of this.birds) {
			if (bird.spot < 0) continue;
			const old = previous[bird.spot];
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
			bird.spot = best;
			if (best < 0 && bird.state === 'landing') bird.state = 'flying';
		}
	}

	/** Number of crows that are on screen or about to be. */
	activeCount(): number {
		return this.birds.filter((b) => b.state !== 'waiting' && b.state !== 'departed').length;
	}

	perchedCount(): number {
		return this.birds.filter((b) => b.state === 'perched').length;
	}

	/** Where the flock gathers: over the ledges you can see, a little above them. */
	gatherPoint(viewport: { width: number; height: number }): { x: number; y: number } {
		const visible = this.viewSpots.filter((s) => this.spotUsable(s, viewport));
		if (visible.length === 0) return { x: viewport.width / 2, y: viewport.height * 0.3 };
		return {
			x: visible.reduce((sum, p) => sum + p.x, 0) / visible.length,
			y: visible.reduce((sum, p) => sum + p.y, 0) / visible.length - 160
		};
	}

	private spotUsable(spot: { x: number; y: number }, viewport: { width: number; height: number }) {
		return isInViewport(spot, viewport, this.config.spotMargin);
	}

	/** Spot positions (view space) held by anyone but `except`. */
	private heldSpots(except: number): Array<{ x: number; y: number }> {
		const held: Array<{ x: number; y: number }> = [];
		for (const b of this.birds) {
			if (b.id === except || b.spot < 0) continue;
			const p = this.viewSpots[b.spot];
			if (p) held.push(p);
		}
		return held;
	}

	/** Advance the flock to `env.now`. */
	step(env: FlockEnv) {
		const rawDt = (env.now - this.last) / 1000;
		this.last = env.now;
		const dt = clamp(rawDt, 0, 0.05);
		const t = env.now - this.t0;
		this.viewSpots = this.docSpots.map((s) => documentToViewport(s, env.scroll));
		const center = this.gatherPoint(env.viewport);

		this.runEntries(t, center);
		this.runDepartures(t, env);
		for (const squad of this.squads) this.runSquad(squad, t, env);

		if (dt === 0) return;
		for (const bird of this.birds) {
			switch (bird.state) {
				case 'waiting':
				case 'departed':
					break;
				case 'perched':
					this.updatePerched(bird, env);
					break;
				case 'takeoff':
				case 'flying':
				case 'landing':
				case 'departing':
					this.updateFlying(bird, dt, env, t, center);
					break;
			}
		}
	}

	// ── Director ────────────────────────────────────────────────────────────

	private runEntries(t: number, center: { x: number; y: number }) {
		for (const bird of this.birds) {
			if (bird.state !== 'waiting' || t < bird.enterAt) continue;
			bird.state = 'flying';
			const speed = this.cruiseOf(bird) * 0.8;
			const dx = center.x - bird.x;
			const dy = center.y - bird.y;
			const d = Math.hypot(dx, dy) || 1;
			bird.vx = (dx / d) * speed;
			bird.vy = (dy / d) * speed;
			bird.facing = bird.vx < 0 ? -1 : 1;
		}
	}

	private runDepartures(t: number, env: FlockEnv) {
		while (
			this.departureIndex < this.groupSizes.length &&
			t >= this.departureTimes[this.departureIndex]
		) {
			const size = this.groupSizes[this.departureIndex];
			const candidates = this.birds.filter(
				(b) =>
					b.id !== this.stayer &&
					(b.state === 'flying' ||
						b.state === 'perched' ||
						b.state === 'landing' ||
						b.state === 'takeoff')
			);
			// A leaving group is a squad-mate or two, not strangers: start with one
			// and pull in neighbours of the same squad first.
			if (candidates.length > 0) {
				const first = candidates[Math.floor(this.rng() * candidates.length)];
				const group = [first];
				for (const c of candidates) {
					if (group.length >= size) break;
					if (c !== first && c.squad === first.squad) group.push(c);
				}
				for (const c of candidates) {
					if (group.length >= size) break;
					if (!group.includes(c)) group.push(c);
				}
				for (const bird of group) this.startDeparting(bird, env);
			}
			this.departureIndex++;
		}
	}

	private startDeparting(bird: Bird, env: FlockEnv) {
		const { width, height } = env.viewport;
		const edge = Math.floor(this.rng() * 4);
		const margin = 220 + this.rng() * 200;
		if (edge === 0) bird.departTo = { x: bird.x + (this.rng() - 0.5) * 500, y: -margin };
		else if (edge === 1)
			bird.departTo = { x: width + margin, y: bird.y + (this.rng() - 0.5) * 500 };
		else if (edge === 2)
			bird.departTo = { x: bird.x + (this.rng() - 0.5) * 500, y: height + margin };
		else bird.departTo = { x: -margin, y: bird.y + (this.rng() - 0.5) * 500 };
		bird.spot = -1;
		bird.liftAt = 0;
		if (bird.state === 'perched') {
			bird.vx = bird.facing * 120;
			bird.vy = -160;
		}
		bird.state = 'departing';
		bird.wingKind = 'flap';
		bird.wingUntil = Number.POSITIVE_INFINITY;
	}

	private runSquad(squad: Squad, t: number, env: FlockEnv) {
		const cfg = this.config;
		const members = squad.members.map((i) => this.birds[i]);
		const alive = members.filter(
			(b) => b.state !== 'waiting' && b.state !== 'departed' && b.state !== 'departing'
		);
		if (alive.length === 0) return;

		if (squad.mode === 'roam') {
			if (t < squad.until) return;
			const total = this.activeCount();
			const taken = this.birds.filter((b) => b.state === 'perched' || b.state === 'landing').length;
			const flying = alive.filter((b) => b.state === 'flying');
			if (flying.length === 0 || (taken + flying.length) / total > cfg.maxPerchedFraction) {
				squad.until = t + 3000;
				return;
			}
			if (this.beginSettle(flying, env)) {
				squad.mode = 'settle';
				squad.settleDeadline = t + 14_000;
			} else {
				squad.until = t + 4000;
			}
		} else if (squad.mode === 'settle') {
			const landing = alive.filter((b) => b.state === 'landing');
			if (landing.length === 0 || t > squad.settleDeadline) {
				for (const b of landing) {
					b.spot = -1;
					b.state = 'flying';
				}
				squad.mode = 'perch';
				squad.until = t + cfg.perchMinMs + this.rng() * (cfg.perchMaxMs - cfg.perchMinMs);
			}
		} else {
			if (t < squad.until) return;
			const perched = alive.filter((b) => b.state === 'perched');
			for (const b of perched) b.liftAt = env.now + this.rng() * 1400;
			squad.mode = 'roam';
			squad.until = t + cfg.roamMinMs + this.rng() * (cfg.roamMaxMs - cfg.roamMinMs);
		}
	}

	/**
	 * Choose a landing zone and give each flying member the nearest free ledge to
	 * it, so the squad ends up sitting together. False when nothing is free.
	 */
	private beginSettle(flying: Bird[], env: FlockEnv): boolean {
		const cfg = this.config;
		const usable = this.viewSpots
			.map((s, i) => ({ s, i }))
			.filter(({ s }) => this.spotUsable(s, env.viewport));
		if (usable.length === 0) return false;
		const zone = usable[Math.floor(this.rng() * usable.length)].s;
		let assigned = 0;
		const held = this.heldSpots(-1);
		for (const bird of flying) {
			const index = pickNearestFreeSpot(zone, this.viewSpots, held, cfg.minPerchDistance, (s) =>
				this.spotUsable(s, env.viewport)
			);
			if (index < 0) break;
			bird.spot = index;
			bird.state = 'landing';
			held.push(this.viewSpots[index]);
			assigned++;
		}
		return assigned > 0;
	}

	// ── Per-crow updates ────────────────────────────────────────────────────

	private cruiseOf(bird: Bird): number {
		return this.config.cruise * bird.speedFactor;
	}

	private updatePerched(bird: Bird, env: FlockEnv) {
		const cfg = this.config;
		const spot = bird.spot >= 0 ? this.viewSpots[bird.spot] : undefined;
		if (!spot || !this.spotUsable(spot, env.viewport)) {
			this.liftOff(bird, env.now);
			return;
		}
		bird.x = spot.x;
		bird.y = spot.y;
		bird.vx = 0;
		bird.vy = 0;
		bird.wing = 0;
		bird.bank = 0;
		bird.hop = computeLandingHop(env.now - bird.landedAt);
		bird.idleTilt = computePerchedIdle(env.now - this.t0, bird.idlePhase);

		if (env.now >= bird.nextLook) {
			if (bird.nextLook > 0 && this.rng() < 0.6) bird.facing = bird.facing === 1 ? -1 : 1;
			bird.nextLook = env.now + 3500 + this.rng() * 8000;
		}

		// A mouse close by spooks this crow, and the fright runs through its
		// neighbours a moment later, further away later still.
		if (env.mouse && Math.hypot(env.mouse.x - bird.x, env.mouse.y - bird.y) < cfg.scareRadius) {
			for (const other of this.birds) {
				if (other.state !== 'perched') continue;
				const d = Math.hypot(other.x - bird.x, other.y - bird.y);
				if (d > cfg.chainRadius) continue;
				const at = env.now + d * 2.2 + this.rng() * 120;
				if (other.liftAt === 0 || at < other.liftAt) other.liftAt = at;
			}
			bird.liftAt = env.now;
		}

		if (bird.liftAt > 0 && env.now >= bird.liftAt) this.liftOff(bird, env.now);
	}

	private liftOff(bird: Bird, now: number) {
		bird.spot = -1;
		bird.liftAt = 0;
		bird.state = 'takeoff';
		bird.takeoffUntil = now + 700;
		bird.vx = bird.facing * (90 + this.rng() * 80);
		bird.vy = -(150 + this.rng() * 90);
		bird.wingKind = 'flap';
		bird.wingUntil = now + 900;
		bird.hop = 0;
		bird.idleTilt = 0;
	}

	private updateFlying(
		bird: Bird,
		dt: number,
		env: FlockEnv,
		t: number,
		center: { x: number; y: number }
	) {
		const cfg = this.config;
		const cruise = this.cruiseOf(bird);
		let maxSpeed = cruise;
		let ax = 0;
		let ay = 0;
		let sepAx = 0;
		let sepAy = 0;

		if (bird.state === 'takeoff') {
			// Climb away: strong upstroke, no flocking until it has some height
			ay -= 260;
			ax += bird.facing * 120;
			if (env.now >= bird.takeoffUntil) bird.state = 'flying';
		} else if (bird.state === 'landing') {
			const spot = bird.spot >= 0 ? this.viewSpots[bird.spot] : undefined;
			if (!spot || !this.spotUsable(spot, env.viewport)) {
				bird.spot = -1;
				bird.state = 'flying';
			} else {
				const dist = Math.hypot(spot.x - bird.x, spot.y - bird.y);
				if (dist <= cfg.landedWithin) return this.touchDown(bird, spot, env.now);
				const want = computeArriveVelocity(bird, spot, cruise, cfg.landSlowRadius);
				ax += (want.vx - bird.vx) * 4.2;
				ay += (want.vy - bird.vy) * 4.2;
				maxSpeed = cruise;
				const step = Math.hypot(bird.vx, bird.vy) * dt;
				if (step >= dist) return this.touchDown(bird, spot, env.now);
			}
		}

		if (bird.state === 'departing' && bird.departTo) {
			const dx = bird.departTo.x - bird.x;
			const dy = bird.departTo.y - bird.y;
			const d = Math.hypot(dx, dy) || 1;
			maxSpeed = cruise * 1.15;
			ax += ((dx / d) * maxSpeed - bird.vx) * 2.4;
			ay += ((dy / d) * maxSpeed - bird.vy) * 2.4;
			if (hasCrowExitedViewport(bird, env.viewport, 120)) {
				bird.state = 'departed';
				bird.wing = 0;
				bird.bank = 0;
				return;
			}
		} else if (bird.state === 'flying') {
			const f = this.flockForces(bird, t, env, center);
			ax += f.x;
			ay += f.y;
			sepAx = f.sx;
			sepAy = f.sy;
		}

		// Swerve round the mouse
		if (env.mouse && bird.state !== 'landing') {
			const mx = bird.x - env.mouse.x;
			const my = bird.y - env.mouse.y;
			const md = Math.hypot(mx, my);
			if (md < cfg.mouseAvoidRadius && md > 0) {
				const k = (1 - md / cfg.mouseAvoidRadius) * 900;
				ax += (mx / md) * k;
				ay += (my / md) * k;
			}
		}

		// Steering has a limit; keeping out of another crow's way has its own
		const acc = limit({ x: ax, y: ay }, cfg.maxAccel * 1.4);
		const sep = limit({ x: sepAx, y: sepAy }, cfg.maxAccel * 3);
		bird.vx += (acc.x + sep.x) * dt;
		bird.vy += (acc.y + sep.y) * dt;

		// Crows do not hover while flying: hold a minimum speed along the heading
		const speed = Math.hypot(bird.vx, bird.vy);
		if (bird.state !== 'landing') {
			const floor = maxSpeed * 0.5;
			if (speed < floor) {
				const hx = speed > 0.01 ? bird.vx / speed : bird.facing;
				const hy = speed > 0.01 ? bird.vy / speed : 0;
				bird.vx = hx * floor;
				bird.vy = hy * floor;
			}
		}
		const capped = limit({ x: bird.vx, y: bird.vy }, maxSpeed * 1.25);
		bird.vx = capped.x;
		bird.vy = capped.y;

		bird.x += bird.vx * dt;
		bird.y += bird.vy * dt;
		if (!bird.entered && isInViewport(bird, env.viewport, 0)) bird.entered = true;

		this.animateFlight(bird, dt, env.now);
	}

	private touchDown(bird: Bird, spot: { x: number; y: number }, now: number) {
		bird.state = 'perched';
		bird.x = spot.x;
		bird.y = spot.y;
		bird.vx = 0;
		bird.vy = 0;
		bird.wing = 0;
		bird.bank = 0;
		bird.landedAt = now;
		bird.liftAt = 0;
		bird.nextLook = now + 2500 + this.rng() * 5000;
	}

	/** Boids rules plus the pull towards the squad's anchor. */
	private flockForces(
		bird: Bird,
		t: number,
		env: FlockEnv,
		center: { x: number; y: number }
	): { x: number; y: number; sx: number; sy: number } {
		const cfg = this.config;
		const squad = this.squads[bird.squad];
		const cruise = this.cruiseOf(bird);

		// The squad anchor drifts in a slow loop; each crow keeps its own slot round it
		const w = (Math.PI * 2) / squad.periodS;
		const ang = squad.phase + (t / 1000) * w;
		const anchorX = center.x + Math.cos(ang) * squad.radiusX;
		const anchorY = center.y + Math.sin(ang * 1.3) * squad.radiusY;
		const tx = anchorX + Math.cos(bird.slotAngle + ang * 0.4) * bird.slotRadius;
		const ty = anchorY + Math.sin(bird.slotAngle + ang * 0.4) * bird.slotRadius;

		let ax = 0;
		let ay = 0;
		const dx = tx - bird.x;
		const dy = ty - bird.y;
		const d = Math.hypot(dx, dy) || 1;
		ax += ((dx / d) * cruise - bird.vx) * 1.1;
		ay += ((dy / d) * cruise - bird.vy) * 1.1;

		let sepX = 0;
		let sepY = 0;
		let aliX = 0;
		let aliY = 0;
		let cohX = 0;
		let cohY = 0;
		let n = 0;
		for (const other of this.birds) {
			if (other.id === bird.id) continue;
			const airborne = other.state === 'flying' || other.state === 'takeoff';
			if (!airborne && other.state !== 'landing' && other.state !== 'departing') continue;
			const ox = bird.x - other.x;
			const oy = bird.y - other.y;
			const od = Math.hypot(ox, oy);
			if (od >= cfg.neighbourRadius || od === 0) continue;
			// A near crow and a far one can cross without touching: give less room
			// the further apart they are in depth
			let room = cfg.separationRadius * (1 - 0.6 * Math.abs(bird.depth - other.depth));
			// Look ahead: two crows closing on each other need room sooner
			const closing = -(ox * (bird.vx - other.vx) + oy * (bird.vy - other.vy)) / od;
			if (closing > 0) room += closing * 0.35;
			if (od < room) {
				const push = (room - od) / room;
				const strength = push * (1 + 4 * push);
				sepX += (ox / od) * strength;
				sepY += (oy / od) * strength;
			}
			if (!airborne) continue;
			aliX += other.vx;
			aliY += other.vy;
			cohX += other.x;
			cohY += other.y;
			n++;
		}
		if (n > 0) {
			ax += (aliX / n - bird.vx) * 1.5;
			ay += (aliY / n - bird.vy) * 1.5;
			ax += (cohX / n - bird.x) * 0.9;
			ay += (cohY / n - bird.y) * 0.9;
		}

		// A little wander so no two crows trace the same curve
		const sec = t / 1000;
		ax += Math.sin(sec * 0.7 + bird.idlePhase * 20) * 55;
		ay += Math.cos(sec * 0.53 + bird.idlePhase * 31) * 55;

		// Soft walls once it has been on screen
		if (bird.entered) {
			const m = 60;
			const { width, height } = env.viewport;
			if (bird.x < -m) ax += (-m - bird.x) * 6;
			if (bird.x > width + m) ax -= (bird.x - width - m) * 6;
			if (bird.y < -m) ay += (-m - bird.y) * 6;
			if (bird.y > height + m) ay -= (bird.y - height - m) * 6;
		}
		return { x: ax, y: ay, sx: sepX * 2200, sy: sepY * 2200 };
	}

	/** Facing, tilt and wing state from how the crow is moving. */
	private animateFlight(bird: Bird, dt: number, now: number) {
		if (Math.abs(bird.vx) > 24) bird.facing = bird.vx < 0 ? -1 : 1;
		const target = computeBankAngle(
			bird.facing === -1 ? -Math.abs(bird.vx) : Math.abs(bird.vx),
			bird.vy
		);
		bird.bank += (target - bird.bank) * Math.min(1, dt * 7);

		// Flap in bursts, glide between them; climb and landing always flap
		let kind: WingKind = bird.wingKind;
		if (bird.state === 'takeoff' || bird.state === 'departing') {
			kind = 'flap';
		} else if (bird.state === 'landing') {
			const spot = bird.spot >= 0 ? this.viewSpots[bird.spot] : undefined;
			const near = spot ? Math.hypot(spot.x - bird.x, spot.y - bird.y) : 999;
			kind = near < 70 ? 'flap' : 'glide';
		} else if (now >= bird.wingUntil) {
			const climbing = bird.vy < -40;
			const roll = this.rng();
			if (climbing || roll < 0.45) {
				kind = 'flap';
				bird.wingUntil = now + 500 + this.rng() * 900;
			} else if (roll < 0.8) {
				kind = 'glide';
				bird.wingUntil = now + 400 + this.rng() * 900;
			} else {
				kind = 'soar';
				bird.wingUntil = now + 500 + this.rng() * 700;
			}
		}
		bird.wingKind = kind;
		const hz = bird.state === 'landing' ? bird.flapHz * 1.4 : bird.flapHz;
		bird.flapPhase += Math.PI * 2 * hz * dt;
		const targetWing = computeWingAngle(kind, bird.flapPhase);
		bird.wing += (targetWing - bird.wing) * Math.min(1, dt * 20);
	}
}
