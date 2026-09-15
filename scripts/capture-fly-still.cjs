/*
 * Capture a still WebP from fly.ammoura.me — the post's featured image (the
 * hero, with the fly and the ledger under it) and the results table.
 *
 * The animated captures have their own scripts because they drive the page;
 * this one only waits for it to settle and shoots. Two modes:
 *
 *   viewport  screenshot the top of the page at an exact size — how the
 *             featured image is framed, since the hero is a full-bleed layout
 *             rather than one element.
 *   element   screenshot one element, for the results table.
 *
 * Usage:
 *   node scripts/capture-fly-still.cjs [outFile]
 *
 * Env:
 *   FLY_URL           page to shoot (default: https://fly.ammoura.me/)
 *   FLY_STILL_SEL     element to shoot; unset shoots the viewport
 *   FLY_STILL_VW/VH   viewport size (default 1200x660)
 *   FLY_STILL_WAIT    ms to wait after load, for the run to start (default 9000)
 *   FLY_STILL_GEN     scrub to this generation before shooting (default: leave it running)
 *   FLY_STILL_Q       libwebp quality 0-100 (default 78)
 *   FLY_STILL_SCALE   output width in px (default: the capture's own width)
 *   FLY_STILL_HIDE    CSS selectors to hide, comma separated
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const URL_ = process.env.FLY_URL || 'https://fly.ammoura.me/';
const SELECTOR = process.env.FLY_STILL_SEL || '';
const VW = Number(process.env.FLY_STILL_VW || 1200);
const VH = Number(process.env.FLY_STILL_VH || 660);
const WAIT = Number(process.env.FLY_STILL_WAIT || 9000);
const QUALITY = Number(process.env.FLY_STILL_Q || 78);
const HIDE = (process.env.FLY_STILL_HIDE || '').split(',').filter(Boolean);
const SCALE = Number(process.env.FLY_STILL_SCALE || 0);
const OUT = process.argv[2] || path.join(process.cwd(), 'test-outputs', 'fly-still.webp');

async function main() {
	const browser = await chromium.launch({
		// The fly carries the circuit in its head; software GL keeps the WebGL
		// working on a headless box with no GPU.
		args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
	});
	const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
	await page.goto(URL_, { waitUntil: 'networkidle', timeout: 120000 });
	await page.waitForTimeout(WAIT);

	if (process.env.FLY_STILL_GEN) {
		await page.evaluate((gen) => {
			const play = document.getElementById('play');
			if (play && !/play/i.test(play.innerText)) play.click();
			const s = document.getElementById('scrub');
			if (s) {
				s.value = String(gen);
				s.dispatchEvent(new Event('input', { bubbles: true }));
			}
		}, process.env.FLY_STILL_GEN);
		await page.waitForTimeout(1500);
	}

	for (const sel of HIDE) {
		await page.evaluate((s) => {
			document.querySelectorAll(s).forEach((el) => {
				el.style.display = 'none';
			});
		}, sel);
	}

	const png = path.join(os.tmpdir(), `fly-still-${Date.now()}.png`);
	if (SELECTOR) {
		const el = page.locator(SELECTOR).first();
		if ((await el.count()) === 0) throw new Error(`no element matching ${SELECTOR}`);
		await el.scrollIntoViewIfNeeded();
		await page.waitForTimeout(800);
		await el.screenshot({ path: png });
	} else {
		await page.screenshot({ path: png });
	}
	await browser.close();

	const result = spawnSync(
		'ffmpeg',
		[
			'-y',
			'-i',
			png,
			...(SCALE ? ['-vf', `scale=${SCALE}:-2:flags=lanczos`] : []),
			'-c:v',
			'libwebp',
			'-lossless',
			'0',
			'-q:v',
			String(QUALITY),
			'-an',
			OUT
		],
		{ stdio: ['ignore', 'ignore', 'pipe'] }
	);
	if (result.status !== 0) {
		throw new Error(`ffmpeg failed: ${result.stderr?.toString().slice(-400)}`);
	}
	fs.rmSync(png, { force: true });

	const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
	console.log(`Wrote ${OUT} — ${kb} KB`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
