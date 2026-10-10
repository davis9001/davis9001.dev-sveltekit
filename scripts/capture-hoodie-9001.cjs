/*
 * Screenshots for the blog post about the $9001 one-of-one davis9001 hoodie.
 *
 * Captures, from the live shop (or SHOP_URL), headless:
 *   product-{light,dark}.png   the random davis9001 hoodie's page, top
 *   grid-{light,dark}.png      the shop grid, top
 *   three-dark.png             three design codes side by side, on black
 *   two-grounds.png            one layout on both grounds (one bit of the code)
 *   checkout-{light,dark}.png  checkout with the coupon field, hoodie in the bag
 *
 * Usage:  node scripts/capture-hoodie-9001.cjs <outDir>
 * Env:    SHOP_URL (default https://davis9001.com/shop)
 */

const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const SHOP = (process.env.SHOP_URL || 'https://davis9001.com/shop').replace(/\/$/, '');
const OUT = process.argv[2];
if (!OUT) throw new Error('outDir required');
fs.mkdirSync(OUT, { recursive: true });

// Fixed codes so the pictures are reproducible. Crockford base32, 8 chars.
// The last character's lowest bit is the ground: even = dark, odd = light.
const THREE = ['K7X2QF9M', 'B3NDW8TC', 'Z5HQ4YR0'];
const PAIR = ['M9GT2VXA', 'M9GT2VXB']; // same layout, dark then light

async function ctx(browser, scheme, width = 1280, height = 900) {
	const c = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor: 1,
		colorScheme: scheme,
		reducedMotion: 'reduce'
	});
	await c.addInitScript((s) => localStorage.setItem('theme-preference', s), scheme);
	return c;
}

async function settle(page) {
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(800);
}

async function main() {
	const browser = await chromium.launch();

	for (const scheme of ['light', 'dark']) {
		const c = await ctx(browser, scheme);
		const page = await c.newPage();

		await page.goto(`${SHOP}/davis9001?design=${THREE[0]}`);
		await settle(page);
		await page.waitForSelector('.design .code');
		await page.screenshot({ path: path.join(OUT, `product-${scheme}.png`) });

		await page.goto(SHOP);
		await settle(page);
		await page.screenshot({ path: path.join(OUT, `grid-${scheme}.png`) });

		// Checkout: add the hoodie to the bag through the page, then open checkout.
		await page.goto(`${SHOP}/davis9001?design=${THREE[0]}`);
		await settle(page);
		await page.locator('.buy fieldset label', { hasText: /^\s*L\s*$/ }).click();
		const add = page.locator('.buy .button');
		await add.click();
		await page.waitForTimeout(600);
		await page.goto(`${SHOP}/checkout`);
		await settle(page);
		await page.waitForTimeout(1500);
		await page.screenshot({ path: path.join(OUT, `checkout-${scheme}.png`), fullPage: false });

		await c.close();
	}

	// Three designs, dark ground: just the front preview of each.
	{
		const c = await ctx(browser, 'dark', 900, 900);
		const page = await c.newPage();
		let i = 0;
		for (const code of THREE) {
			await page.goto(`${SHOP}/davis9001?design=${code}`);
			await settle(page);
			const el = page.locator('.preview').first();
			await el.waitFor();
			await page.waitForTimeout(700);
			await el.screenshot({ path: path.join(OUT, `three-${i++}.png`) });
		}
		i = 0;
		for (const code of PAIR) {
			await page.goto(`${SHOP}/davis9001?design=${code}`);
			await settle(page);
			const el = page.locator('.preview').first();
			await el.waitFor();
			await page.waitForTimeout(700);
			await el.screenshot({ path: path.join(OUT, `pair-${i++}.png`) });
		}
		await c.close();
	}

	await browser.close();
	console.log('done', OUT);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
