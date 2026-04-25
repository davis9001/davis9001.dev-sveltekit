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
const INITIAL_STABILIZE_MS = 1200;
const PRE_ROLL_MS = 6000;
const MOVE_DURATION_MS = 8500;
const SETTLE_MS = 100;
const OUTPUT_DURATION_SECONDS = 7.99;

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

async function openFirstReachablePage(browser, urls, enableRecording = false) {
	for (const url of urls) {
		const contextOptions = {
			viewport: { width: WIDTH, height: HEIGHT },
			deviceScaleFactor: 1
		};

		if (enableRecording) {
			contextOptions.recordVideo = {
				dir: VIDEO_DIR,
				size: { width: WIDTH, height: HEIGHT }
			};
		}

		const context = await browser.newContext(contextOptions);
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

async function drawShapeWithMouse(page) {
	// Draw a sideways infinity sign with its intersection on the bird perch.
	const centerX = WIDTH * 0.48;
	const centerY = HEIGHT * 0.45;
	const radiusX = WIDTH * 0.24;
	const radiusY = HEIGHT * 0.11;
	const numPoints = 320;

	// Start exactly at the intersection point (bird center).
	const startX = Math.round(centerX);
	const startY = Math.round(centerY);
	await page.mouse.move(startX, startY);
	await page.waitForTimeout(20);
	await page.mouse.down();

	const drawStartMs = Date.now();
	while (true) {
		const elapsedMs = Date.now() - drawStartMs;
		const progress = clamp(elapsedMs / MOVE_DURATION_MS, 0, 1);
		const easedProgress = easeInOutSine(progress);
		// Lemniscate of Gerono (sideways infinity): x = sin(t), y = sin(t)*cos(t)
		const t = easedProgress * 2 * Math.PI;
		const x = Math.round(centerX + radiusX * Math.sin(t));
		const y = Math.round(centerY + radiusY * Math.sin(t) * Math.cos(t));
		await page.mouse.move(x, y);
		if (progress >= 1) break;
		await page.waitForTimeout(8);
	}

	// Close the gesture exactly on the center intersection point.
	await page.mouse.move(Math.round(centerX), Math.round(centerY));
	await page.mouse.up();
}

function runFfmpeg(inputPath, outputPath, outputStartSeconds) {
	const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
	const ffArgs = [
		'-y',
		'-ss',
		`${outputStartSeconds.toFixed(3)}`,
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
		// First, load and stabilize the page without recording
		const preloadOpened = await openFirstReachablePage(browser, candidateUrls(), false);
		if (!preloadOpened) {
			throw new Error(
				`Unable to open route ${ROUTE_PATH} on localhost:4220/4242/4243. ` +
				'Set SPOTIFY_BG_VIDEO_V2_URL if your dev server uses a different host/port.'
			);
		}

		console.log(`Loading from: ${preloadOpened.url}`);
		// Wait for the page to fully stabilize before recording
		await preloadOpened.page.waitForTimeout(INITIAL_STABILIZE_MS);
		await preloadOpened.page.waitForTimeout(PRE_ROLL_MS);
		const recordingUrl = preloadOpened.url;
		await preloadOpened.context.close();

		// Now create a fresh context with recording enabled and redraw
		const opened = await openFirstReachablePage(browser, [recordingUrl], true);
		if (!opened) {
			throw new Error('Failed to reopen page for recording');
		}

		({ context, page } = opened);
		console.log(`Recording from: ${opened.url}`);
		const recordingStartMs = Date.now();

		// Page should load quickly since browser cache is warm
		await page.waitForTimeout(INITIAL_STABILIZE_MS);
		const clipStartSeconds = (Date.now() - recordingStartMs) / 1000;
		await drawShapeWithMouse(page);
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

		runFfmpeg(rawPath, OUTPUT_PATH, clipStartSeconds);
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
