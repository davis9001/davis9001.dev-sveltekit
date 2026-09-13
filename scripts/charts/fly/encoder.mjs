/**
 * Figure 2 — how much Kenyon-cell code two inputs share, and the two controls
 * that say whether the encoder is reading design or content.
 *
 *   bun run scripts/charts/fly/encoder.mjs [outFile] [dataFile]
 *
 * Same sanitiser constraints as every other figure here: no <style>, no style
 * attributes, no animate tags, no href. See ../README.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = process.argv[2] ?? join(here, 'encoder.svg');
const dataFile = process.argv[3] ?? join(here, 'chart-data.json');
const data = JSON.parse(readFileSync(dataFile, 'utf8'));
const e = data.encoder;

const ORANGE = '#ea580c';
const CYAN = '#0891b2';

const W = 520;
const TOP = 96;
const ROW_H = 50;
const BAR_X = 0;
const BAR_W = 440; // leaves room for the value at the right edge

const rows = [
	{
		label: 'example.com, .org and .net',
		note: 'one design, three domains',
		value: e.controls.oneDesignThreeDomains,
		control: true
	},
	{
		label: 'Two pages from one site',
		note: `${e.pages} pages across ${e.sites} sites`,
		value: e.withinSite.median,
		control: false
	},
	{
		label: 'Two synthetic odours',
		note: 'what a smell looks like to it',
		value: e.unrelatedOdours.median,
		control: false,
		odour: true
	},
	{
		label: 'Three CSS Zen Garden pages',
		note: 'one document, three designs',
		value: e.controls.oneDocumentThreeDesigns,
		control: true
	},
	{
		label: 'Two pages from different sites',
		note: 'the baseline',
		value: e.betweenSite.median,
		control: false
	}
];

const max = 1;
const parts = [];

function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

parts.push(
	`<text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">The fly reads the design, not the words</text>`
);
parts.push(
	`<text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Kenyon-cell code two inputs share \u2014 ${e.detectors} detectors over a rendered page</text>`
);
parts.push(
	`<rect class="cf s0" x="0" y="62" width="10" height="10" rx="2.5" fill="${ORANGE}" />` +
		`<text class="cf s0" x="16" y="71" font-size="12.5" fill="currentColor" fill-opacity="0.72">Real pages</text>`
);
parts.push(
	`<rect class="cf s0" x="112" y="62" width="10" height="10" rx="2.5" fill="${CYAN}" />` +
		`<text class="cf s0" x="128" y="71" font-size="12.5" fill="currentColor" fill-opacity="0.72">Synthetic odours, for scale</text>`
);

rows.forEach((row, i) => {
	const top = TOP + i * ROW_H;
	const stagger = `s${Math.min(6, i)}`;
	const fill = row.odour ? CYAN : ORANGE;
	const w = Math.max(2, (row.value / max) * BAR_W);
	const y = top + 16;

	parts.push(
		`<text class="cf ${stagger}" x="0" y="${top + 10}" font-size="13.5" fill="currentColor" fill-opacity="0.92">${esc(row.label)}</text>`
	);
	parts.push(
		`<path class="cg ${stagger}" d="M${BAR_X} ${y}h${(w - 3.5).toFixed(1)}a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1 -3.5 3.5h${(-(w - 3.5)).toFixed(1)}z" fill="${fill}" fill-opacity="${row.control ? '0.55' : '1'}" />`
	);
	parts.push(
		`<text class="cf ${stagger}" x="${W}" y="${(y + 9).toFixed(1)}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor" fill-opacity="0.8">${row.value.toFixed(2)}</text>`
	);
	parts.push(
		`<text class="cf ${stagger}" x="0" y="${top + 40}" font-size="11.5" fill="currentColor" fill-opacity="0.55">${esc(row.note)}</text>`
	);
});

const RULE_Y = TOP + rows.length * ROW_H + 4;
parts.push(
	`<line x1="0" y1="${RULE_Y}" x2="${W}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1" />`
);
parts.push(
	`<text x="0" y="${RULE_Y + 18}" font-size="11.5" fill="currentColor" fill-opacity="0.55">Zen Garden is one HTML file under three stylesheets: same words, same markup,</text>`
);
parts.push(
	`<text x="0" y="${RULE_Y + 34}" font-size="11.5" fill="currentColor" fill-opacity="0.55">and the fly cannot tell the three are related.</text>`
);

const HEIGHT = RULE_Y + 50;

const alt = esc(
	`Bar chart of shared Kenyon-cell code. ` +
		rows.map((r) => `${r.label} (${r.note}): ${r.value.toFixed(2)}`).join('. ') +
		`. Pages that were designed alike share the most code; three copies of one document under different stylesheets share as little as two unrelated sites.`
);

const svg = `<svg viewBox="0 0 ${W} ${HEIGHT}" class="cms-chart" width="100%" role="img" aria-label="${alt}" xmlns="http://www.w3.org/2000/svg">
  ${parts.join('\n  ')}
</svg>
`;

writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${rows.length} rows)`);
