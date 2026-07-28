import { describe, expect, it, vi } from 'vitest';
import {
	CSS_PX_PER_IN,
	FIT_DEFAULTS,
	PAGE_HEIGHT_PX,
	fitSheetToPage,
	solveFitScale,
	type FitTarget
} from '$lib/utils/fit-to-page';

/** Height that grows linearly with scale — the ideal the real layout approximates. */
const linear = (heightAtScale1: number) => (scale: number) => heightAtScale1 * scale;

describe('page constants', () => {
	it('uses the CSS definition of an inch', () => {
		expect(CSS_PX_PER_IN).toBe(96);
		expect(PAGE_HEIGHT_PX).toBe(11 * 96);
	});
});

describe('solveFitScale', () => {
	it('grows short content to the maximum scale', () => {
		const result = solveFitScale(linear(400));

		expect(result.scale).toBe(FIT_DEFAULTS.maxScale);
		expect(result.fits).toBe(true);
		// One measurement is enough when the largest allowed size already fits.
		expect(result.measurements).toBe(1);
	});

	it('shrinks overflowing content to the largest scale that still fits', () => {
		const result = solveFitScale(linear(1500));

		const budget = PAGE_HEIGHT_PX - FIT_DEFAULTS.safetyPx;
		expect(result.fits).toBe(true);
		expect(result.height).toBeLessThanOrEqual(budget);
		// Exact answer is budget/1500 ≈ 0.7027; bisection must land just under it.
		expect(result.scale).toBeLessThanOrEqual(budget / 1500);
		expect(result.scale).toBeGreaterThan(budget / 1500 - FIT_DEFAULTS.precision);
	});

	it('reports failure instead of shrinking past the minimum scale', () => {
		const result = solveFitScale(linear(6000));

		expect(result.scale).toBe(FIT_DEFAULTS.minScale);
		expect(result.fits).toBe(false);
		expect(result.height).toBeGreaterThan(PAGE_HEIGHT_PX);
	});

	it('keeps the safety margin out of the budget', () => {
		const exactlyOnePage = () => PAGE_HEIGHT_PX;

		expect(solveFitScale(exactlyOnePage, { safetyPx: 0 }).fits).toBe(true);
		expect(solveFitScale(exactlyOnePage, { safetyPx: 2 }).fits).toBe(false);
	});

	it('honours a custom page budget', () => {
		const halfPage = solveFitScale(linear(1000), {
			availablePx: PAGE_HEIGHT_PX / 2,
			safetyPx: 0,
			minScale: 0.3
		});

		expect(halfPage.height).toBeLessThanOrEqual(PAGE_HEIGHT_PX / 2);
		expect(halfPage.scale).toBeCloseTo(0.528, 2);
	});

	it('tolerates min and max being passed the wrong way round', () => {
		const result = solveFitScale(linear(400), { minScale: 1.2, maxScale: 0.6 });

		expect(result.scale).toBe(1.2);
		expect(result.fits).toBe(true);
	});

	it('never returns a scale it has not seen fit, even when height is a step function', () => {
		// Real text reflows in jumps: a whole line appears at a threshold.
		const stepped = (scale: number) => (scale < 0.9 ? 900 : scale < 1.1 ? 1050 : 1300);

		const result = solveFitScale(stepped, { safetyPx: 0 });

		expect(result.height).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
		expect(stepped(result.scale)).toBe(result.height);
	});

	it('converges within the requested precision', () => {
		const measure = vi.fn(linear(1500));

		const result = solveFitScale(measure, { precision: 0.05 });

		// max + min probes, then log2((1.35 - 0.55) / 0.05) ≈ 4 bisections.
		expect(result.measurements).toBeLessThanOrEqual(8);
		expect(measure).toHaveBeenCalledTimes(result.measurements);
	});
});

describe('fitSheetToPage', () => {
	function fakeSheet(heightAtScale1: number) {
		const applied: string[] = [];
		let scale = 1;
		const target: FitTarget & { applied: string[]; dataset: Record<string, string> } = {
			applied,
			dataset: {},
			style: {
				setProperty: (name: string, value: string) => {
					if (name === '--s') {
						applied.push(value);
						scale = Number(value);
					}
				}
			} as FitTarget['style'],
			getBoundingClientRect: () => ({ height: heightAtScale1 * scale })
		};
		return target;
	}

	it('leaves the winning scale applied to the element', () => {
		const sheet = fakeSheet(1500);

		const result = fitSheetToPage(sheet);

		expect(sheet.applied.at(-1)).toBe(String(result.scale));
		expect(result.fits).toBe(true);
	});

	it('publishes the outcome on data attributes for tooling to assert on', () => {
		const sheet = fakeSheet(400);

		const result = fitSheetToPage(sheet);

		expect(sheet.dataset.fitScale).toBe(result.scale.toFixed(4));
		expect(sheet.dataset.fitHeight).toBe(result.height.toFixed(1));
		expect(sheet.dataset.fitFits).toBe('true');
	});

	it('flags content that cannot fit', () => {
		const sheet = fakeSheet(9000);

		const result = fitSheetToPage(sheet);

		expect(result.fits).toBe(false);
		expect(sheet.dataset.fitFits).toBe('false');
		expect(sheet.dataset.fitScale).toBe(FIT_DEFAULTS.minScale.toFixed(4));
	});
});
