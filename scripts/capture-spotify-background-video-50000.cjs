/*
 * Capture Spotify Background Video: 50,000 (9:16)
 *
 * Records a vertical video from the hidden song-specific route.
 * The crow starts at center, then traces a full-viewport vertical infinity path.
 * ASCII characters are highlighted by the crow position because the route fires
 * synthetic mousemove events on every animation frame via onPositionTick.
 * The clip is a frame-perfect loop over one 7.7s infinity cycle.
 *
 * Usage:
 *   node scripts/capture-spotify-background-video-50000.cjs
 *
 * Optional env vars:
 *   SPOTIFY_BG_VIDEO_50000_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WIDTH = 1080;
const HEIGHT = 1920;
const ROUTE_PATH = '/hidden/spotify-background-video/50000';
const VIDEO_DIR = path.join(process.cwd(), 'test-outputs');
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'spotify-background-vertical-50000.mp4');

// One full infinity cycle is 7700 ms for a perfect loop.
const FLIGHT_LEG_MS = 3850;
const INITIAL_STABILIZE_MS = 1400;
const LOOP_DURATION_SECONDS = (FLIGHT_LEG_MS * 2) / 1000; // 7.7

function candidateUrls() {
	if (process.env.SPOTIFY_BG_VIDEO_50000_URL) {
		return [process.env.SPOTIFY_BG_VIDEO_50000_URL];
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

function runFfmpeg(inputPath, outputPath, outputStartSeconds) {
	const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
	const ffArgs = [
		'-y',
		'-ss',
		String(outputStartSeconds.toFixed(3)),
		'-i',
		inputPath,
		'-t',
		String(LOOP_DURATION_SECONDS),
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
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`ffmpeg exited with code ${result.status}`);
}

(async () => {
	if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

	const browser = await chromium.launch({ headless: true });
	let context;
	let page;

	try {
		// Phase 1 - preload without recording so Svelte hydrates and the crow
		// component is fully mounted before we start the recording pass.
		const preloadOpened = await openFirstReachablePage(browser, candidateUrls(), false);
		if (!preloadOpened) {
			throw new Error(
				`Unable to open route ${ROUTE_PATH} on localhost:4220/4242/4243. ` +
				'Set SPOTIFY_BG_VIDEO_50000_URL if your dev server uses a different host/port.'
			);
		}

		console.log(`Loading from: ${preloadOpened.url}`);
		await preloadOpened.page.waitForTimeout(INITIAL_STABILIZE_MS);
		const recordingUrl = preloadOpened.url;
		await preloadOpened.context.close();

		// Phase 2 - reopen with Playwright video recording active.
		// recordingStartMs must be captured BEFORE context creation because
		// Playwright starts the WebM recorder when the context is created, not
		// when page.goto() resolves. If we measure after goto(), the WebM
		// already has 1-2s of frames, making clipStartSeconds seek too early
		// and the 7.7s trim window ends before the loop completes.
		const recordingStartMs = Date.now();
		const opened = await openFirstReachablePage(browser, [recordingUrl], true);
		if (!opened) throw new Error('Failed to reopen page for recording');

		({ context, page } = opened);
		console.log(`Recording from: ${opened.url}`);

		// Wait until the page confirms crow-loop wiring is ready.
		await page.waitForFunction(() => window.__crowLoopReady50000 === true, null, {
			timeout: 10000
		});

		// Fire the start event; the first rAF callback sets both
		// __crowLoopStarted50000 and __crowLoopStartWallMs50000 = Date.now()
		// from inside the browser — same system clock as Node.js Date.now().
		await page.evaluate(() => {
			document.dispatchEvent(new CustomEvent('start-crow-loop'));
		});
		await page.waitForFunction(() => window.__crowLoopStarted50000 === true, null, {
			timeout: 5000
		});

		// Read the wall-clock timestamp set by the first animation frame.
		// This avoids polling lag: the browser recorded the exact ms when
		// t=0 occurred, so clipStartSeconds is accurate to ~1ms.
		const loopStartWallMs = await page.evaluate(() => window.__crowLoopStartWallMs50000);
		const clipStartSeconds = (loopStartWallMs - recordingStartMs) / 1000;

		// Wait for one full cycle plus a generous buffer so the crow fully
		// returns to center before ffmpeg trims. The 400ms buffer was too tight
		// (recording overhead consumed it), leaving the clip ~70ms short of the
		// loop completion. 2000ms ensures the full 7.7s cycle is always present.
		await page.waitForTimeout(FLIGHT_LEG_MS * 2 + 2000);
		await context.close();

		const video = page.video();
		if (!video) throw new Error('No Playwright video object available.');

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
