/*
 * Capture Spotify Background Video (9:16)
 *
 * Records a vertical video from the hidden route while moving the mouse
 * across the ASCII grid to trigger hover animation, then transcodes the
 * recording to MP4.
 *
 * Usage:
 *   node scripts/capture-spotify-background-video.cjs
 *
 * Optional env vars:
 *   SPOTIFY_BG_VIDEO_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WIDTH = 1080;
const HEIGHT = 1920;
const ROUTE_PATH = '/hidden/spotify-background-video';
const VIDEO_DIR = path.join(process.cwd(), 'test-outputs');
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'spotify-background-vertical.mp4');
const INITIAL_STABILIZE_MS = 350;
const PRE_ROLL_MS = 2650;
const MOVE_DURATION_MS = 4000;
const SETTLE_MS = 500;
const OUTPUT_START_SECONDS = 3;
const OUTPUT_DURATION_SECONDS = 7;

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function easeInOutSine(t) {
	return -(Math.cos(Math.PI * t) - 1) / 2;
}

function candidateUrls() {
	if (process.env.SPOTIFY_BG_VIDEO_URL) {
		return [process.env.SPOTIFY_BG_VIDEO_URL];
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
	const totalPasses = yBands.length * 2 - 1;
	const passDurationMs = Math.max(220, Math.round(MOVE_DURATION_MS / totalPasses));

	let currentX = leftX;
	let currentY = Math.round(HEIGHT * yBands[0]);
	await page.mouse.move(currentX, currentY);
	await page.waitForTimeout(60);

	for (let i = 0; i < yBands.length; i += 1) {
		const targetY = Math.round(HEIGHT * yBands[i]);
		const rowDirectionIsRight = i % 2 === 0;
		const rowTargetX = rowDirectionIsRight ? rightX : leftX;
		const rowSteps = 120;
		const rowDelay = Math.max(4, Math.round(passDurationMs / rowSteps));

		if (i > 0) {
			const dropSteps = 24;
			for (let step = 1; step <= dropSteps; step += 1) {
				const t = step / dropSteps;
				const eased = easeInOutSine(t);
				const y = clamp(Math.round(currentY + (targetY - currentY) * eased), 0, HEIGHT - 1);
				await page.mouse.move(currentX, y, { steps: 2 });
				await page.waitForTimeout(6);
			}
			currentY = targetY;
		}

		for (let step = 1; step <= rowSteps; step += 1) {
			const t = step / rowSteps;
			const eased = easeInOutSine(t);
			const wobbleY = Math.sin((i + 1) * 0.8 + t * Math.PI * 6) * 4;
			const x = clamp(Math.round(currentX + (rowTargetX - currentX) * eased), 0, WIDTH - 1);
			const y = clamp(Math.round(targetY + wobbleY), 0, HEIGHT - 1);
			await page.mouse.move(x, y, { steps: 2 });
			await page.waitForTimeout(rowDelay);
		}

		currentX = rowTargetX;
		currentY = targetY;
	}
}

function transcodeToMp4(sourcePath, targetPath) {
	const ffmpegResult = spawnSync(
		'ffmpeg',
		[
			'-y',
			'-i',
			sourcePath,
			'-ss',
			String(OUTPUT_START_SECONDS),
			'-t',
			String(OUTPUT_DURATION_SECONDS),
			'-c:v',
			'libx264',
			'-preset',
			'slow',
			'-crf',
			'18',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			targetPath
		],
		{ encoding: 'utf8' }
	);

	if (ffmpegResult.error && ffmpegResult.error.code === 'ENOENT') {
		throw new Error('ffmpeg is required to create MP4 output but was not found in PATH.');
	}

	if (ffmpegResult.status !== 0) {
		const details = (ffmpegResult.stderr || ffmpegResult.stdout || '').trim();
		throw new Error(`ffmpeg failed while creating MP4. ${details}`.trim());
	}
}

async function main() {
	fs.mkdirSync(VIDEO_DIR, { recursive: true });
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

	const browser = await chromium.launch({ headless: true });
	const target = await openFirstReachablePage(browser, candidateUrls());

	if (!target) {
		await browser.close();
		throw new Error(
			'Could not reach hidden 9:16 background route on localhost:4220, localhost:4242, or localhost:4243.'
		);
	}

	const { url, page, context } = target;

	await page.addStyleTag({
		content: 'html,body{margin:0;padding:0;overflow:hidden;cursor:none;}'
	});

	await page.waitForTimeout(INITIAL_STABILIZE_MS);
	await page.waitForTimeout(PRE_ROLL_MS);
	await hoverAnimationPath(page);
	await page.waitForTimeout(SETTLE_MS);

	const video = page.video();
	await context.close();
	await browser.close();

	if (!video) {
		throw new Error('No video was recorded by Playwright.');
	}

	const recordedPath = await video.path();
	transcodeToMp4(recordedPath, OUTPUT_PATH);

	process.stdout.write(`Created ${OUTPUT_PATH} from ${url}\n`);
}

main().catch((err) => {
	process.stderr.write(String(err?.message || err) + '\n');
	process.exit(1);
});
