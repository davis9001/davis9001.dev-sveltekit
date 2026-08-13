import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('OG Cover Capture Script Source', () => {
	const scriptFile = path.join(process.cwd(), 'scripts', 'capture-og-cover.cjs');
	const source = () => readFileSync(scriptFile, 'utf8');

	it('should exist', () => {
		expect(existsSync(scriptFile)).toBe(true);
	});

	it('should target the hidden og-cover route and write static/cover.png', () => {
		const src = source();

		expect(src).toContain('/hidden/og-cover');
		expect(src).toContain("'cover.png'");
	});

	it('should force the dark theme so the card matches the site palette', () => {
		expect(source()).toContain('/hidden/og-cover?dark');
	});

	it('should capture at 1200x630', () => {
		const src = source();

		expect(src).toContain('const WIDTH = 1200;');
		expect(src).toContain('const HEIGHT = 630;');
	});

	it('should wait for the route to signal readiness before screenshotting', () => {
		expect(source()).toContain('[data-og-ready="true"]');
	});

	it('should refuse to capture a Vite error overlay into the committed asset', () => {
		expect(source()).toContain('vite-error-overlay');
	});
});
