/*
 * Capture an animated WebP of the fly art-directing a page, from fly.ammoura.me.
 *
 * Steps the run from generation 0 to its last and records the scene — the fly,
 * the monitor showing the page it picked, and the Kenyon-cell raster. Frames
 * are grabbed one at a time rather than through Playwright's video recorder,
 * so the frame rate, the length and the output size are all controllable — an
 * animation that has to be uploaded and then read on a phone wants all three.
 *
 * The page advances itself on a one-second clock, but a screenshot of this
 * scene takes longer than that on a headless box, so recording against its own
 * clock drops generations (and a scrub mid-run pauses it). The playhead the
 * page exposes is driven directly instead: every generation appears, for the
 * same number of frames, however slow the machine is.
 *
 * Usage:
 *   node scripts/capture-fly-evolution-webp.cjs [outFile]
 *
 * Env:
 *   FLY_URL        page to record (default: https://fly.ammoura.me/)
 *   FLY_SELECTOR   region to clip to (default: .scene — the fly, the monitor, the raster)
 *   FLY_SCALE      output width in px (default 640)
 *   FLY_QUALITY    libwebp quality 0-100 (default 34)
 *   FLY_FPS        frames per second (default 6)
 *   FLY_PER_GEN    frames held on each generation (default 4)
 *   FLY_SECONDS    fallback length, if the page exposes no playhead (default 11)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const URL_ = process.env.FLY_URL || 'https://fly.ammoura.me/';
const SELECTOR = process.env.FLY_SELECTOR || '.scene';
const OUT_WIDTH = Number(process.env.FLY_SCALE || 640);
const QUALITY = Number(process.env.FLY_QUALITY || 34);
const FPS = Number(process.env.FLY_FPS || 6);
const SECONDS = Number(process.env.FLY_SECONDS || 11);
const PER_GEN = Number(process.env.FLY_PER_GEN || 4);
const OUT = process.argv[2] || path.join(process.cwd(), 'test-outputs', 'fly-evolution.webp');

const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fly-evolution-'));

async function main() {
	const browser = await chromium.launch({
		// The circuit view is WebGL; software rendering keeps this working on a
		// headless box with no GPU.
		args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
	});
	const page = await browser.newPage({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1
	});
	await page.goto(URL_, { waitUntil: 'networkidle', timeout: 90000 });
	await page.waitForTimeout(6000);

	// Shoot the element rather than a viewport rectangle — Playwright's `clip`
	// is viewport-relative, so a page-coordinate rectangle silently records
	// whatever happens to be scrolled into that box instead.
	const bench = page.locator(SELECTOR).first();
	if ((await bench.count()) === 0) throw new Error(`no element matching ${SELECTOR}`);
	await bench.scrollIntoViewIfNeeded();
	await page.waitForTimeout(500);

	// Take the clock off the page, so a slow screenshot cannot skip a
	// generation. Generation count comes from the scrubber's own range.
	const generations = await page.evaluate(() => {
		const s = document.getElementById('scrub');
		if (!window.Playhead || !s) return 0;
		window.Playhead.set({ playing: false, gen: 0 });
		return Number(s.max) + 1;
	});
	await page.waitForTimeout(900);

	let total = 0;
	const shoot = async () => {
		await bench.screenshot({
			path: path.join(frameDir, `f${String(total).padStart(4, '0')}.png`)
		});
		total += 1;
	};

	if (generations > 0) {
		for (let gen = 0; gen < generations; gen += 1) {
			await page.evaluate((g) => window.Playhead.set({ gen: g }), gen);
			// The monitor cross-fades between two layers; a beat here means the
			// first frame of a generation is that generation, not the last one.
			await page.waitForTimeout(650);
			for (let f = 0; f < PER_GEN; f += 1) await shoot();
		}
	} else {
		// No playhead on the page — record its own clock for a fixed stretch.
		const label = await page.locator('#play').innerText();
		if (/^\s*play/i.test(label)) await page.locator('#play').click();
		const frames = Math.round(SECONDS * FPS);
		for (let i = 0; i < frames; i += 1) {
			await shoot();
			await page.waitForTimeout(1000 / FPS);
		}
	}

	await browser.close();

	const result = spawnSync(
		'ffmpeg',
		[
			'-y',
			'-framerate',
			String(FPS),
			'-i',
			path.join(frameDir, 'f%04d.png'),
			'-vf',
			`scale=${OUT_WIDTH}:-2:flags=lanczos`,
			'-c:v',
			'libwebp_anim',
			'-lossless',
			'0',
			'-q:v',
			String(QUALITY),
			'-compression_level',
			'6',
			'-loop',
			'0',
			'-an',
			OUT
		],
		{ stdio: ['ignore', 'ignore', 'pipe'] }
	);
	if (result.status !== 0) {
		throw new Error(`ffmpeg failed: ${result.stderr?.toString().slice(-600)}`);
	}

	fs.rmSync(frameDir, { recursive: true, force: true });
	const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
	console.log(
		`Wrote ${OUT} — ${total} frames, ${generations || '?'} generations, ${OUT_WIDTH}px wide, ${kb} KB`
	);
	if (Number(kb) > 250) {
		console.log('Large for an inline animation. Lower FLY_QUALITY, FLY_SCALE or FLY_SECONDS.');
	}
}

main().catch((err) => {
	fs.rmSync(frameDir, { recursive: true, force: true });
	console.error(err);
	process.exit(1);
});
