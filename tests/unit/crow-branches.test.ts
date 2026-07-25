/**
 * Branch coverage for lib/utils/crow.ts
 *
 * The crow helpers are pure functions plus a small state machine, so the
 * remaining gaps are all guard clauses and defaults: option fallbacks,
 * empty-input early returns, the wing-offset switch default, the rare
 * eye-glance direction, skipped lines in perch-spot derivation, and the
 * state-machine's no-op paths.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	computeFlockEntryDelays,
	getWingFlapAngle,
	CrowStateMachine,
	dedupePerchSpots,
	derivePerchSpotsFromPretextLines,
	getIdleAnimation,
	samplePerchSpotsFromRect,
	type CrowTarget
} from '../../src/lib/utils/crow';

const targets: CrowTarget[] = [
	{ id: 'a', x: 0, y: 0, scale: 1 },
	{ id: 'b', x: 100, y: 0, scale: 1 },
	{ id: 'c', x: 200, y: 0, scale: 1 }
];

afterEach(() => {
	vi.useRealTimers();
});

describe('samplePerchSpotsFromRect', () => {
	it('returns nothing for a zero-area rect', () => {
		expect(samplePerchSpotsFromRect({ left: 0, top: 0, width: 0, height: 10 })).toEqual([]);
		expect(samplePerchSpotsFromRect({ left: 0, top: 0, width: 10, height: 0 })).toEqual([]);
	});

	it('applies default spacing when options are omitted', () => {
		// Exercises every `options.x ?? default` fallback in one call.
		const spots = samplePerchSpotsFromRect({ left: 0, top: 0, width: 500, height: 20 });
		expect(spots.length).toBeGreaterThan(0);
		expect(spots.length).toBeLessThanOrEqual(7);
		for (const s of spots) {
			expect(Number.isFinite(s.x)).toBe(true);
			expect(Number.isFinite(s.y)).toBe(true);
		}
	});

	it('honours explicit spacing and count bounds', () => {
		const spots = samplePerchSpotsFromRect(
			{ left: 0, top: 0, width: 500, height: 20 },
			{ spacingPx: 10, insetPx: 0, yOffsetPx: 0, minCount: 2, maxCount: 3 }
		);
		expect(spots.length).toBe(3);
	});
});

describe('dedupePerchSpots', () => {
	it('returns nothing for an empty input', () => {
		expect(dedupePerchSpots([], 10)).toEqual([]);
	});

	it('drops spots closer than the minimum distance', () => {
		const spots = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 100, y: 0 }
		];
		expect(dedupePerchSpots(spots, 10)).toHaveLength(2);
	});
});

describe('getWingFlapAngle', () => {
	it('falls through to 0 for a state with no wing animation', () => {
		// 'perched' has no case in the switch — hits the default arm.
		expect(getWingFlapAngle('perched' as any, 1234)).toBe(0);
	});
});

describe('getIdleAnimation', () => {
	it('produces both eye-glance directions across look buckets', () => {
		// lookHash decides the glance side via (lookHash % 2 === 0) ? 1 : -1.
		// Sweep buckets and collect the sign of lookDirection mid-glance.
		const seen = new Set<number>();
		for (let bucket = 0; bucket < 400; bucket++) {
			const t = bucket * 12000 + 3000 + 1000; // mid-glance window
			const { lookDirection } = getIdleAnimation(t) as any;
			if (lookDirection > 0) seen.add(1);
			if (lookDirection < 0) seen.add(-1);
			if (seen.size === 2) break;
		}
		expect(seen.size).toBe(2);
	});
});

describe('derivePerchSpotsFromPretextLines', () => {
	const anchors = [
		{ index: 0, x: 0, y: 10 },
		{ index: 1, x: 5, y: 8 },
		{ index: 6, x: 30, y: 12 }
	];

	it('skips empty lines and lines with no anchors', () => {
		const fullText = 'ab cd\nef';
		const spots = derivePerchSpotsFromPretextLines(fullText, anchors, [
			// '' is skipped by the !lineText guard; 'zz' is not found in fullText;
			// 'ef' is found but has no anchors in range.
			'',
			'ab',
			'zz',
			'ef'
		]);
		expect(spots.length).toBeGreaterThan(0);
		for (const s of spots) expect(Number.isFinite(s.x)).toBe(true);
	});

	it('returns nothing when there are no anchors at all', () => {
		expect(derivePerchSpotsFromPretextLines('abc', [], ['abc'])).toEqual([]);
	});
});

describe('computeFlockEntryDelays', () => {
	it('returns nothing for a flock of zero', () => {
		expect(computeFlockEntryDelays(0, 5000)).toEqual([]);
	});

	it('returns a single immediate entry for one crow', () => {
		expect(computeFlockEntryDelays(1, 5000)).toEqual([0]);
	});

	it('staggers a larger flock within the spread', () => {
		const delays = computeFlockEntryDelays(4, 5000);
		expect(delays).toHaveLength(4);
		expect(delays[0]).toBe(0);
		expect(Math.max(...delays)).toBeLessThanOrEqual(5000);
	});
});

describe('CrowStateMachine', () => {
	it('reports zero flight progress while not flying', () => {
		const crow = new CrowStateMachine(targets, 'a');
		expect(crow.getState()).toBe('perched');
		expect(crow.getFlightProgress()).toBe(0);
	});

	it('reports progress once flying', () => {
		vi.useFakeTimers();
		const crow = new CrowStateMachine(targets, 'a');
		crow.setFlightDuration(1000);
		crow.startFlight();
		vi.advanceTimersByTime(500);
		expect(crow.getFlightProgress()).toBeGreaterThan(0);
		expect(crow.getFlightProgress()).toBeLessThanOrEqual(1);
	});

	it('ignores a second startFlight while already flying', () => {
		const crow = new CrowStateMachine(targets, 'a');
		crow.startFlight();
		const target = crow.getFlightTarget();
		crow.startFlight();
		expect(crow.getFlightTarget()).toBe(target);
	});

	it('does not flee when there is nowhere else to go', () => {
		const solo = new CrowStateMachine([{ id: 'only', x: 0, y: 0, scale: 1 }], 'only');
		solo.startFleeingFlight(10, 10);
		expect(solo.getState()).toBe('perched');
	});

	it('flees to the target farthest from the mouse', () => {
		const crow = new CrowStateMachine(targets, 'a');
		crow.startFleeingFlight(0, 0);
		expect(crow.getState()).toBe('flying');
		expect(crow.getFlightTarget()?.id).toBe('c');
	});

	it('ignores startFleeingFlight while already flying', () => {
		const crow = new CrowStateMachine(targets, 'a');
		crow.startFlight();
		const target = crow.getFlightTarget();
		crow.startFleeingFlight(0, 0);
		expect(crow.getFlightTarget()).toBe(target);
	});

	it('keeps the current target when updateTargets still contains it', () => {
		const crow = new CrowStateMachine(targets, 'b');
		crow.updateTargets([
			{ id: 'b', x: 999, y: 999, scale: 1 },
			{ id: 'z', x: 0, y: 0, scale: 1 }
		]);
		expect(crow.getCurrentTarget().id).toBe('b');
		expect(crow.getCurrentTarget().x).toBe(999);
	});

	it('falls back to the first target when the current one disappears', () => {
		const crow = new CrowStateMachine(targets, 'b');
		crow.updateTargets([{ id: 'z', x: 1, y: 2, scale: 1 }]);
		expect(crow.getCurrentTarget().id).toBe('z');
	});
});
