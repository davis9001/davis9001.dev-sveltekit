/**
 * The two-donut figure: what share of the checked businesses are broken, and
 * of those, how many still look like a going concern.
 *
 * Same sanitizer-safe subset as the bar chart (no <style>, no style attrs) and
 * the same theme strategy — ink is `currentColor`, and the one accent
 * (#ea580c) is validated to clear 3:1 on both page surfaces. The cyan from the
 * bar chart is deliberately NOT reused: there it means Chandler, and a colour
 * has to keep meaning the same thing across a post.
 *
 * Donuts rather than pies so the headline number can live in the hole — the
 * count is the point, and a reader should not have to estimate an angle.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ACCENT = '#ea580c';
/** Small numbers read better as words in a sentence. */
const word = (n) =>
	['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);

const d = JSON.parse(readFileSync(process.argv[3], 'utf8'));

const W = 520;
const CY = 168;
const R = 64;
const RI = 40;
const CX = [126, 394];
const GAP_DEG = 1.6; // angular version of the 2px surface gap between fills

const DONUTS = [
	{
		cx: CX[0],
		heading: `All ${d.checked} checked`,
		big: d.inTrouble,
		sub: 'in trouble',
		segs: [
			{ n: d.inTrouble, fill: ACCENT, op: 1, label: `${d.inTrouble} broken` },
			{ n: d.working, fill: 'currentColor', op: 0.28, label: `${d.working} working` },
			{ n: d.unver, fill: 'currentColor', op: 0.14, label: `${d.unver} couldn't be checked` }
		]
	},
	{
		cx: CX[1],
		heading: `Those ${d.inTrouble}`,
		big: d.noSignOfClosure,
		sub: 'still trading',
		segs: [
			{ n: d.noSignOfClosure, fill: ACCENT, op: 1, label: `${d.noSignOfClosure} no sign they closed` },
			{ n: d.died, fill: 'currentColor', op: 0.5, label: `${d.died} a headline says closed` },
			{ n: d.changed, fill: 'currentColor', op: 0.28, label: `${d.changed} sold or renamed` }
		]
	}
];

const LEG_TOP = 262;
const LEG_LH = 20;

const body = DONUTS.map((dn, di) => {
	const total = dn.segs.reduce((n, s) => n + s.n, 0);
	// Each ring is a stroked circle rather than a filled wedge, so it can draw
	// itself: pathLength normalises the circumference to 100, the dash carries
	// the arc's own length, and shared CSS animates stroke-dashoffset 100 → 0.
	// Position comes from the SVG `transform` attribute — rotate(deg cx cy) names
	// its own centre, so nothing depends on CSS transform-origin resolving on an
	// SVG node, which is where WebKit falls down.
	const RING_R = (R + RI) / 2;
	const RING_W = R - RI;
	const GAP_N = (GAP_DEG / 360) * 100; // the 2px surface gap, in pathLength units
	let acc = 0;
	const arcs = dn.segs
		.map((s, si) => {
			const frac = s.n / total;
			const len = Math.max(0.4, frac * 100 - GAP_N);
			const rot = -90 + acc * 360 + GAP_DEG / 2;
			acc += frac;
			const op = s.op === 1 ? '' : ` stroke-opacity="${s.op}"`;
			return (
				`  <circle class="cr s${di * 3 + si}" cx="${dn.cx}" cy="${CY}" r="${RING_R}" pathLength="100"` +
				` fill="none" stroke="${s.fill}"${op} stroke-width="${RING_W}"` +
				` stroke-dasharray="${len.toFixed(2)} 999" transform="rotate(${rot.toFixed(2)} ${dn.cx} ${CY})" />`
			);
		})
		.filter(Boolean)
		.join('\n');

	const legend = dn.segs
		.map((s, i) => {
			const y = LEG_TOP + i * LEG_LH;
			const x = dn.cx - 82;
			return (
				`  <rect class="cf s${4 + i}" x="${x}" y="${y - 9}" width="9" height="9" rx="2" fill="${s.fill}"${s.op === 1 ? '' : ` fill-opacity="${s.op}"`} />\n` +
				`  <text class="cf s${4 + i}" x="${x + 15}" y="${y}" font-size="12" fill="currentColor" fill-opacity="0.72">${s.label}</text>`
			);
		})
		.join('\n');

	return [
		`  <text class="cf s0" x="${dn.cx}" y="100" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" fill-opacity="0.7">${dn.heading}</text>`,
		`  <g class="cd">`,
		arcs,
		`  </g>`,
		`  <text class="cf s3" x="${dn.cx}" y="${CY + 2}" text-anchor="middle" font-size="27" font-weight="700" fill="currentColor">${dn.big}</text>`,
		`  <text class="cf s4" x="${dn.cx}" y="${CY + 21}" text-anchor="middle" font-size="11.5" fill="currentColor" fill-opacity="0.6">${dn.sub}</text>`,
		legend
	].join('\n');
}).join('\n');

const FOOT = [
	'“Still trading” means no local-news headline says otherwise — keyword matches on headlines,',
	'so a lead to read rather than a verdict. Seven further sweeps of neighbouring towns added',
	`only ${word(d.otherSweepsAdded)} businesses these two metros had not already found.`
];
// A rule above the footnote, and padding below it: <figure> takes no class
// through the sanitizer, so the figure draws its own bottom edge rather than
// letting the footnote read as body copy with the next paragraph on its heels.
const RULE_Y = LEG_TOP + 2 * LEG_LH + 22;
const footTop = RULE_Y + 22;
const foot =
	`  <line x1="0" y1="${RULE_Y}" x2="${W - 68}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1" />\n` +
	FOOT.map(
		(line, i) =>
			`  <text x="0" y="${footTop + i * 17}" font-size="11.5" fill="currentColor" fill-opacity="0.5">${line}</text>`
	).join('\n');

const BOTTOM_PAD = 26;
const H = footTop + (FOOT.length - 1) * 17 + BOTTOM_PAD;

const svg = `<svg viewBox="0 0 ${W} ${H}" class="cms-chart" width="100%" role="img" aria-label="Two donut charts. Of ${d.checked} businesses whose listing carried a website, ${d.inTrouble} have a broken web presence, ${d.working} have a working site and ${d.unver} could not be checked. Of those ${d.inTrouble} broken ones, ${d.noSignOfClosure} show no sign of having closed, ${d.died} have a local headline saying they closed, and ${d.changed} were sold or renamed." xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">One in five broken — and almost all of them still open</text>
  <text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Lewiston–Auburn, Maine and Chandler, Arizona · ${d.checked} businesses checked</text>
${body}
${foot}
</svg>`;

writeFileSync(process.argv[2] || 'pies.svg', svg + '\n');
console.error(`viewBox 0 0 ${W} ${H} · ${d.inTrouble}/${d.checked} broken · ${d.noSignOfClosure} still trading`);
console.log(svg);
