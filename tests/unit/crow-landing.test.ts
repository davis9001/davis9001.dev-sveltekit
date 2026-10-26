/**
 * Landing geometry, banking and perch-spot picking for the crow flock.
 */
import { describe, expect, it } from 'vitest';
import {
	CROW_BODY_PIVOT_Y,
	CROW_FEET_X,
	CROW_FEET_Y,
	computeArriveVelocity,
	computeBankAngle,
	documentToViewport,
	frameScale,
	isInViewport,
	pickNearestFreeSpot
} from '../../src/lib/utils/crow';

describe('crow feet anchor', () => {
	it('puts the soles at the bottom of the legs inside the 90x70 box', () => {
		// viewBox -55 -45 110 80 into 90x70, meet: 0.818 px per unit, 2.27 px letterbox
		const unit = Math.min(90 / 110, 70 / 80);
		const letterbox = (70 - 80 * unit) / 2;
		const soleLine = (24 + 45) * unit + letterbox + 0.5 * unit;
		expect(CROW_FEET_Y).toBeCloseTo(soleLine, 0);
		expect(CROW_FEET_X).toBe(45);
		expect(CROW_BODY_PIVOT_Y).toBe(35);
	});
});

describe('computeBankAngle', () => {
	it('is level when flying flat or standing still', () => {
		expect(computeBankAngle(4, 0)).toBe(0);
		expect(computeBankAngle(-4, 0)).toBeCloseTo(0);
		expect(computeBankAngle(0, 0)).toBe(0);
	});

	it('tips the nose down when descending to the right', () => {
		expect(computeBankAngle(3, 3)).toBeCloseTo(28);
		expect(computeBankAngle(4, 1)).toBeGreaterThan(0);
		expect(computeBankAngle(4, 1)).toBeLessThan(28);
	});

	it('tips the nose up when climbing', () => {
		expect(computeBankAngle(4, -1)).toBeLessThan(0);
	});

	it('mirrors for a crow flying left, whose art is flipped', () => {
		expect(computeBankAngle(-4, 1)).toBeCloseTo(-computeBankAngle(4, 1));
		expect(computeBankAngle(-4, -1)).toBeCloseTo(-computeBankAngle(4, -1));
	});

	it('never rolls past the limit, even straight down', () => {
		expect(computeBankAngle(0, 9)).toBe(28);
		expect(computeBankAngle(0, -9)).toBe(-28);
		expect(computeBankAngle(5, 50, 15)).toBe(15);
	});
});

describe('computeArriveVelocity', () => {
	it('runs at full speed when far away', () => {
		const v = computeArriveVelocity({ x: 0, y: 0 }, { x: 300, y: 400 }, 5, 60);
		expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(5);
		expect(v.vx / v.vy).toBeCloseTo(0.75);
	});

	it('eases off inside the slow radius', () => {
		const v = computeArriveVelocity({ x: 0, y: 0 }, { x: 30, y: 0 }, 6, 60);
		expect(v.vx).toBeCloseTo(3);
		expect(v.vy).toBeCloseTo(0);
	});

	it('stops dead on the target', () => {
		expect(computeArriveVelocity({ x: 7, y: 7 }, { x: 7, y: 7 }, 5, 60)).toEqual({ vx: 0, vy: 0 });
	});
});

describe('pickNearestFreeSpot', () => {
	const spots = [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 200, y: 0 }
	];

	it('takes the nearest spot to the crow', () => {
		expect(pickNearestFreeSpot({ x: 120, y: 40 }, spots, [], 28)).toBe(1);
	});

	it('skips a spot another crow holds or is flying to', () => {
		expect(pickNearestFreeSpot({ x: 120, y: 40 }, spots, [{ x: 100, y: 2 }], 28)).toBe(2);
	});

	it('skips spots the caller marks unusable, such as scrolled off screen', () => {
		expect(pickNearestFreeSpot({ x: 120, y: 40 }, spots, [], 28, (_s, i) => i !== 1)).toBe(2);
	});

	it('answers -1 when everything is taken or there are no spots', () => {
		expect(pickNearestFreeSpot({ x: 0, y: 0 }, spots, spots, 28)).toBe(-1);
		expect(pickNearestFreeSpot({ x: 0, y: 0 }, [], [], 28)).toBe(-1);
	});
});

describe('document and viewport coordinates', () => {
	it('subtracts the scroll offset', () => {
		expect(documentToViewport({ x: 500, y: 1200 }, { x: 0, y: 700 })).toEqual({ x: 500, y: 500 });
		expect(documentToViewport({ x: 500, y: 100 }, { x: 20, y: 700 })).toEqual({ x: 480, y: -600 });
	});

	it('tells whether a point is on screen, with a margin', () => {
		const vp = { width: 1000, height: 800 };
		expect(isInViewport({ x: 500, y: 400 }, vp)).toBe(true);
		expect(isInViewport({ x: 500, y: -1 }, vp)).toBe(false);
		expect(isInViewport({ x: 1001, y: 400 }, vp)).toBe(false);
		expect(isInViewport({ x: 5, y: 400 }, vp, 20)).toBe(false);
		expect(isInViewport({ x: 500, y: 790 }, vp, 20)).toBe(false);
	});
});

describe('frameScale', () => {
	it('is 1 at 60 Hz, 0.4 at 144 Hz, and 0 for a bad step', () => {
		expect(frameScale(1000 / 60)).toBeCloseTo(1);
		expect(frameScale(1000 / 144)).toBeCloseTo(60 / 144);
		expect(frameScale(0)).toBe(0);
		expect(frameScale(-5)).toBe(0);
		expect(frameScale(NaN)).toBe(0);
	});

	it('caps a long stall so the flock does not jump', () => {
		expect(frameScale(5000)).toBe(3);
		expect(frameScale(5000, 2)).toBe(2);
	});
});

import { CrowStateMachine, type CrowTarget } from '../../src/lib/utils/crow';

describe('CrowStateMachine.startFlightTo', () => {
	const targets: CrowTarget[] = [
		{ id: 'a', x: 0, y: 0, scale: 1 },
		{ id: 'b', x: 100, y: 0, scale: 1 }
	];

	it('flies to the named target', () => {
		const m = new CrowStateMachine(targets, 'a');
		expect(m.startFlightTo('b')).toBe(true);
		expect(m.getState()).toBe('flying');
		expect(m.getFlightTarget()?.id).toBe('b');
	});

	it('refuses an unknown target, the current one, or a second flight', () => {
		const m = new CrowStateMachine(targets, 'a');
		expect(m.startFlightTo('zzz')).toBe(false);
		expect(m.startFlightTo('a')).toBe(false);
		expect(m.getState()).toBe('perched');
		m.startFlightTo('b');
		expect(m.startFlightTo('a')).toBe(false);
	});
});

import { findTopSurfaceFraction } from '../../src/lib/utils/crow';

describe('findTopSurfaceFraction', () => {
	// 6 wide x 4 tall alpha plane: a 3-tall block in columns 1-2, a 1-tall one in 4
	const w = 6;
	const h = 4;
	const plane = new Uint8Array(w * h);
	const set = (x: number, y: number) => (plane[y * w + x] = 255);
	[1, 2, 3].forEach((y) => {
		set(1, y);
		set(2, y);
	});
	set(4, 3);

	it('finds the first opaque row of a column', () => {
		expect(findTopSurfaceFraction(plane, w, h, 1, { halfBand: 0 })).toBe(0.25);
		expect(findTopSurfaceFraction(plane, w, h, 4, { halfBand: 0 })).toBe(0.75);
	});

	it('averages neighbouring columns and skips empty ones', () => {
		// columns 1..3 -> rows 1, 1, none: mean 1 -> 0.25
		expect(findTopSurfaceFraction(plane, w, h, 2)).toBe(0.25);
		// columns 3..5 -> none, 3, none
		expect(findTopSurfaceFraction(plane, w, h, 4)).toBe(0.75);
	});

	it('is null over empty space and clips at the image edge', () => {
		expect(findTopSurfaceFraction(plane, w, h, 0, { halfBand: 0 })).toBeNull();
		expect(findTopSurfaceFraction(plane, w, h, -5)).toBeNull();
		expect(findTopSurfaceFraction(plane, w, h, 99)).toBeNull();
		expect(findTopSurfaceFraction(plane, w, h, 0)).toBe(0.25); // column 1 is in the band
	});

	it('reads the alpha channel of RGBA data and honours the threshold', () => {
		const rgba = new Uint8Array(2 * 2 * 4);
		rgba[(1 * 2 + 0) * 4 + 3] = 100; // below default 128
		rgba[(0 * 2 + 1) * 4 + 3] = 200;
		expect(findTopSurfaceFraction(rgba, 2, 2, 0, { stride: 4, halfBand: 0 })).toBeNull();
		expect(findTopSurfaceFraction(rgba, 2, 2, 0, { stride: 4, halfBand: 0, threshold: 50 })).toBe(0.5);
		expect(findTopSurfaceFraction(rgba, 2, 2, 1, { stride: 4, halfBand: 0 })).toBe(0);
	});
});
