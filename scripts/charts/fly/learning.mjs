/**
 * Figure 1 — what training does to the fly, and what each lesion takes away.
 *
 *   bun run scripts/charts/fly/learning.mjs [outFile] [dataFile]
 *
 * Constraints come from src/lib/cms/sanitize.ts — see ../README.md. No <style>,
 * no style attributes, no animate tags, no href. Colour is currentColor plus
 * the two validated accents.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = process.argv[2] ?? join(here, 'learning.svg');
const dataFile = process.argv[3] ?? join(here, 'chart-data.json');
const data = JSON.parse(readFileSync(dataFile, 'utf8'));

const ORANGE = '#ea580c'; // punishment, and everything downstream of it
const CYAN = '#0891b2'; // reward

const W = 520;
const TOP = 108;
const ROW_H = 46;
const DOMAIN = 0.45; // symmetric, so zero sits in the middle and is not a choice

const rows = data.learning.rows;
const xOf = (v) => ((v + DOMAIN) / (2 * DOMAIN)) * W;
const ZERO_X = xOf(0);

const fmt = (v) => (v >= 0 ? `+${v.toFixed(2)}` : `−${Math.abs(v).toFixed(2)}`);

function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const parts = [];

parts.push(
	`<text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">The wiring is what does the learning</text>`
);
parts.push(
	`<text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Preference after training, ${data.learning.reps} runs per row, median and 5–95%</text>`
);
parts.push(
	`<rect class="cf s0" x="0" y="62" width="10" height="10" rx="2.5" fill="${ORANGE}" />` +
		`<text class="cf s0" x="16" y="71" font-size="12.5" fill="currentColor" fill-opacity="0.72">Right hemisphere</text>`
);
parts.push(
	`<circle class="cf s0" cx="164" cy="67" r="4" fill="none" stroke="${CYAN}" stroke-width="2" />` +
		`<text class="cf s0" x="175" y="71" font-size="12.5" fill="currentColor" fill-opacity="0.72">Left — no parameter was ever fitted to it</text>`
);

const PLOT_TOP = TOP;
const PLOT_BOTTOM = TOP + rows.length * ROW_H - 8;

// Zero line, and the two directions named once at the top.
parts.push(
	`<line class="cf s0" x1="${ZERO_X.toFixed(1)}" y1="${PLOT_TOP - 14}" x2="${ZERO_X.toFixed(1)}" y2="${PLOT_BOTTOM}" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" />`
);
parts.push(
	`<text class="cf s0" x="${(ZERO_X - 8).toFixed(1)}" y="${PLOT_TOP - 18}" font-size="11" text-anchor="end" fill="currentColor" fill-opacity="0.5">avoid</text>`
);
parts.push(
	`<text class="cf s0" x="${(ZERO_X + 8).toFixed(1)}" y="${PLOT_TOP - 18}" font-size="11" fill="currentColor" fill-opacity="0.5">approach</text>`
);

rows.forEach((row, i) => {
	const top = TOP + i * ROW_H;
	const stagger = `s${Math.min(6, i)}`;
	const label = row.lesion ? `…with ${row.label}` : row.label;

	parts.push(
		`<text class="cf ${stagger}" x="0" y="${top + 10}" font-size="13.5" fill="currentColor" fill-opacity="${row.lesion ? '0.72' : '0.92'}">${esc(label)}</text>`
	);
	parts.push(
		`<text class="cf ${stagger}" x="${W}" y="${top + 10}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor" fill-opacity="0.78">${fmt(row.R.median)}</text>`
	);

	const y = top + 26;
	// Right hemisphere: the interval, then the median.
	parts.push(
		`<line class="cf ${stagger}" x1="${xOf(row.R.lo).toFixed(1)}" y1="${y}" x2="${xOf(row.R.hi).toFixed(1)}" y2="${y}" stroke="${ORANGE}" stroke-opacity="0.34" stroke-width="5" />`
	);
	parts.push(
		`<circle class="cf ${stagger}" cx="${xOf(row.R.median).toFixed(1)}" cy="${y}" r="4.5" fill="${ORANGE}" />`
	);
	// Left hemisphere: the median only, hollow, so the two are distinguishable
	// where they sit on top of each other.
	parts.push(
		`<circle class="cf ${stagger}" cx="${xOf(row.L.median).toFixed(1)}" cy="${y}" r="4.5" fill="none" stroke="${CYAN}" stroke-width="2" />`
	);
});

const shuffled = rows.find((r) => r.key === 'shuffled_valence');

const RULE_Y = PLOT_BOTTOM + 26;
parts.push(
	`<line x1="0" y1="${RULE_Y}" x2="${W}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1" />`
);
parts.push(
	`<text x="0" y="${RULE_Y + 18}" font-size="11.5" fill="currentColor" fill-opacity="0.55">Rows 3–5 are the punishment case with one thing broken. Scrambling Kenyon-cell</text>`
);
parts.push(
	`<text x="0" y="${RULE_Y + 34}" font-size="11.5" fill="currentColor" fill-opacity="0.55">identity is the control that should change nothing, and does not. Only ${Math.round(shuffled.R.agree * 100)}% of</text>`
);
parts.push(
	`<text x="0" y="${RULE_Y + 50}" font-size="11.5" fill="currentColor" fill-opacity="0.55">compartment shuffles agree on a direction at all.</text>`
);

const HEIGHT = RULE_Y + 66;

const alt = esc(
	`Interval chart of the fly's preference after training, ${data.learning.reps} runs per row, on both hemispheres. ` +
		rows
			.map((r) => `${r.label}: ${r.R.median.toFixed(2)} right, ${r.L.median.toFixed(2)} left`)
			.join('. ') +
		`. Positive is approach, negative is avoidance.`
);

const svg = `<svg viewBox="0 0 ${W} ${HEIGHT}" class="cms-chart" width="100%" role="img" aria-label="${alt}" xmlns="http://www.w3.org/2000/svg">
  ${parts.join('\n  ')}
</svg>
`;

writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${rows.length} rows)`);
