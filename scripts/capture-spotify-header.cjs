/*
 * Capture Spotify Header Screenshot
 *
 * Captures the hidden route at exact Spotify dimensions (2660x1140)
 * and writes the result to static/spotify-header-davis9001.png.
 *
 * Usage:
 *   node scripts/capture-spotify-header.cjs
 *
 * Optional env vars:
 *   SPOTIFY_HEADER_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const path = require('path');

const WIDTH = 2660;
const HEIGHT = 1140;
const ROUTE_PATH = '/hidden/spotify-header';
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'spotify-header-davis9001.png');
const TOTAL_DRAW_MS = 9000;

const DRAW_PATH_POINTS = [
	{ x: 0.12, y: 0.62 },
	{ x: 0.23, y: 0.55 },
	{ x: 0.34, y: 0.58 },
	{ x: 0.45, y: 0.46 },
	{ x: 0.57, y: 0.49 },
	{ x: 0.69, y: 0.38 },
	{ x: 0.81, y: 0.43 },
	{ x: 0.89, y: 0.36 }
];

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function toViewportPoint(point) {
	return {
		x: Math.round(point.x * WIDTH),
		y: Math.round(point.y * HEIGHT)
	};
}

function easeInOutSine(t) {
	return -(Math.cos(Math.PI * t) - 1) / 2;
}

async function drawMousePath(page) {
	if (DRAW_PATH_POINTS.length < 2) return;

	const segments = [];
	let totalWeightedSteps = 0;
	for (let i = 1; i < DRAW_PATH_POINTS.length; i += 1) {
		const fromPx = toViewportPoint(DRAW_PATH_POINTS[i - 1]);
		const toPx = toViewportPoint(DRAW_PATH_POINTS[i]);
		const segmentDist = Math.hypot(toPx.x - fromPx.x, toPx.y - fromPx.y);
		const steps = Math.max(12, Math.round(segmentDist / 12));
		let segmentWeight = 0;
		for (let step = 1; step <= steps; step += 1) {
			const t = step / steps;
			const velocityPhase = Math.sin(t * Math.PI);
			segmentWeight += 0.45 + (1 - velocityPhase);
		}
		segments.push({ fromPx, toPx, steps, index: i, weight: segmentWeight });
		totalWeightedSteps += segmentWeight;
	}

	const delayScale = totalWeightedSteps > 0 ? TOTAL_DRAW_MS / totalWeightedSteps : 0;

	const first = toViewportPoint(DRAW_PATH_POINTS[0]);
	await page.mouse.move(first.x, first.y);
	await page.waitForTimeout(26);
	await page.mouse.down();

	for (const segment of segments) {
		const { fromPx, toPx, steps, index } = segment;
		for (let step = 1; step <= steps; step += 1) {
			const t = step / steps;
			const easedT = easeInOutSine(t);
			const rawX = fromPx.x + (toPx.x - fromPx.x) * easedT;
			const rawY = fromPx.y + (toPx.y - fromPx.y) * easedT;

			const phase = (index * 2.1 + t * Math.PI * 2);
			const jitterX = Math.sin(phase) * 1.7;
			const jitterY = Math.cos(phase * 0.85) * 1.35;
			const x = clamp(Math.round(rawX + jitterX), 0, WIDTH - 1);
			const y = clamp(Math.round(rawY + jitterY), 0, HEIGHT - 1);

			await page.mouse.move(x, y);

			const velocityPhase = Math.sin(t * Math.PI);
			const delayMs = Math.max(6, Math.round((0.45 + (1 - velocityPhase)) * delayScale));
			await page.waitForTimeout(delayMs);
		}
	}

	await page.mouse.up();
}

function candidateUrls() {
	if (process.env.SPOTIFY_HEADER_URL) {
		return [process.env.SPOTIFY_HEADER_URL];
	}
	return [
		`http://localhost:4220${ROUTE_PATH}`,
		`http://localhost:4242${ROUTE_PATH}`,
		`http://localhost:4243${ROUTE_PATH}`
	];
}

async function ensureReachable(browser, urls) {
	for (const url of urls) {
		const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
		try {
			const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
			if (res && res.ok()) {
				return { url, page };
			}
			await page.close();
		} catch {
			await page.close();
			// Try next URL.
		}
	}
	return null;
}

async function main() {
	const browser = await chromium.launch({ headless: true });
	const target = await ensureReachable(browser, candidateUrls());
	if (!target) {
		await browser.close();
		throw new Error('Could not reach hidden header route on localhost:4220, localhost:4242, or localhost:4243.');
	}

	const { url, page } = target;

	await page.addStyleTag({
		content: 'html,body{margin:0;padding:0;overflow:hidden;}'
	});

	await page.waitForTimeout(260);
	await drawMousePath(page);
	await page.waitForTimeout(300);
	await page.screenshot({ path: OUTPUT_PATH, type: 'png' });
	await browser.close();

	const message = `Created ${OUTPUT_PATH} from ${url}`;
	process.stdout.write(message + '\n');
}

main().catch((err) => {
	process.stderr.write(String(err?.message || err) + '\n');
	process.exit(1);
});
