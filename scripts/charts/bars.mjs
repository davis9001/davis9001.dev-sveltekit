/**
 * The sweep chart, emitted as inline SVG that survives the CMS sanitizer
 * (src/lib/cms/sanitize.ts): no <style>, no style attributes, no href —
 * only the allowlisted presentational subset, so the chart still renders if
 * the post is ever re-saved through the admin editor.
 *
 * Subject: every sweep run so far, deduplicated by business — a small Maine
 * mill city and an affluent Phoenix suburb, which turn out to have almost
 * exactly the same problem. Grouped bars rather than stacked, so every number
 * is readable in ink and nothing has to be printed on top of a fill.
 *
 * Numbers are computed by scripts/… (see chart-data.json), not typed by hand.
 *
 * Theme handling: every neutral mark is `currentColor`, so it inherits the
 * body ink and is correct in light and dark from one asset. Both accents
 * (#ea580c, #0891b2) clear 3:1 against BOTH the light (#ffffff) and dark
 * (#0a0a0a) page surfaces and are ΔE-separated under all three CVD
 * simulations — checked with the palette validator, not by eye.
 *
 * Layout: labels sit ABOVE their bars and the viewBox is deliberately narrow.
 * SVG text scales with the viewBox, so a wide two-column layout renders its
 * labels at ~6px on a phone. This shape stays legible from 360px up.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ME = '#ea580c';
/** Small numbers read better as words in a sentence. */
const word = (n) =>
	['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);

const AZ = '#0891b2';

const d = JSON.parse(readFileSync(process.argv[3], 'utf8'));

const ROWS = [
	{ label: 'Dead domain — nothing loads at all', me: d.ME.dead, az: d.AZ.dead },
	{ label: 'Broken link on their map listing', me: d.ME.warm, az: d.AZ.warm },
	{ label: 'A social page or a rented subdomain', me: d.ME.rented, az: d.AZ.rented }
];
const IN_TROUBLE = ROWS.reduce((n, r) => n + r.me + r.az, 0);

const W = 520;
const FULL = 452;
const TOP = 116;
const PITCH = 78;
const H_BAR = 15;
const BAR_GAP = 6;
const LABEL_DY = 12;
const barMax = Math.max(...ROWS.flatMap((r) => [r.me, r.az]));

function bar(x, y, w, h, r = 3.5) {
	return `M${x} ${y}h${(w - r).toFixed(1)}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r).toFixed(1)}z`;
}

// ── legend: identity never rests on colour alone
const LEG_Y = 74;
const legend = [
	{ x: 0, c: ME, text: 'Lewiston–Auburn, Maine' },
	{ x: 238, c: AZ, text: 'Chandler, Arizona' }
]
	.map(
		(l) =>
			`  <rect class="cf s0" x="${l.x}" y="${LEG_Y - 9}" width="10" height="10" rx="2.5" fill="${l.c}" />\n` +
			`  <text class="cf s0" x="${l.x + 16}" y="${LEG_Y}" font-size="12.5" fill="currentColor" fill-opacity="0.72">${l.text}</text>`
	)
	.join('\n');

const rows = ROWS.map((r, i) => {
	const y = TOP + i * PITCH;
	const out = [
		`  <text class="cf s${i * 2}" x="0" y="${y - LABEL_DY}" font-size="14.5" fill="currentColor" fill-opacity="0.85">${r.label}</text>`
	];
	[
		{ v: r.me, c: ME },
		{ v: r.az, c: AZ }
	].forEach((s, k) => {
		const by = y + k * (H_BAR + BAR_GAP);
		const w = (s.v / barMax) * FULL;
		out.push(`  <path class="cg s${i * 2 + k}" d="${bar(0, by, w, H_BAR)}" fill="${s.c}" />`);
		out.push(
			`  <text class="cf s${i * 2 + k + 1}" x="${(w + 9).toFixed(1)}" y="${(by + H_BAR / 2).toFixed(1)}" dominant-baseline="middle" font-size="13" font-weight="700" fill="currentColor" fill-opacity="0.78">${s.v}</text>`
		);
	});
	return out.join('\n');
}).join('\n');

const barsEnd = TOP + (ROWS.length - 1) * PITCH + H_BAR * 2 + BAR_GAP;
const FOOT = [
	`Both metros swept and checked identically. A further ${d.unver} sites sat behind bot filters and`,
	`could not be judged either way; seven sweeps of neighbouring Maine towns added only ${word(d.otherSweepsAdded)}`,
	'businesses these two had not already found.'
];
// A rule above the footnote, and padding below it. <figure> takes no class
// through the sanitizer, so the figure has to draw its own bottom edge or the
// footnote reads as body copy and the next paragraph crowds it.
const RULE_Y = barsEnd + 22;
const footTop = RULE_Y + 22;
const foot =
	`  <line x1="0" y1="${RULE_Y}" x2="${FULL}" y2="${RULE_Y}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1" />\n` +
	FOOT.map(
		(line, i) =>
			`  <text x="0" y="${footTop + i * 17}" font-size="11.5" fill="currentColor" fill-opacity="0.5">${line}</text>`
	).join('\n');

const BOTTOM_PAD = 26;
const H = footTop + (FOOT.length - 1) * 17 + BOTTOM_PAD;

const svg = `<svg viewBox="0 0 ${W} ${H}" class="cms-chart" width="100%" role="img" aria-label="Grouped bar chart comparing broken small-business web presence between Lewiston–Auburn, Maine and Chandler, Arizona. Dead domain that loads nothing: ${d.ME.dead} in Maine, ${d.AZ.dead} in Chandler. Broken link on their map listing: ${d.ME.warm} in Maine, ${d.AZ.warm} in Chandler. A social page or a rented subdomain: ${d.ME.rented} in Maine, ${d.AZ.rented} in Chandler. ${IN_TROUBLE} open businesses in total." xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="20" font-size="18" font-weight="700" fill="currentColor">${IN_TROUBLE} open businesses with a broken front door</text>
  <text x="0" y="44" font-size="13" fill="currentColor" fill-opacity="0.62">Two metros, ${d.harvested.toLocaleString("en-US")} listings, ${d.checked} of them with a website to check</text>
${legend}
${rows}
${foot}
</svg>`;

writeFileSync(process.argv[2] || 'chart.svg', svg + '\n');
console.error(`viewBox 0 0 ${W} ${H} · ${IN_TROUBLE} in trouble · max bar ${barMax}`);
console.log(svg);
