/**
 * Regenerate both chart figures for the client-websites post.
 *
 *   bun run scripts/charts/build.mjs [outDir]
 *
 * Writes chart-data.json, bars.svg and donuts.svg. Paste an SVG into the post
 * body inside a <figure>; the CMS stores it as-is. See README.md in this
 * directory for the constraints those SVGs have to satisfy — they are not
 * optional, and a chart that ignores them will render but not animate.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? here;
mkdirSync(outDir, { recursive: true });

const data = join(outDir, 'chart-data.json');

function run(script, args) {
	const result = spawnSync('bun', [join(here, script), ...args], { stdio: 'inherit' });
	if (result.status !== 0) {
		throw new Error(`${script} failed with status ${result.status}`);
	}
}

run('build-data.mjs', [data]);
run('bars.mjs', [join(outDir, 'bars.svg'), data]);
run('donuts.mjs', [join(outDir, 'donuts.svg'), data]);

console.log(`\nWrote bars.svg and donuts.svg to ${outDir}`);
