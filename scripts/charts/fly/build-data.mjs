/**
 * Pull the numbers for the fruit-fly post out of the Kenyon repo's own outputs.
 *
 *   bun run scripts/charts/fly/build-data.mjs [outFile]
 *
 * Sources, all written by the circuit itself and committed there:
 *   out/replication.json — every claim, 100 runs, both hemispheres
 *   out/pages.json       — the page encoder's acceptance test
 *   out/taste.json       — held-out prediction from rated pages
 *   out/ratings.json     — the human ratings collected so far
 *
 * Nothing here is typed by hand. If a figure disagrees with Kenyon, Kenyon is
 * right and this script is the bug. Point KENYON_DIR somewhere else to rebuild
 * against a different checkout.
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const KENYON = process.env.KENYON_DIR ?? join(homedir(), '_Projects', 'Kenyon', 'kenyon');
const read = (name) => {
	const path = join(KENYON, 'out', name);
	if (!existsSync(path)) {
		throw new Error(`missing ${path} — run the Kenyon scripts first, or set KENYON_DIR`);
	}
	return JSON.parse(readFileSync(path, 'utf8'));
};

const replication = read('replication.json');
const pages = read('pages.json');
const taste = read('taste.json');
const ratings = read('ratings.json');

/** A claim as {median, lo, hi}, from whichever hemisphere is asked for. */
const claim = (side, name) => {
	const c = replication[side].claims[name];
	return { median: c.median, lo: c.lo, hi: c.hi, agree: c.agree ?? null, n: c.n };
};

const data = {
	generatedAt: new Date().toISOString(),
	source: KENYON,

	// Figure 1: training moves the fly, and each lesion says which part did it.
	learning: {
		reps: replication.R.reps,
		rows: [
			{ key: 'appetitive', label: 'Paired with reward', lesion: false },
			{ key: 'aversive', label: 'Paired with punishment', lesion: false },
			{ key: 'shuffled_valence', label: 'MBON compartments shuffled', lesion: true },
			{ key: 'shuffled_targets', label: 'the dopamine mis-aimed', lesion: true },
			{ key: 'shuffled_kcs', label: 'Kenyon-cell identity shuffled', lesion: true }
		].map((row) => ({ ...row, R: claim('R', row.key), L: claim('L', row.key) }))
	},

	// Figure 2: how much Kenyon-cell code two inputs share.
	encoder: {
		pages: pages.pages,
		sites: Object.keys(pages.per_site).length,
		detectors: pages.detectors,
		withinSite: pages.within_site,
		betweenSite: pages.between_site,
		unrelatedOdours: pages.unrelated_odours,
		withinAboveBetween: pages.within_above_between_median,
		controls: {
			oneDesignThreeDomains: pages.per_site.example,
			oneDocumentThreeDesigns: pages.per_site.zengarden
		},
		sparsityOdours: pages.sparsity_odours,
		sparsityPages: pages.sparsity_pages
	},

	taste: {
		corpus: taste.corpus,
		synthetic: taste.synthetic,
		holdout: taste.holdout,
		shuffledRatings: taste.shuffled_ratings,
		lesioned: taste.lesioned,
		ratedByHand: Object.keys(ratings).length
	}
};

const outFile = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), 'chart-data.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(data, null, '\t')}\n`);

console.log(
	`reward ${data.learning.rows[0].R.median.toFixed(3)} / punishment ${data.learning.rows[1].R.median.toFixed(3)} · ` +
		`same-site ${data.encoder.withinSite.median.toFixed(3)} vs different ${data.encoder.betweenSite.median.toFixed(3)} · ` +
		`held-out ${data.taste.holdout.median.toFixed(3)} vs null ${data.taste.shuffledRatings.median.toFixed(3)} · ` +
		`${data.taste.ratedByHand} of ${data.taste.corpus} pages rated by hand`
);
