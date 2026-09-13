/**
 * Figure 1 — daily commit output across every local repo, against the fly.
 *
 *   bun run scripts/charts/fly/columns.mjs [outFile] [dataFile]
 *
 * Constraints come from src/lib/cms/sanitize.ts — see ../README.md. No <style>,
 * no style attributes, no animate tags, no href. Colour is currentColor plus
 * the two validated accents.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = process.argv[2] ?? join(here, 'columns.svg');
const dataFile = process.argv[3] ?? join(here, 'chart-data.json');
const data = JSON.parse(readFileSync(dataFile, 'utf8'));

const ORANGE = '#ea580c';
const CYAN = '#0891b2';

const W = 520;
const PLOT_X = 0;
const PLOT_W = 520;
const PLOT_TOP = 104;
const PLOT_H = 150;
const BASELINE = PLOT_TOP + PLOT_H;

const days = data.commits;
const max = Math.max(...days.map((d) => d.count));
const gap = 5;
const colW = (PLOT_W - gap * (days.length - 1)) / days.length;

const parts = [];
const stagger = (i) => `s${i % 7}`;

function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const shortDate = (iso) => {
	const [, m, d] = iso.split('-');
	return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`;
};

// Heading
parts.push(
	`<text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">${data.totalCommits} commits in ${data.window.days} days. None of them the fly's.</text>`
);
parts.push(
	`<text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Every git repository under ~/_Projects — ${data.activeRepos} of ${data.totalRepos} saw a commit in the window</text>`
);

// Legend
parts.push(`<rect class="cf s0" x="0" y="63" width="10" height="10" rx="2.5" fill="${ORANGE}" />`);
parts.push(
	`<text class="cf s0" x="16" y="72" font-size="12.5" fill="currentColor" fill-opacity="0.72">Commits per day, all local repos</text>`
);
parts.push(
	`<circle class="cf s0" cx="285" cy="68" r="4.5" fill="${CYAN}" />` +
		`<text class="cf s0" x="296" y="72" font-size="12.5" fill="currentColor" fill-opacity="0.72">Commits per day, the fly</text>`
);

// Gridline at the peak, so the zero line has something to be measured against.
parts.push(
	`<line class="cf s0" x1="0" y1="${PLOT_TOP}" x2="${PLOT_W}" y2="${PLOT_TOP}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="3 4" />`
);
parts.push(
	`<text class="cf s0" x="${PLOT_W}" y="${PLOT_TOP - 6}" font-size="11" text-anchor="end" fill="currentColor" fill-opacity="0.5">${max}</text>`
);

// Columns
days.forEach((day, i) => {
	const x = PLOT_X + i * (colW + gap);
	const h = max === 0 ? 0 : (day.count / max) * PLOT_H;
	if (h > 0) {
		const y = BASELINE - h;
		const r = Math.min(2.5, h / 2);
		parts.push(
			`<rect class="cf ${stagger(i)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${colW.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" fill="${ORANGE}" />`
		);
	}
	// The peak day earns a number.
	if (day.count === max) {
		parts.push(
			`<text class="cf ${stagger(i)}" x="${(x + colW / 2).toFixed(1)}" y="${(BASELINE - h - 7).toFixed(1)}" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" fill-opacity="0.8">${day.count}</text>`
		);
	}
});

// Baseline, then the fly's series sitting exactly on it.
parts.push(
	`<line class="cf s0" x1="0" y1="${BASELINE}" x2="${PLOT_W}" y2="${BASELINE}" stroke="currentColor" stroke-opacity="0.28" stroke-width="1" />`
);
days.forEach((_day, i) => {
	const cx = PLOT_X + i * (colW + gap) + colW / 2;
	parts.push(
		`<circle class="cf ${stagger(i)}" cx="${cx.toFixed(1)}" cy="${BASELINE}" r="3" fill="${CYAN}" />`
	);
});

// Axis labels: first and last day only.
parts.push(
	`<text class="cf s1" x="0" y="${BASELINE + 20}" font-size="11.5" fill="currentColor" fill-opacity="0.55">${shortDate(data.window.start)}</text>`
);
parts.push(
	`<text class="cf s1" x="${PLOT_W}" y="${BASELINE + 20}" font-size="11.5" text-anchor="end" fill="currentColor" fill-opacity="0.55">${shortDate(data.window.end)}</text>`
);

// Footnote under a hairline, inside the SVG — <figcaption> takes no attributes.
const RULE_Y = BASELINE + 42;
parts.push(
	`<line x1="0" y1="${RULE_Y}" x2="${PLOT_W}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1" />`
);
parts.push(
	`<text x="0" y="${RULE_Y + 18}" font-size="11.5" fill="currentColor" fill-opacity="0.55">${data.activeDays} of ${data.window.days} days had at least one commit. The fly's series is flat at zero and is drawn on the axis.</text>`
);

const HEIGHT = RULE_Y + 34;

const alt = esc(
	`Column chart of commits per day across every local git repository from ${data.window.start} to ${data.window.end}: ` +
		`${data.totalCommits} commits over ${data.window.days} days, peaking at ${max} in one day, with ${data.activeDays} active days. ` +
		`A second series for the fruit fly sits flat on the zero axis for all ${data.window.days} days.`
);

const svg = `<svg viewBox="0 0 ${W} ${HEIGHT}" class="cms-chart" width="100%" role="img" aria-label="${alt}" xmlns="http://www.w3.org/2000/svg">
  ${parts.join('\n  ')}
</svg>
`;

writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${days.length} days, peak ${max})`);
