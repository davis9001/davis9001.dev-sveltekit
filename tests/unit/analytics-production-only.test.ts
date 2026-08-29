import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The Google Analytics tag in src/app.html must only run on the production
 * hostnames. Local dev, preview deploys and the dev tunnel must not report
 * page views. The dev tunnel is a subdomain of the production domain
 * (dev-<hash>.davis9001.dev), so the gate has to be an exact host match.
 */

const APP_HTML = readFileSync('src/app.html', 'utf-8');

/** Pull the inline analytics gate out of app.html so we can execute it. */
function extractAnalyticsScript(): string {
	const marker = '<!-- Google tag (gtag.js)';
	const markerIndex = APP_HTML.indexOf(marker);
	expect(markerIndex).toBeGreaterThan(-1);

	const openIndex = APP_HTML.indexOf('<script>', markerIndex);
	const closeIndex = APP_HTML.indexOf('</script>', openIndex);
	expect(openIndex).toBeGreaterThan(-1);
	expect(closeIndex).toBeGreaterThan(openIndex);

	return APP_HTML.slice(openIndex + '<script>'.length, closeIndex);
}

/** Run the gate against a hostname and report the scripts it appended. */
function runGate(hostname: string): { appendedSrcs: string[]; dataLayer: unknown[] } {
	const appendedSrcs: string[] = [];
	const fakeWindow: Record<string, unknown> = {};
	const fakeDocument = {
		createElement: () => ({ async: false, src: '' }) as { async: boolean; src: string },
		head: {
			appendChild: (node: { src: string }) => {
				appendedSrcs.push(node.src);
			}
		}
	};

	const run = new Function('window', 'document', 'location', extractAnalyticsScript());
	run(fakeWindow, fakeDocument, { hostname });

	return { appendedSrcs, dataLayer: (fakeWindow.dataLayer as unknown[]) ?? [] };
}

describe('Google Analytics hostname gate', () => {
	it('loads the tag on the apex production host', () => {
		const { appendedSrcs, dataLayer } = runGate('davis9001.dev');

		expect(appendedSrcs).toHaveLength(1);
		expect(appendedSrcs[0]).toContain('googletagmanager.com/gtag/js?id=G-');
		expect(dataLayer.length).toBeGreaterThan(0);
	});

	it('loads the tag on the www production host', () => {
		expect(runGate('www.davis9001.dev').appendedSrcs).toHaveLength(1);
	});

	it.each([
		['localhost', 'localhost'],
		['loopback address', '127.0.0.1'],
		['dev tunnel subdomain', 'dev-56cc8a52133d.davis9001.dev'],
		['Cloudflare Pages preview', 'abc123.davis9001-dev-sveltekit.pages.dev'],
		['lookalike domain', 'davis9001.dev.example.com']
	])('does not load the tag on %s', (_label, hostname) => {
		const { appendedSrcs, dataLayer } = runGate(hostname);

		expect(appendedSrcs).toEqual([]);
		expect(dataLayer).toEqual([]);
	});
});
