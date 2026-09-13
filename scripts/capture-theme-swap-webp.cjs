/*
 * Capture an animated WebP of the portfolio's theme swap.
 *
 * Records the /portfolio page while the theme toggle is driven light → dark →
 * light, so every card, every embedded product screenshot and the page chrome
 * change together. Frames are grabbed one by one rather than through
 * Playwright's video recorder, because an animated WebP has to stay under the
 * ~100KB single-PUT ceiling on the R2 bucket and that needs frame-level control.
 *
 * Usage:
 *   node scripts/capture-theme-swap-webp.cjs [outFile]
 *
 * Env:
 *   THEME_SWAP_URL     page to record (default: localhost:4242/portfolio)
 *   THEME_SWAP_WIDTH   capture width in CSS px (default 900)
 *   THEME_SWAP_SCALE   output width in px (default 720)
 *   THEME_SWAP_QUALITY libwebp quality 0-100 (default 42)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const URL_ = process.env.THEME_SWAP_URL || 'http://localhost:4242/portfolio';
const WIDTH = Number(process.env.THEME_SWAP_WIDTH || 900);
const HEIGHT = Math.round(WIDTH * 0.625);
const OUT_WIDTH = Number(process.env.THEME_SWAP_SCALE || 720);
const QUALITY = Number(process.env.THEME_SWAP_QUALITY || 42);
const FPS = 10;
const OUT = process.argv[2] || path.join(process.cwd(), 'test-outputs', 'theme-swap.webp');

const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-swap-'));

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: WIDTH, height: HEIGHT },
		deviceScaleFactor: 1,
		colorScheme: 'dark',
		reducedMotion: 'no-preference'
	});
	const page = await context.newPage();
	await page.goto(URL_, { waitUntil: 'networkidle', timeout: 45000 });
	await page.waitForTimeout(1500);

	let frame = 0;
	const shoot = async () => {
		await page.screenshot({
			path: path.join(frameDir, `f${String(frame).padStart(4, '0')}.png`)
		});
		frame += 1;
	};

	/** Hold on the current state for `ms`, grabbing frames at FPS. */
	const hold = async (ms) => {
		const frames = Math.max(1, Math.round((ms / 1000) * FPS));
		for (let i = 0; i < frames; i += 1) {
			await shoot();
			await page.waitForTimeout(1000 / FPS);
		}
	};

	// The corner control cycles light → dark → system, and the icon shows the
	// state it will move to rather than the state it is in.
	const cycleTheme = () => page.locator('[aria-label="Toggle theme"]').first().click();

	await hold(900); // dark, at rest
	await cycleTheme(); // → light
	await hold(2000); // the swap, and the light page settling
	await cycleTheme(); // → dark
	await hold(2000); // and back
	await hold(500);

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
	console.log(`Wrote ${OUT} — ${frame} frames, ${OUT_WIDTH}px wide, ${kb} KB`);
	if (Number(kb) > 95) {
		console.log('Over the ~100KB single-PUT ceiling for R2. Lower THEME_SWAP_QUALITY or SCALE.');
	}
}

main().catch((err) => {
	fs.rmSync(frameDir, { recursive: true, force: true });
	console.error(err);
	process.exit(1);
});
