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

	await page.waitForTimeout(700);
	await page.screenshot({ path: OUTPUT_PATH, type: 'png' });
	await browser.close();

	const message = `Created ${OUTPUT_PATH} from ${url}`;
	process.stdout.write(message + '\n');
}

main().catch((err) => {
	process.stderr.write(String(err?.message || err) + '\n');
	process.exit(1);
});
