/**
 * Derive the chart figures' numbers from the raw lead-scanner sweeps.
 *
 * Nothing here is typed by hand — the post's charts are only as trustworthy as
 * this file, so every number in them is computed from the sweep output and
 * cross-checked before it is written.
 *
 *   bun run scripts/charts/build-data.mjs [outFile] [sweepsDir]
 *
 * The sweeps live in a separate repo (the scanner's `out/`), so the path is an
 * argument with a default rather than something baked in. If it is missing this
 * fails loudly instead of emitting stale or partial numbers.
 *
 * ## Why only two sweeps feed the charts
 *
 * The scanner has run nine times, but the neighbouring-town sweeps overlap each
 * other — Brunswick and Topsham return near-identical sets, and Lewiston's 10km
 * radius already covers Auburn, Lisbon and Sabattus. A sweep records only the
 * businesses that FAILED a check, never the ones that passed, so the `checked`
 * totals cannot be deduplicated and summing them would inflate the denominator.
 *
 * Lewiston–Auburn and Chandler are disjoint metros, so their totals add
 * honestly. Deduplicated across all nine, the other seven contribute just three
 * businesses these two had not already found — reported as `otherSweepsAdded`
 * so the figure can say so rather than quietly dropping them.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? new URL('./chart-data.json', import.meta.url).pathname;
const SWEEPS = process.argv[3] ?? `${process.env.HOME}/_Projects/Anzu/anzu/out`;

/** The two full-metro sweeps whose `checked` totals can be added without overlap. */
const PRIMARY = { ME: '2026-07-29-lewiston-maine', AZ: '2026-08-01-chandler' };

async function readSweep(dir) {
	const file = join(SWEEPS, dir, 'sweep.json');
	try {
		return await Bun.file(file).json();
	} catch {
		throw new Error(`Could not read ${file} — is the scanner repo at ${SWEEPS}?`);
	}
}

const hasFinding = (lead, kind) => (lead.fate?.findings ?? []).some((f) => f.kind === kind);

const out = { ME: {}, AZ: {} };
let checked = 0;
let harvested = 0;
let unver = 0;
const trouble = [];

for (const [region, dir] of Object.entries(PRIMARY)) {
	const sweep = await readSweep(dir);
	checked += sweep.meta.checked;
	harvested += sweep.meta.harvested;
	unver += sweep.unverified.length;
	out[region] = {
		dead: sweep.leads.filter((l) => l.tier === 1).length,
		rented: sweep.leads.filter((l) => l.tier === 2).length,
		warm: sweep.warm.length
	};
	trouble.push(...sweep.leads, ...sweep.warm);
}

// "Still trading" is the absence of a closure headline, not a positive proof of
// life — the figure's own footnote says so, and this keeps the two consistent.
const died = trouble.filter((l) => hasFinding(l, 'news-died')).length;
const changed = trouble.filter(
	(l) => hasFinding(l, 'news-changed') && !hasFinding(l, 'news-died')
).length;

// How much the seven overlapping sweeps would actually add, deduplicated by
// business id — the claim the footnote makes, recomputed rather than trusted.
const seen = new Set(trouble.map((l) => l.id ?? l.name));
let otherSweepsAdded = 0;
for (const dir of readdirSync(SWEEPS)) {
	if (Object.values(PRIMARY).includes(dir)) continue;
	let sweep;
	try {
		sweep = await readSweep(dir);
	} catch {
		continue;
	}
	for (const lead of [...sweep.leads, ...sweep.warm]) {
		const id = lead.id ?? lead.name;
		if (seen.has(id)) continue;
		seen.add(id);
		otherSweepsAdded++;
	}
}

const inTrouble = trouble.length;
const data = {
	...out,
	checked,
	harvested,
	unver,
	inTrouble,
	working: checked - inTrouble - unver,
	died,
	changed,
	noSignOfClosure: inTrouble - died - changed,
	otherSweepsAdded
};

// The bar chart and the donut chart are drawn from the same object; if these
// disagree the two figures in the post contradict each other on the page.
const barsSum =
	data.ME.dead + data.ME.rented + data.ME.warm + data.AZ.dead + data.AZ.rented + data.AZ.warm;
if (barsSum !== inTrouble) {
	throw new Error(`bars sum to ${barsSum} but inTrouble is ${inTrouble} — figures would disagree`);
}
if (data.working < 0) throw new Error(`working came out negative (${data.working})`);

writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${OUT}\n`, data);
console.log(`cross-check: bars sum ${barsSum} === inTrouble ${inTrouble}`);
