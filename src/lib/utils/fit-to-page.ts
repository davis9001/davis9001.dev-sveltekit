/**
 * One-page auto-fit for the printable résumé sheet.
 *
 * The résumé is rendered twice: once as the responsive web layout, and once as
 * a fixed 8.5in-wide "sheet" that is what actually goes to the printer. Every
 * font size and gap inside the sheet is expressed as `calc(N * var(--pt))`
 * where `--pt: calc(1pt * var(--s))`, so a single `--s` multiplier scales the
 * whole document uniformly.
 *
 * This module finds the largest `--s` whose rendered sheet still fits on one
 * page. Because the sheet is always in the DOM (just parked off-screen), the
 * measurement is real layout at real print width — no print-preview guessing —
 * so it stays correct when the content changes.
 */

/** CSS pixels per CSS inch. Fixed by the CSS spec, independent of device DPI. */
export const CSS_PX_PER_IN = 96;

/** US Letter, matching `@page { size: 8.5in 11in }`. */
export const PAGE_HEIGHT_IN = 11;
export const PAGE_WIDTH_IN = 8.5;

/** Usable page height in CSS pixels. */
export const PAGE_HEIGHT_PX = PAGE_HEIGHT_IN * CSS_PX_PER_IN;

export interface FitOptions {
	/** Never shrink past this — below it the résumé stops being readable. */
	minScale?: number;
	/** Never grow past this — keeps a short résumé from looking like a poster. */
	maxScale?: number;
	/** Stop bisecting once the bracket is narrower than this. */
	precision?: number;
	/** Pixels of headroom kept above the page bottom, to absorb rounding. */
	safetyPx?: number;
	/** Page height in CSS pixels. */
	availablePx?: number;
}

export interface FitResult {
	/** The scale that was applied. */
	scale: number;
	/** Rendered height in CSS pixels at that scale. */
	height: number;
	/** False when even `minScale` overflows the page. */
	fits: boolean;
	/** Number of measurements taken (useful in tests / debugging). */
	measurements: number;
}

export const FIT_DEFAULTS = {
	minScale: 0.55,
	maxScale: 1.35,
	precision: 0.002,
	// ~1/16in of slack. The sheet is measured in the same layout the printer
	// gets, so this only has to absorb sub-pixel pagination rounding — but
	// losing 0.6% of type size is far cheaper than losing the one-page promise.
	safetyPx: 6,
	availablePx: PAGE_HEIGHT_PX
} as const satisfies Required<FitOptions>;

/**
 * Largest scale in [minScale, maxScale] whose measured height fits the budget.
 *
 * `measure` must be monotonic-ish in scale (bigger type => taller page). Text
 * reflow makes it a step function rather than a smooth one, which bisection
 * handles fine: it only ever returns a scale it has actually seen fit.
 */
export function solveFitScale(
	measure: (scale: number) => number,
	options: FitOptions = {}
): FitResult {
	const { minScale, maxScale, precision, safetyPx, availablePx } = { ...FIT_DEFAULTS, ...options };

	let measurements = 0;
	const at = (scale: number) => {
		measurements++;
		return measure(scale);
	};

	const lowest = Math.min(minScale, maxScale);
	const highest = Math.max(minScale, maxScale);
	const budget = availablePx - safetyPx;

	// Fastest path, and the common one once the content is stable: the biggest
	// allowed size already fits, so there is nothing to search for.
	const tallest = at(highest);
	if (tallest <= budget) {
		return { scale: highest, height: tallest, fits: true, measurements };
	}

	const shortest = at(lowest);
	if (shortest > budget) {
		// Content is too long for one page even at minimum size. Report it rather
		// than shrinking into illegibility — that's an editorial problem, not a
		// layout one.
		return { scale: lowest, height: shortest, fits: false, measurements };
	}

	let lo = lowest;
	let hi = highest;
	let best: FitResult = { scale: lowest, height: shortest, fits: true, measurements };

	while (hi - lo > precision) {
		const mid = (lo + hi) / 2;
		const height = at(mid);
		if (height <= budget) {
			lo = mid;
			best = { scale: mid, height, fits: true, measurements };
		} else {
			hi = mid;
		}
	}

	return { ...best, measurements };
}

/** Minimal surface of the sheet element this module touches (keeps it testable). */
export interface FitTarget {
	style: Pick<CSSStyleDeclaration, 'setProperty'>;
	dataset: DOMStringMap;
	getBoundingClientRect: () => { height: number };
}

/**
 * Measure `sheet` at successive scales and leave the best-fitting one applied.
 *
 * The resulting scale is also written to `data-fit-scale` / `data-fit-fits` so
 * end-to-end tests and PDF tooling can assert on it without re-deriving it.
 */
export function fitSheetToPage(sheet: FitTarget, options: FitOptions = {}): FitResult {
	const apply = (scale: number) => sheet.style.setProperty('--s', String(scale));

	const result = solveFitScale((scale) => {
		apply(scale);
		return sheet.getBoundingClientRect().height;
	}, options);

	apply(result.scale);
	sheet.dataset.fitScale = result.scale.toFixed(4);
	sheet.dataset.fitHeight = result.height.toFixed(1);
	sheet.dataset.fitFits = String(result.fits);

	return result;
}
