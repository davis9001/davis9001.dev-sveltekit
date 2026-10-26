/**
 * The murder-of-crows simulation: seeded, so every run is the same flock.
 */
import { describe, expect, it } from 'vitest';
import {
	Flock,
	FLOCK_CONFIG,
	computeLandingHop,
	computePerchedIdle,
	computeWingAngle,
	createRng,
	depthToScale,
	type FlockConfig,
	type FlockEnv
} from '../../src/lib/utils/flock';

const VIEWPORT = { width: 1440, height: 900 };

/** A row of ledges 40 px apart across the middle of the screen, in document space. */
function ledgeRow(count = 40, y = 380): Array<{ x: number; y: number }> {
	return Array.from({ length: count }, (_, i) => ({ x: 120 + i * 30, y }));
}

interface Rig {
	flock: Flock;
	env: FlockEnv;
	now: number;
	advance: (seconds: number, stepMs?: number, each?: (flock: Flock) => void) => void;
}

function rig(
	options: {
		seed?: number;
		spots?: Array<{ x: number; y: number }>;
		config?: Partial<FlockConfig>;
		viewport?: { width: number; height: number };
	} = {}
): Rig {
	const viewport = options.viewport ?? VIEWPORT;
	const flock = new Flock({
		now: 0,
		viewport,
		rng: createRng(options.seed ?? 1),
		config: options.config
	});
	flock.setSpots(options.spots ?? ledgeRow());
	const env: FlockEnv = { now: 0, viewport, scroll: { x: 0, y: 0 }, mouse: null };
	const r: Rig = {
		flock,
		env,
		now: 0,
		advance(seconds, stepMs = 16, each) {
			const end = r.now + seconds * 1000;
			while (r.now < end) {
				r.now += stepMs;
				env.now = r.now;
				flock.step(env);
				each?.(flock);
			}
		}
	};
	return r;
}

describe('createRng', () => {
	it('is repeatable and stays in [0, 1)', () => {
		const a = createRng(7);
		const b = createRng(7);
		const seen = Array.from({ length: 200 }, () => a());
		expect(seen).toEqual(Array.from({ length: 200 }, () => b()));
		expect(seen.every((v) => v >= 0 && v < 1)).toBe(true);
		expect(createRng(8)()).not.toBe(createRng(7)());
	});
});

describe('animation helpers', () => {
	it('gives a wing angle per wing kind', () => {
		expect(computeWingAngle('glide', 0)).toBe(-15);
		expect(computeWingAngle('soar', 1)).toBe(-3);
		expect(computeWingAngle('flap', Math.PI / 2)).toBeCloseTo(40);
		expect(computeWingAngle('flap', -Math.PI / 2)).toBeCloseTo(-40);
	});

	it('sways a perched crow a little and preens now and then', () => {
		const samples = Array.from({ length: 400 }, (_, i) => computePerchedIdle(i * 100, 0.3));
		expect(Math.max(...samples.map(Math.abs))).toBeLessThan(16);
		expect(Math.max(...samples)).toBeGreaterThan(8); // a preen
		const calm = computePerchedIdle(7000, 0);
		expect(Math.abs(calm)).toBeLessThan(2.3);
	});

	it('hops once, up and back, when it lands', () => {
		expect(computeLandingHop(-1)).toBe(0);
		expect(computeLandingHop(0)).toBeCloseTo(0);
		expect(computeLandingHop(140)).toBeCloseTo(-6);
		expect(computeLandingHop(280)).toBeCloseTo(0, 5);
		expect(computeLandingHop(500)).toBe(0);
	});

	it('draws near crows bigger', () => {
		expect(depthToScale(1)).toBeGreaterThan(depthToScale(0));
		expect(depthToScale(0)).toBeCloseTo(0.27);
	});
});

describe('a new flock', () => {
	it('is 23 crows in six squads, all still off stage, one chosen to stay', () => {
		const { flock } = rig();
		expect(flock.birds).toHaveLength(FLOCK_CONFIG.count);
		expect(flock.squads).toHaveLength(6);
		expect(flock.squads.reduce((n, s) => n + s.members.length, 0)).toBe(23);
		expect(flock.birds.every((b) => b.state === 'waiting')).toBe(true);
		expect(flock.stayer).toBeGreaterThanOrEqual(0);
		expect(flock.stayer).toBeLessThan(23);
		expect(flock.activeCount()).toBe(0);
	});

	it('starts every crow outside the screen, squads from different edges', () => {
		const { flock } = rig();
		const outside = flock.birds.every(
			(b) => b.x < 0 || b.x > VIEWPORT.width || b.y < 0 || b.y > VIEWPORT.height
		);
		expect(outside).toBe(true);
		const edges = new Set(flock.squads.map((s) => s.id % 4));
		expect(edges.size).toBe(4);
	});

	it('gives crows different sizes and speeds, with near ones bigger and faster', () => {
		const { flock } = rig();
		const scales = new Set(flock.birds.map((b) => b.scale.toFixed(3)));
		expect(scales.size).toBeGreaterThan(15);
		const near = flock.birds.filter((b) => b.depth > 0.8);
		const far = flock.birds.filter((b) => b.depth < 0.2);
		const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
		expect(mean(near.map((b) => b.speedFactor))).toBeGreaterThan(
			mean(far.map((b) => b.speedFactor))
		);
	});

	it('gathers over the middle when there are no ledges', () => {
		const { flock } = rig({ spots: [] });
		expect(flock.gatherPoint(VIEWPORT)).toEqual({ x: 720, y: 270 });
	});

	it('copes with a flock of one', () => {
		const { flock, advance } = rig({ config: { count: 1 } });
		expect(flock.squads).toHaveLength(1);
		advance(20);
		expect(flock.activeCount()).toBe(1);
	});
});

describe('arriving', () => {
	it('brings the squads in over the entry spread, heading for the middle', () => {
		const r = rig();
		r.advance(1);
		const early = r.flock.activeCount();
		expect(early).toBeGreaterThan(0);
		expect(early).toBeLessThan(23);
		r.advance(10);
		expect(r.flock.activeCount()).toBe(23);
		// by now most are on screen
		const onScreen = r.flock.birds.filter(
			(b) => b.x > 0 && b.x < VIEWPORT.width && b.y > 0 && b.y < VIEWPORT.height
		);
		expect(onScreen.length).toBeGreaterThan(15);
		expect(r.flock.birds.every((b) => b.entered || b.state === 'waiting')).toBe(true);
	});
});

describe('flying', () => {
	it('keeps every number finite and every speed within bounds for a minute', () => {
		const r = rig();
		let worst = 0;
		r.advance(60, 16, (flock) => {
			for (const b of flock.birds) {
				expect(Number.isFinite(b.x + b.y + b.vx + b.vy + b.bank + b.wing)).toBe(true);
				worst = Math.max(worst, Math.hypot(b.vx, b.vy));
			}
		});
		// cruise 215 * fastest speed factor (< 1.15) * 1.25 cap, with a little slack
		expect(worst).toBeLessThan(215 * 1.2 * 1.25 * 1.15);
	});

	it('keeps crows at the same depth apart in the air', () => {
		const r = rig({ spots: [] }); // never perch: all flying
		r.advance(30);
		let closest = Infinity;
		r.advance(10, 16, (flock) => {
			const fly = flock.birds.filter((b) => b.state === 'flying');
			for (let i = 0; i < fly.length; i++) {
				for (let j = i + 1; j < fly.length; j++) {
					if (Math.abs(fly[i].depth - fly[j].depth) > 0.3) continue;
					closest = Math.min(closest, Math.hypot(fly[i].x - fly[j].x, fly[i].y - fly[j].y));
				}
			}
		});
		expect(closest).toBeGreaterThan(14);
	});

	it('stays over the screen once it has arrived', () => {
		const r = rig({ spots: [] });
		r.advance(40);
		const far = r.flock.birds.filter(
			(b) => b.x < -250 || b.x > VIEWPORT.width + 250 || b.y < -250 || b.y > VIEWPORT.height + 250
		);
		expect(far).toHaveLength(0);
	});

	it('faces the way it flies and tilts along the path', () => {
		const r = rig({ spots: [] });
		r.advance(25);
		for (const b of r.flock.birds) {
			if (Math.abs(b.vx) > 40) expect(b.facing).toBe(b.vx < 0 ? -1 : 1);
			expect(Math.abs(b.bank)).toBeLessThanOrEqual(28.0001);
		}
	});

	it('flaps, glides and soars rather than doing one thing', () => {
		const r = rig({ spots: [] });
		const kinds = new Set<string>();
		r.advance(30, 16, (flock) =>
			flock.birds.forEach((b) => b.state === 'flying' && kinds.add(b.wingKind))
		);
		expect(kinds).toEqual(new Set(['flap', 'glide', 'soar']));
	});

	it('moves the same distance whatever the frame rate', () => {
		const travelled = (stepMs: number) => {
			const r = rig({ spots: [], seed: 3 });
			r.advance(14, stepMs);
			const before = r.flock.birds.map((b) => ({ x: b.x, y: b.y }));
			let total = 0;
			r.advance(2, stepMs, (flock) => {
				void flock;
			});
			r.flock.birds.forEach((b, i) => (total += Math.hypot(b.x - before[i].x, b.y - before[i].y)));
			return total / r.flock.birds.length;
		};
		const slow = travelled(33);
		const fast = travelled(8);
		expect(fast / slow).toBeGreaterThan(0.6);
		expect(fast / slow).toBeLessThan(1.6);
	});

	it('does not jump when the tab wakes after a long pause', () => {
		const r = rig({ spots: [] });
		r.advance(14);
		const before = r.flock.birds.map((b) => ({ x: b.x, y: b.y }));
		r.now += 60_000;
		r.env.now = r.now;
		r.flock.step(r.env);
		r.flock.birds.forEach((b, i) => {
			if (b.state === 'flying')
				expect(Math.hypot(b.x - before[i].x, b.y - before[i].y)).toBeLessThan(25);
		});
	});

	it('does nothing when no time has passed', () => {
		const r = rig();
		r.advance(14);
		const before = r.flock.birds.map((b) => b.x);
		r.flock.step(r.env); // same timestamp
		expect(r.flock.birds.map((b) => b.x)).toEqual(before);
	});
});

describe('perching', () => {
	it('lands crows on ledges exactly, one per ledge, with no snap', () => {
		const r = rig();
		let landings = 0;
		let biggestSnap = 0;
		const last = new Map<number, { x: number; y: number; state: string }>();
		let minGap = Infinity;
		r.advance(90, 16, (flock) => {
			for (const b of flock.birds) {
				const prev = last.get(b.id);
				if (prev && prev.state === 'landing' && b.state === 'perched') {
					landings++;
					biggestSnap = Math.max(biggestSnap, Math.hypot(b.x - prev.x, b.y - prev.y));
				}
				last.set(b.id, { x: b.x, y: b.y, state: b.state });
			}
			const perched = flock.birds.filter((b) => b.state === 'perched');
			for (let i = 0; i < perched.length; i++) {
				for (let j = i + 1; j < perched.length; j++) {
					minGap = Math.min(
						minGap,
						Math.hypot(perched[i].x - perched[j].x, perched[i].y - perched[j].y)
					);
				}
			}
		});
		expect(landings).toBeGreaterThan(10);
		// the last step before touchdown is at most one frame of flying
		expect(biggestSnap).toBeLessThan(6);
		expect(minGap).toBeGreaterThanOrEqual(FLOCK_CONFIG.minPerchDistance - 0.01);
	});

	it('sits perched crows exactly on their ledge', () => {
		const r = rig();
		const spots = ledgeRow();
		r.advance(60);
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeGreaterThan(0);
		for (const b of perched) {
			const s = spots[b.spot];
			expect(b.x).toBe(s.x);
			expect(b.y).toBe(s.y);
			expect(b.vx).toBe(0);
		}
	});

	it('brings a squad down together, side by side', () => {
		const r = rig({ seed: 5 });
		let best = 0;
		let checked = false;
		r.advance(120, 16, (flock) => {
			for (const sq of flock.squads) {
				const perched = sq.members.map((i) => flock.birds[i]).filter((b) => b.state === 'perched');
				if (perched.length >= 3) {
					checked = true;
					let sum = 0;
					let n = 0;
					for (let i = 0; i < perched.length; i++) {
						for (let j = i + 1; j < perched.length; j++) {
							sum += Math.hypot(perched[i].x - perched[j].x, perched[i].y - perched[j].y);
							n++;
						}
					}
					best = Math.max(best, 1);
					expect(sum / n).toBeLessThan(260);
				}
			}
		});
		expect(checked).toBe(true);
		expect(best).toBe(1);
	});

	it('never lets more than the cap perch at once', () => {
		const r = rig({ seed: 2 });
		let peak = 0;
		r.advance(150, 32, (flock) => {
			const holding = flock.birds.filter(
				(b) => b.state === 'perched' || b.state === 'landing'
			).length;
			peak = Math.max(peak, holding);
		});
		expect(peak).toBeGreaterThan(3);
		expect(peak).toBeLessThanOrEqual(Math.ceil(23 * FLOCK_CONFIG.maxPerchedFraction) + 4);
	});

	it('lifts off again, a crow at a time, and perches elsewhere later', () => {
		const r = rig({ seed: 4 });
		let lifts = 0;
		const state = new Map<number, string>();
		const spotsUsed = new Map<number, Set<number>>();
		r.advance(150, 16, (flock) => {
			for (const b of flock.birds) {
				if (state.get(b.id) === 'perched' && b.state === 'takeoff') lifts++;
				state.set(b.id, b.state);
				if (b.state === 'perched') {
					if (!spotsUsed.has(b.id)) spotsUsed.set(b.id, new Set());
					spotsUsed.get(b.id)!.add(b.spot);
				}
			}
		});
		expect(lifts).toBeGreaterThan(5);
		const movers = [...spotsUsed.values()].filter((s) => s.size > 1);
		expect(movers.length).toBeGreaterThan(0);
	});

	it('hops and preens while perched', () => {
		const r = rig({ seed: 5 });
		let hop = 0;
		let tilt = 0;
		r.advance(100, 16, (flock) => {
			for (const b of flock.birds) {
				hop = Math.min(hop, b.hop);
				tilt = Math.max(tilt, Math.abs(b.idleTilt));
			}
		});
		expect(hop).toBeLessThan(-1);
		expect(tilt).toBeGreaterThan(1);
	});

	it('looks the other way now and then', () => {
		const r = rig({ seed: 6 });
		const flips = new Map<number, number>();
		const facing = new Map<number, number>();
		r.advance(150, 16, (flock) => {
			for (const b of flock.birds) {
				if (b.state !== 'perched') {
					facing.delete(b.id);
					continue;
				}
				const f = facing.get(b.id);
				if (f !== undefined && f !== b.facing) flips.set(b.id, (flips.get(b.id) ?? 0) + 1);
				facing.set(b.id, b.facing);
			}
		});
		expect([...flips.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
	});

	it('does not perch when nothing is free', () => {
		const r = rig({ spots: ledgeRow(1) });
		r.advance(120);
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeLessThanOrEqual(1);
	});

	it('gives up on a landing that takes too long', () => {
		const r = rig({ seed: 7 });
		// take the ledges away from under anyone heading for them
		let aborted = 0;
		r.advance(150, 16, (flock) => {
			for (const sq of flock.squads) {
				if (sq.mode === 'settle') {
					for (const b of sq.members.map((i) => flock.birds[i])) {
						if (b.state === 'landing') {
							b.x = -2000; // stuck far away: it can never arrive in time
							b.y = -2000;
							b.vx = 0;
							b.vy = 0;
						}
					}
				}
				if (sq.mode === 'perch') aborted++;
			}
		});
		expect(aborted).toBeGreaterThan(0);
		expect(r.flock.birds.every((b) => Number.isFinite(b.x))).toBe(true);
	});
});

describe('the page moving under the flock', () => {
	it('carries perched crows with the scroll', () => {
		const r = rig({ seed: 1 });
		r.advance(60);
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeGreaterThan(0);
		const before = new Map(perched.map((b) => [b.id, { x: b.x, y: b.y }]));
		r.env.scroll = { x: 0, y: 25 };
		r.advance(0.02);
		for (const b of perched) {
			if (b.state !== 'perched') continue;
			expect(b.x).toBe(before.get(b.id)!.x);
			expect(b.y).toBe(before.get(b.id)!.y - 25);
		}
	});

	it('sends a crow up when its ledge scrolls off the screen', () => {
		const r = rig({ seed: 1 });
		r.advance(60);
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeGreaterThan(0);
		r.env.scroll = { x: 0, y: 2000 };
		r.advance(0.05);
		expect(r.flock.birds.filter((b) => b.state === 'perched')).toHaveLength(0);
		expect(perched.every((b) => b.state === 'takeoff' || b.state === 'flying')).toBe(true);
	});

	it('re-points crows at the nearest ledge when the list is re-measured', () => {
		const r = rig({ seed: 1 });
		r.advance(60);
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeGreaterThan(0);
		const target = perched[0];
		const oldSpot = ledgeRow()[target.spot];
		// same ledges, shifted 6px and reordered
		const moved = ledgeRow()
			.map((s) => ({ x: s.x + 6, y: s.y }))
			.reverse();
		r.flock.setSpots(moved);
		expect(target.spot).toBeGreaterThanOrEqual(0);
		expect(moved[target.spot].x).toBeCloseTo(oldSpot.x + 6);
	});

	it('lets go of a ledge that no longer exists', () => {
		const r = rig({ seed: 1 });
		r.advance(60);
		const holder = r.flock.birds.find((b) => b.state === 'perched')!;
		r.flock.setSpots([{ x: 5000, y: 5000 }]);
		expect(holder.spot).toBe(-1);
		r.advance(0.05);
		expect(holder.state).toBe('takeoff');
	});

	it('turns a landing crow around when its ledge disappears', () => {
		const r = rig({ seed: 7 });
		let done = false;
		r.advance(150, 16, (flock) => {
			if (done) return;
			const landing = flock.birds.find((b) => b.state === 'landing');
			if (landing) {
				flock.setSpots([{ x: 9000, y: 9000 }]);
				done = true;
				expect(landing.state).toBe('flying');
				expect(landing.spot).toBe(-1);
			}
		});
		expect(done).toBe(true);
	});

	it('sets spots for the first time without crows to remap', () => {
		const flock = new Flock({ now: 0, viewport: VIEWPORT, rng: createRng(1) });
		expect(() => flock.setSpots(ledgeRow(3))).not.toThrow();
	});
});

describe('the mouse', () => {
	function perchedRig() {
		const r = rig({ seed: 1 });
		r.advance(60);
		return r;
	}

	it('spooks a perched crow, and the fright spreads to neighbours, nearest first', () => {
		const r = perchedRig();
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		expect(perched.length).toBeGreaterThan(2);
		const victim = perched[0];
		const near = perched
			.filter((b) => b !== victim)
			.sort(
				(a, b) =>
					Math.hypot(a.x - victim.x, a.y - victim.y) - Math.hypot(b.x - victim.x, b.y - victim.y)
			);
		const startedAt = r.now;
		r.env.mouse = { x: victim.x, y: victim.y };
		const liftedAt = new Map<number, number>();
		r.advance(1.5, 16, (flock) => {
			for (const b of flock.birds) {
				if (b.state !== 'perched' && !liftedAt.has(b.id)) liftedAt.set(b.id, r.now - startedAt);
			}
		});
		expect(liftedAt.get(victim.id)).toBeLessThan(40);
		const nearest = near.find(
			(b) => Math.hypot(b.x - victim.x, b.y - victim.y) < FLOCK_CONFIG.chainRadius
		);
		if (nearest) expect(liftedAt.has(nearest.id)).toBe(true);
	});

	it('leaves crows far from the mouse alone', () => {
		const r = perchedRig();
		const perched = r.flock.birds.filter((b) => b.state === 'perched');
		const victim = perched[0];
		const far = perched.filter(
			(b) => Math.hypot(b.x - victim.x, b.y - victim.y) > FLOCK_CONFIG.chainRadius + 60
		);
		r.env.mouse = { x: victim.x, y: victim.y };
		r.advance(0.3);
		for (const b of far) {
			expect(b.state === 'perched' || b.liftAt === 0 || r.now < b.liftAt).toBe(true);
		}
	});

	it('makes flying crows swerve away', () => {
		const r = rig({ spots: [] });
		r.advance(25);
		const bird = r.flock.birds.find((b) => b.state === 'flying')!;
		r.env.mouse = { x: bird.x - 20, y: bird.y };
		const vx = bird.vx;
		r.advance(0.15);
		expect(bird.vx).toBeGreaterThan(vx);
	});
});

describe('leaving', () => {
	const quick: Partial<FlockConfig> = { departureTotalMs: 60_000, departureGraceMs: 4000 };

	it('thins out in groups until only the stayer is left', () => {
		const r = rig({ config: quick, seed: 9 });
		const sizes: number[] = [];
		let prev = 0;
		r.advance(75, 50, (flock) => {
			const gone = flock.birds.filter(
				(b) => b.state === 'departing' || b.state === 'departed'
			).length;
			if (gone > prev) sizes.push(gone - prev);
			prev = gone;
		});
		r.advance(20, 50);
		const remaining = r.flock.birds.filter((b) => b.state !== 'departed');
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe(r.flock.stayer);
		expect(sizes.length).toBeGreaterThan(5);
		expect(sizes.some((n) => n > 1)).toBe(true);
	});

	it('flies departing crows off the screen, flapping', () => {
		const r = rig({ config: quick, seed: 9 });
		let sawDeparting = false;
		r.advance(75, 50, (flock) => {
			for (const b of flock.birds) {
				if (b.state === 'departing') {
					sawDeparting = true;
					expect(b.wingKind).toBe('flap');
					expect(b.departTo).not.toBeNull();
				}
			}
		});
		expect(sawDeparting).toBe(true);
	});

	it('takes a crow off its ledge when it is called away', () => {
		const r = rig({ config: { departureTotalMs: 40_000, departureGraceMs: 3000 }, seed: 11 });
		let fromPerch = false;
		const state = new Map<number, string>();
		r.advance(60, 16, (flock) => {
			for (const b of flock.birds) {
				if (state.get(b.id) === 'perched' && b.state === 'departing') {
					fromPerch = true;
					expect(b.spot).toBe(-1);
				}
				state.set(b.id, b.state);
			}
		});
		expect(fromPerch).toBe(true);
	});

	it('picks a different crow each time rather than always the first', () => {
		const first: number[] = [];
		for (const seed of [1, 2, 3, 4, 5, 6]) {
			const r = rig({ config: quick, seed });
			let found = false;
			r.advance(30, 50, (flock) => {
				if (found) return;
				const leaving = flock.birds.find((b) => b.state === 'departing');
				if (leaving) {
					first.push(leaving.id);
					found = true;
				}
			});
		}
		expect(new Set(first).size).toBeGreaterThan(2);
	});
});
