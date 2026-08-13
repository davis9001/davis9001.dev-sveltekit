/*
 * Capture Open Graph Cover
 *
 * Renders the hidden route at exact OG dimensions (1200x630) and writes the
 * result to static/cover.png — the share image SEO.svelte points every crawler
 * at (Discord, Slack, X, iMessage, ...).
 *
 * Usage:
 *   node scripts/capture-og-cover.cjs
 *
 * Optional env vars:
 *   OG_COVER_URL  Full URL to route (default tries localhost ports)
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;
// ?dark forces the site's dark theme regardless of the headless browser's
// colour-scheme preference — the same override /resume uses for PDF printing.
const ROUTE_PATH = '/hidden/og-cover?dark';
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'cover.png');

function candidateUrls() {
	if (process.env.OG_COVER_URL) {
		return [process.env.OG_COVER_URL];
	}
	return [
		`http://localhost:4242${ROUTE_PATH}`,
		`http://localhost:4243${ROUTE_PATH}`,
		`http://localhost:4220${ROUTE_PATH}`
	];
}

async function ensureReachable(browser, urls) {
	for (const url of urls) {
		const page = await browser.newPage({
			viewport: { width: WIDTH, height: HEIGHT },
			deviceScaleFactor: 1
		});
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
		throw new Error(
			'Could not reach hidden og-cover route on localhost:4242, localhost:4243, or localhost:4220. Start the dev server with `bun run dev` first.'
		);
	}

	const { url, page } = target;

	await page.addStyleTag({
		content: 'html,body{margin:0;padding:0;overflow:hidden;}'
	});

	// The route flips data-og-ready once fonts, layout and the perching crow
	// have all settled.
	await page.waitForSelector('[data-og-ready="true"]', { timeout: 20000 });
	// Photo and logo must be decoded before the shutter.
	await page.waitForFunction(
		() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
		null,
		{ timeout: 10000 }
	);
	await page.waitForTimeout(400);

	// Vite paints compile errors as a full-page overlay. Without this guard a
	// mid-edit HMR failure gets screenshotted straight into the committed asset.
	const overlay = await page.evaluate(() => {
		const el = document.querySelector('vite-error-overlay');
		return el ? el.shadowRoot?.querySelector('.message')?.textContent?.trim() || 'unknown' : null;
	});
	if (overlay) {
		await browser.close();
		throw new Error(`Dev server is showing a Vite error overlay, refusing to capture:\n${overlay}`);
	}

	const raw = await page.screenshot({ type: 'png' });
	await browser.close();

	// A straight screenshot of the ASCII field lands around 800KB. Palette
	// quantising takes it under 250KB with no visible loss, which matters for a
	// file every link unfurl fetches.
	const optimised = await sharp(raw)
		.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
		.toBuffer();
	fs.writeFileSync(OUTPUT_PATH, optimised);

	const kb = Math.round(optimised.length / 1024);
	process.stdout.write(`Created ${OUTPUT_PATH} (${WIDTH}x${HEIGHT}, ${kb}KB) from ${url}\n`);
}

main().catch((err) => {
	process.stderr.write(String(err?.message || err) + '\n');
	process.exit(1);
});
