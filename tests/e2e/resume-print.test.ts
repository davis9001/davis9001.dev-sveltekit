import { expect, test, type Page } from '@playwright/test';

/**
 * The /resume page must print to exactly one page — forever, whatever the
 * content becomes. The page solves for a type scale that fills a single sheet;
 * these tests print a real PDF and count the pages in it, so a regression in
 * the fit logic (or content that simply cannot be squeezed) fails CI rather
 * than surprising someone at a printer.
 */

/** Count `/Type /Page` objects — `/Pages` (the tree node) is excluded. */
function pdfPageCount(pdf: Buffer): number {
	return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

async function printedPages(page: Page): Promise<number> {
	const pdf = await page.pdf({ width: '8.5in', height: '11in', printBackground: true });
	return pdfPageCount(pdf);
}

async function gotoResume(page: Page, query = '?light') {
	await page.goto(`/resume${query}`);
	// The fit runs on mount and publishes its verdict on the sheet.
	await expect(page.locator('.resume-sheet')).toHaveAttribute('data-fit-fits', 'true');
}

test.describe('/resume prints to one page', () => {
	test('as authored, in light and dark', async ({ page }) => {
		await gotoResume(page, '?light');
		expect(await printedPages(page)).toBe(1);

		await gotoResume(page, '?dark');
		expect(await printedPages(page)).toBe(1);
	});

	test('the sheet fills the page without overflowing it', async ({ page }) => {
		await gotoResume(page);

		const { height, width } = await page.locator('.resume-sheet').evaluate((el) => ({
			height: el.getBoundingClientRect().height,
			width: el.getBoundingClientRect().width
		}));

		expect(width).toBeCloseTo(8.5 * 96, 0);
		expect(height).toBeLessThanOrEqual(11 * 96);
		// Not just "fits" — actually uses the page. Catches a fit that silently
		// collapsed to the minimum scale.
		expect(height).toBeGreaterThan(9 * 96);
	});

	test('the solved scale does not depend on the viewport it was solved in', async ({ page }) => {
		const solveAt = async (width: number, height: number) => {
			await page.setViewportSize({ width, height });
			await gotoResume(page);
			return {
				scale: Number(await page.locator('.resume-sheet').getAttribute('data-fit-scale')),
				pages: await printedPages(page)
			};
		};

		const desktop = await solveAt(1440, 900);
		const phone = await solveAt(390, 844);

		expect(phone.pages).toBe(1);
		expect(desktop.pages).toBe(1);
		// Not bit-identical: a cold glyph-fallback cache shifts a line box by a
		// pixel or two between loads. Anything larger means the sheet has started
		// inheriting viewport-dependent sizing again (rem, or the responsive root
		// font-size), which is what makes on-screen measurements lie about print.
		expect(phone.scale).toBeCloseTo(desktop.scale, 2);
	});

	test('re-fits when content is added, and still prints one page', async ({ page }) => {
		await gotoResume(page);
		const sheet = page.locator('.resume-sheet');
		const before = Number(await sheet.getAttribute('data-fit-scale'));

		// Duplicate the first job four times — a plausible "I added more work
		// history" edit, done through the DOM so the MutationObserver drives it.
		await sheet.evaluate((el) => {
			const section = [...el.querySelectorAll('.r-section')].find((s) =>
				s.querySelector('.r-title')?.textContent?.includes('Experience')
			);
			const template = section?.querySelector('.r-job');
			if (!section || !template) throw new Error('Experience section not found');
			for (let i = 0; i < 4; i++) section.appendChild(template.cloneNode(true));
		});
		await expect
			.poll(async () => Number(await sheet.getAttribute('data-fit-scale')))
			.toBeLessThan(before);

		await expect(sheet).toHaveAttribute('data-fit-fits', 'true');
		expect(await printedPages(page)).toBe(1);
	});

	test('grows the type when the content is short', async ({ page }) => {
		await gotoResume(page);
		const sheet = page.locator('.resume-sheet');
		const before = Number(await sheet.getAttribute('data-fit-scale'));

		await sheet.evaluate((el) => {
			el.querySelectorAll('.r-job').forEach((job, i) => i > 0 && job.remove());
			el.querySelectorAll('.r-pcard').forEach((card, i) => i > 1 && card.remove());
		});
		await expect
			.poll(async () => Number(await sheet.getAttribute('data-fit-scale')))
			.toBeGreaterThan(before);

		expect(await printedPages(page)).toBe(1);
	});
});
