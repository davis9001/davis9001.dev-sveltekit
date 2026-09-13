/**
 * Figure 2 — the instruction file's word count at every revision.
 *
 *   bun run scripts/charts/fly/instructions.mjs [outFile] [dataFile]
 *
 * Same sanitiser constraints as every other figure here: no <style>, no style
 * attributes, no animate tags, no href. See ../README.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = process.argv[2] ?? join(here, 'instructions.svg');
const dataFile = process.argv[3] ?? join(here, 'chart-data.json');
const data = JSON.parse(readFileSync(dataFile, 'utf8'));

const CYAN = '#0891b2';
const ORANGE = '#ea580c';

const history = data.instructionHistory;
if (history.length < 2) {
	throw new Error('instructionHistory needs at least two revisions to draw a line');
}

const W = 520;
const PLOT_TOP = 96;
const PLOT_H = 168;
const BASELINE = PLOT_TOP + PLOT_H;
const PLOT_W = 520;

const maxWords = Math.max(...history.map((p) => p.words));
const t0 = Date.parse(`${history[0].date}T00:00:00Z`);
const t1 = Date.parse(`${history[history.length - 1].date}T00:00:00Z`);
const span = t1 - t0 || 1;

const xOf = (iso) => ((Date.parse(`${iso}T00:00:00Z`) - t0) / span) * PLOT_W;
const yOf = (words) => BASELINE - (words / maxWords) * PLOT_H;

const points = history.map((p) => ({ ...p, x: xOf(p.date), y: yOf(p.words) }));

// The single largest drop between consecutive revisions — the deliberate prune.
let cut = { drop: 0, index: -1 };
for (let i = 1; i < history.length; i += 1) {
	const drop = history[i - 1].words - history[i].words;
	if (drop > cut.drop) cut = { drop, index: i };
}

const parts = [];

function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const prettyDate = (iso) => {
	const [, m, d] = iso.split('-');
	return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`;
};

parts.push(
	`<text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">The only thing in the room with a learning curve</text>`
);
parts.push(
	`<text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Words in one instruction file, at each of its ${history.length} revisions — ${prettyDate(history[0].date)} to ${prettyDate(history[history.length - 1].date)} 2026</text>`
);

parts.push(`<rect class="cf s0" x="0" y="63" width="10" height="10" rx="2.5" fill="${CYAN}" />`);
parts.push(
	`<text class="cf s0" x="16" y="72" font-size="12.5" fill="currentColor" fill-opacity="0.72">CLAUDE.md, word count</text>`
);

// Horizontal reference at the peak.
const peakY = yOf(maxWords);
parts.push(
	`<line class="cf s0" x1="0" y1="${peakY.toFixed(1)}" x2="${PLOT_W}" y2="${peakY.toFixed(1)}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="3 4" />`
);
parts.push(
	`<text class="cf s0" x="${PLOT_W}" y="${(peakY - 6).toFixed(1)}" font-size="11" text-anchor="end" fill="currentColor" fill-opacity="0.5">${maxWords} words</text>`
);
parts.push(
	`<line class="cf s0" x1="0" y1="${BASELINE}" x2="${PLOT_W}" y2="${BASELINE}" stroke="currentColor" stroke-opacity="0.28" stroke-width="1" />`
);

// The line itself. Stepped, because a revision is a discrete event.
const d = points
	.map((p, i) =>
		i === 0
			? `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
			: `L${p.x.toFixed(1)} ${points[i - 1].y.toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`
	)
	.join('');
parts.push(
	`<path class="cf s1" d="${d}" fill="none" stroke="${CYAN}" stroke-width="2.25" stroke-opacity="0.95" />`
);

// A dot per revision, so the reader can count the edits.
points.forEach((p, i) => {
	parts.push(
		`<circle class="cf s${Math.min(6, 2 + Math.floor((i / points.length) * 5))}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.4" fill="${CYAN}" fill-opacity="0.85" />`
	);
});

// Annotate the prune.
if (cut.index > 0) {
	const p = points[cut.index];
	parts.push(
		`<circle class="cf s4" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="none" stroke="${ORANGE}" stroke-width="2" />`
	);
	parts.push(
		`<line class="cf s4" x1="${p.x.toFixed(1)}" y1="${(p.y + 10).toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${(BASELINE - 6).toFixed(1)}" stroke="${ORANGE}" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="3 3" />`
	);
	const anchor = p.x > PLOT_W * 0.6 ? 'end' : 'start';
	const labelX = anchor === 'end' ? p.x - 8 : p.x + 8;
	parts.push(
		`<text class="cf s5" x="${labelX.toFixed(1)}" y="${(BASELINE - 26).toFixed(1)}" font-size="12" font-weight="700" text-anchor="${anchor}" fill="${ORANGE}">−${cut.drop} words</text>`
	);
	parts.push(
		`<text class="cf s5" x="${labelX.toFixed(1)}" y="${(BASELINE - 11).toFixed(1)}" font-size="11.5" text-anchor="${anchor}" fill="currentColor" fill-opacity="0.62">${prettyDate(history[cut.index].date)} — split into on-demand docs</text>`
	);
}

// End label — parked in the empty quadrant under the line, not on top of it.
parts.push(
	`<text class="cf s6" x="${PLOT_W}" y="${(BASELINE - 56).toFixed(1)}" font-size="12.5" font-weight="700" text-anchor="end" fill="currentColor" fill-opacity="0.8">${history[history.length - 1].words} words today</text>`
);

parts.push(
	`<text class="cf s1" x="0" y="${BASELINE + 20}" font-size="11.5" fill="currentColor" fill-opacity="0.55">${prettyDate(history[0].date)}</text>`
);
parts.push(
	`<text class="cf s1" x="${PLOT_W}" y="${BASELINE + 20}" font-size="11.5" text-anchor="end" fill="currentColor" fill-opacity="0.55">${prettyDate(history[history.length - 1].date)}</text>`
);

const RULE_Y = BASELINE + 42;
parts.push(
	`<line x1="0" y1="${RULE_Y}" x2="${PLOT_W}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1" />`
);
parts.push(
	`<text x="0" y="${RULE_Y + 18}" font-size="11.5" fill="currentColor" fill-opacity="0.55">One file on one machine. ${data.memoryFiles} memory files across ${data.memoryProjects} projects sit beside it, uncharted.</text>`
);

const HEIGHT = RULE_Y + 34;

const alt = esc(
	`Stepped line chart of the word count of a CLAUDE.md instruction file across ${history.length} revisions from ${history[0].date} to ${history[history.length - 1].date}. ` +
		`It climbs from ${history[0].words} words to a peak of ${maxWords}, drops by ${cut.drop} words in one revision when the file was split into on-demand documents, ` +
		`then climbs again to ${history[history.length - 1].words} words.`
);

const svg = `<svg viewBox="0 0 ${W} ${HEIGHT}" class="cms-chart" width="100%" role="img" aria-label="${alt}" xmlns="http://www.w3.org/2000/svg">
  ${parts.join('\n  ')}
</svg>
`;

writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${history.length} revisions, peak ${maxWords}, cut −${cut.drop})`);
