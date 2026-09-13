/*
 * Capture an animated WebP of the mushroom-body circuit turning, from
 * fly.ammoura.me.
 *
 * The 3D view is orbited by dragging, so this drives a pointer through a smooth
 * arc across the canvas and grabs a frame at each step. Frames come one at a
 * time rather than through Playwright's video recorder, so the frame rate, the
 * length and the output size are all controllable.
 *
 * The circuit is WebGL over ~3.8MB of packed skeletons, so the launch flags
 * force software rendering and the load waits are generous — on a headless box
 * with no GPU an early screenshot catches an empty canvas.
 *
 * Usage:
 *   node scripts/capture-fly-circuit-webp.cjs [outFile]
 *
 * Env:
 *   FLY_URL            page to record (default: https://fly.ammoura.me/circuit)
 *   FLY_CIRCUIT_SEL    region to record (default: #brain, the full-bleed canvas)
 *   FLY_CIRCUIT_SCALE  output width in px (default 640)
 *   FLY_CIRCUIT_Q      libwebp quality 0-100 (default 30)
 *   FLY_CIRCUIT_FPS    frames per second (default 8)
 *   FLY_CIRCUIT_TURNS  full left-right sweeps to record (default 1)
 *   FLY_CIRCUIT_REACH  drag distance in px, i.e. how far it turns (default 150)
 *   FLY_CIRCUIT_ZOOM   wheel notches in before recording (default 0 — see note below)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const URL_ = process.env.FLY_URL || 'https://fly.ammoura.me/circuit';
const SELECTOR = process.env.FLY_CIRCUIT_SEL || '#brain';
const OUT_WIDTH = Number(process.env.FLY_CIRCUIT_SCALE || 640);
const QUALITY = Number(process.env.FLY_CIRCUIT_Q || 30);
const FPS = Number(process.env.FLY_CIRCUIT_FPS || 8);
const TURNS = Number(process.env.FLY_CIRCUIT_TURNS || 1);
const FRAMES = Math.round(72 * TURNS);
const OUT = process.argv[2] || path.join(process.cwd(), 'test-outputs', 'fly-circuit.webp');

const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fly-circuit-'));

/** One full there-and-back sweep, easing at both ends so it reads as a turn. */
function orbitAt(t) {
	const angle = Math.sin(t * Math.PI * 2);
	const tilt = Math.sin(t * Math.PI * 4) * 0.25;
	return { dx: angle, dy: tilt };
}

async function main() {
	const browser = await chromium.launch({
		args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
	});
	const page = await browser.newPage({
		viewport: {
			width: Number(process.env.FLY_CIRCUIT_VW || 1280),
			height: Number(process.env.FLY_CIRCUIT_VH || 680)
		},
		deviceScaleFactor: 1
	});
	await page.goto(URL_, { waitUntil: 'networkidle', timeout: 120000 });
	await page.waitForTimeout(9000);

	const stage = page.locator(SELECTOR).first();
	if ((await stage.count()) === 0) throw new Error(`no element matching ${SELECTOR}`);
	await stage.scrollIntoViewIfNeeded();
	await page.waitForTimeout(2500);

	const canvas = page.locator('#brain');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('no #brain canvas');
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	// A short sweep keeps the circuit near the three-quarter view where its
	// shape reads; a long one spends most of its frames edge-on.
	const REACH = Number(process.env.FLY_CIRCUIT_REACH || 150);

	// Optional wheel-zoom before the orbit. Off by default: synthetic wheel
	// events produced no visible change in the recorded frames, so the capture
	// uses the page's own default framing rather than pretending to zoom.
	const ZOOM = Number(process.env.FLY_CIRCUIT_ZOOM || 0);
	await page.mouse.move(cx, cy);
	for (let i = 0; i < ZOOM; i += 1) {
		await page.mouse.wheel(0, -240);
		await page.waitForTimeout(220);
	}
	await page.waitForTimeout(1200);

	await page.mouse.move(cx, cy);
	await page.mouse.down();

	for (let i = 0; i < FRAMES; i += 1) {
		const { dx, dy } = orbitAt(i / FRAMES);
		await page.mouse.move(cx + dx * REACH, cy + dy * REACH);
		await stage.screenshot({
			path: path.join(frameDir, `f${String(i).padStart(4, '0')}.png`)
		});
	}

	await page.mouse.up();
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
	console.log(`Wrote ${OUT} — ${FRAMES} frames, ${OUT_WIDTH}px wide, ${kb} KB`);
	if (Number(kb) > 400) {
		console.log('Large for an inline animation. Lower FLY_CIRCUIT_Q or FLY_CIRCUIT_SCALE.');
	}
}

main().catch((err) => {
	fs.rmSync(frameDir, { recursive: true, force: true });
	console.error(err);
	process.exit(1);
});
