/*
 * Capture Spotify Background Video: answer-5-is-the-big-bang-theory-accurate (9:16)
 *
 * Usage:
 *   node scripts/capture-spotify-background-video-answer-5-is-the-big-bang-theory-accurate.cjs
 *
 * Optional env vars:
 *   SPOTIFY_BG_VIDEO_ANSWER5_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WIDTH = 1080;
const HEIGHT = 1920;
const ROUTE_PATH = '/hidden/spotify-background-video/answer-5-is-the-big-bang-theory-accurate';
const VIDEO_DIR = path.join(process.cwd(), 'test-outputs');
const OUTPUT_PATH = path.join(
	process.cwd(),
	'static',
	'spotify-background-vertical-answer-5-is-the-big-bang-theory-accurate.mp4'
);

const FLIGHT_LEG_MS = 3850;
const INITIAL_STABILIZE_MS = 1400;
const LOOP_DURATION_SECONDS = (FLIGHT_LEG_MS * 2) / 1000;

function candidateUrls() {
	if (process.env.SPOTIFY_BG_VIDEO_ANSWER5_URL) {
		return [process.env.SPOTIFY_BG_VIDEO_ANSWER5_URL];
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
		const preloadOpened = await openFirstReachablePage(browser, candidateUrls(), false);
		if (!preloadOpened) {
			throw new Error(
				`Unable to open route ${ROUTE_PATH} on localhost:4220/4242/4243. ` +
				'Set SPOTIFY_BG_VIDEO_ANSWER5_URL if your dev server uses a different host/port.'
			);
		}

		console.log(`Loading from: ${preloadOpened.url}`);
		await preloadOpened.page.waitForTimeout(INITIAL_STABILIZE_MS);
		const recordingUrl = preloadOpened.url;
		await preloadOpened.context.close();

		const recordingStartMs = Date.now();
		const opened = await openFirstReachablePage(browser, [recordingUrl], true);
		if (!opened) throw new Error('Failed to reopen page for recording');

		({ context, page } = opened);
		console.log(`Recording from: ${opened.url}`);

		await page.waitForFunction(() => window.__crowLoopReadyAnswer5 === true, null, {
			timeout: 10000
		});

		await page.evaluate(() => {
			document.dispatchEvent(new CustomEvent('start-crow-loop'));
		});
		await page.waitForFunction(() => window.__crowLoopStartedAnswer5 === true, null, {
			timeout: 5000
		});

		const loopStartWallMs = await page.evaluate(() => window.__crowLoopStartWallMsAnswer5);
		const clipStartSeconds = (loopStartWallMs - recordingStartMs) / 1000;

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