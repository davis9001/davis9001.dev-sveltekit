/*
 * Capture Spotify Background Video V2 (9:16)
 *
 * Records a vertical video from the hidden v2 route while moving the mouse
 * across the ASCII grid to trigger hover animation, then transcodes the
 * recording to MP4.
 *
 * Usage:
 *   node scripts/capture-spotify-background-video-v2.cjs
 *
 * Optional env vars:
 *   SPOTIFY_BG_VIDEO_V2_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WIDTH = 1080;
const HEIGHT = 1920;
const ROUTE_PATH = '/hidden/spotify-background-video-v2';
const VIDEO_DIR = path.join(process.cwd(), 'test-outputs');
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'spotify-background-vertical-v2.mp4');
const INITIAL_STABILIZE_MS = 350;
const PRE_ROLL_MS = 3500;
const MOVE_DURATION_MS = 4000;
const SETTLE_MS = 500;
const OUTPUT_START_SECONDS = 2.8;
const OUTPUT_DURATION_SECONDS = 7;

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function easeInOutSine(t) {
	return -(Math.cos(Math.PI * t) - 1) / 2;
}

function candidateUrls() {
	if (process.env.SPOTIFY_BG_VIDEO_V2_URL) {
		return [process.env.SPOTIFY_BG_VIDEO_V2_URL];
	}

	return [
		`http://localhost:4220${ROUTE_PATH}`,
		`http://localhost:4242${ROUTE_PATH}`,
		`http://localhost:4243${ROUTE_PATH}`
	];
}

async function openFirstReachablePage(browser, urls) {
	for (const url of urls) {
		const context = await browser.newContext({
			viewport: { width: WIDTH, height: HEIGHT },
			deviceScaleFactor: 1,
			recordVideo: {
				dir: VIDEO_DIR,
				size: { width: WIDTH, height: HEIGHT }
			}
		});

		const page = await context.newPage();
		try {
			const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
			if (response && response.ok()) {
				return { url, page, context };
			}
			await context.close();
		} catch {
			await context.close();
		}
	}

	return null;
}

async function hoverAnimationPath(page) {
	const yBands = [0.16, 0.26, 0.36, 0.47, 0.58, 0.69, 0.8, 0.9];
	const leftX = Math.round(WIDTH * 0.08);
	const rightX = Math.round(WIDTH * 0.92);

	await page.mouse.move(leftX, Math.round(HEIGHT * yBands[0]));
	await page.mouse.down();

	const frames = Math.max(120, Math.round((MOVE_DURATION_MS / 1000) * 60));
	for (let frame = 0; frame <= frames; frame += 1) {
		const t = frame / frames;
		const laneIndex = Math.min(
			yBands.length - 2,
			Math.floor(t * (yBands.length - 1))
		);
		const laneStart = yBands[laneIndex];
		const laneEnd = yBands[laneIndex + 1];
		const laneT = t * (yBands.length - 1) - laneIndex;
		const easedLaneT = easeInOutSine(laneT);

		const xBase = laneIndex % 2 === 0 ? leftX : rightX;
		const xTarget = laneIndex % 2 === 0 ? rightX : leftX;
		const x = Math.round(xBase + (xTarget - xBase) * easedLaneT);
		const y = Math.round(HEIGHT * (laneStart + (laneEnd - laneStart) * easedLaneT));
		const clampedX = clamp(x, 2, WIDTH - 2);
		const clampedY = clamp(y, 2, HEIGHT - 2);

		await page.mouse.move(clampedX, clampedY);
		await page.waitForTimeout(16);
	}

	await page.mouse.up();
}

function runFfmpeg(inputPath, outputPath) {
	const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
	const ffArgs = [
		'-y',
		'-ss',
		`${OUTPUT_START_SECONDS}`,
		'-i',
		inputPath,
		'-t',
		`${OUTPUT_DURATION_SECONDS}`,
		'-an',
		'-vf',
		`fps=30,scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		outputPath
	];

	const result = spawnSync(ffmpegPath, ffArgs, { stdio: 'inherit' });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`ffmpeg exited with code ${result.status}`);
	}
}

(async () => {
	if (!fs.existsSync(VIDEO_DIR)) {
		fs.mkdirSync(VIDEO_DIR, { recursive: true });
	}

	const browser = await chromium.launch({ headless: true });
	let context;
	let page;

	try {
		const opened = await openFirstReachablePage(browser, candidateUrls());
		if (!opened) {
			throw new Error(
				`Unable to open route ${ROUTE_PATH} on localhost:4220/4242/4243. ` +
				'Set SPOTIFY_BG_VIDEO_V2_URL if your dev server uses a different host/port.'
			);
		}

		({ context, page } = opened);
		console.log(`Recording from: ${opened.url}`);

		await page.waitForTimeout(INITIAL_STABILIZE_MS);
		await page.waitForTimeout(PRE_ROLL_MS);
		await hoverAnimationPath(page);
		await page.waitForTimeout(SETTLE_MS);

		await context.close();

		const video = page.video();
		if (!video) {
			throw new Error('No Playwright video object available.');
		}

		const rawPath = await video.path();
		if (!rawPath || !fs.existsSync(rawPath)) {
			throw new Error(`Recorded video file not found at ${rawPath}`);
		}

		runFfmpeg(rawPath, OUTPUT_PATH);
		console.log(`Wrote ${OUTPUT_PATH}`);
	} finally {
		if (context) {
			try {
				await context.close();
			} catch {
				// ignore close errors in cleanup
			}
		}
		await browser.close();
	}
})().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
