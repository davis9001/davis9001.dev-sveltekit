/**
 * Guards on the .cms-chart animation rules in app.css.
 *
 * These are static-text assertions rather than rendered-style ones on purpose:
 * jsdom does not run the cascade for animations, and the two bugs worth
 * catching here are both *silent*. A broken stagger still animates — just all
 * at once — and a mark hidden by a transform that an engine declines still
 * "works" everywhere the author happened to test. Neither shows up as a failure
 * anywhere else in the suite.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app.css', 'utf8');

/** Position of a substring, asserted to exist. */
function at(needle: string): number {
	const i = css.indexOf(needle);
	expect(i, `expected app.css to contain: ${needle}`).toBeGreaterThan(-1);
	return i;
}

describe('cms-chart animation css', () => {
	it('animates every mark class when the figure comes into view', () => {
		for (const cls of ['.cg', '.cf', '.cr']) {
			expect(css).toContain(`.cms-chart.chart-anim.in-view ${cls} {`);
		}
	});

	it('hides marks only under .chart-anim, which JS adds', () => {
		// Without JS the class is never added, so nothing is ever hidden and the
		// chart renders complete. A hiding rule outside .chart-anim would leave a
		// blank figure for anyone with JS off.
		for (const cls of ['.cg', '.cf', '.cr']) {
			const hidden = new RegExp(`\\.cms-chart\\.chart-anim ${cls.replace('.', '\\.')} \\{`);
			expect(css).toMatch(hidden);
		}
	});

	it('gives stagger rules at least the specificity of the animation shorthand', () => {
		// The `animation` shorthand resets animation-delay to 0. A stagger rule
		// that is weaker than it is silently overruled and the whole figure moves
		// in lockstep — which is exactly how this shipped once.
		for (let i = 0; i <= 6; i++) {
			expect(css).toContain(`.cms-chart.chart-anim.in-view .s${i} { animation-delay:`);
			expect(css).not.toContain(`.cms-chart .s${i} { animation-delay:`);
		}
	});

	it('declares stagger delays after the rules that set animation', () => {
		// Equal specificity means source order decides the winner.
		expect(at('.cms-chart.chart-anim.in-view .s0 { animation-delay:')).toBeGreaterThan(
			at('.cms-chart.chart-anim.in-view .cg {')
		);
	});

	it('keeps the delays ordered and non-decreasing', () => {
		const delays = Array.from({ length: 7 }, (_, i) => {
			const m = css.match(
				new RegExp(`\\.cms-chart\\.chart-anim\\.in-view \\.s${i} \\{ animation-delay: (\\d+)ms;`)
			);
			expect(m, `no delay found for .s${i}`).not.toBeNull();
			return Number(m![1]);
		});
		expect(delays[0]).toBe(0);
		for (let i = 1; i < delays.length; i++) {
			expect(delays[i], `.s${i} must not come before .s${i - 1}`).toBeGreaterThan(delays[i - 1]);
		}
	});

	it('animates opacity alongside every transform', () => {
		// So an engine that declines the transform degrades to a fade rather than
		// leaving a mark at scale 0 with nothing on screen.
		const grow = css.slice(at('@keyframes cms-chart-grow'));
		expect(grow.slice(0, grow.indexOf('}\n}') + 3)).toContain('opacity');
	});

	it('draws rings without any transform-origin dependency', () => {
		// transform-box/transform-origin on an SVG node does not work in WebKit —
		// the rings were motionless on iOS until this became a dash animation.
		const draw = css.slice(at('@keyframes cms-chart-draw'));
		const body = draw.slice(0, draw.indexOf('}\n}') + 3);
		expect(body).toContain('stroke-dashoffset');
		expect(body).not.toContain('transform-origin');
		expect(css).not.toContain('transform-box: view-box');
	});

	it('turns motion off entirely for prefers-reduced-motion', () => {
		const block = css.slice(at('@media (prefers-reduced-motion: reduce)'));
		expect(block.slice(0, 400)).toContain('animation: none');
		expect(block.slice(0, 400)).toContain('stroke-dashoffset: 0');
	});
});
