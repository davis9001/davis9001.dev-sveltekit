import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Hidden OG Cover Route Source', () => {
	const routeFile = path.join(process.cwd(), 'src', 'routes', 'hidden', 'og-cover', '+page.svelte');
	const source = () => readFileSync(routeFile, 'utf8');

	it('should exist', () => {
		expect(existsSync(routeFile)).toBe(true);
	});

	it('should render at exact Open Graph dimensions', () => {
		const src = source();

		expect(src).toContain('const WIDTH = 1200;');
		expect(src).toContain('const HEIGHT = 630;');
	});

	it('should use the current hoodie background photo and the davis9001 logo', () => {
		const src = source();

		expect(src).toContain('/davis9001-2-hoodie.webp');
		expect(src).toContain('/logo-green-Icon-250.webp');
	});

	it('should expose a readiness flag for the capture script', () => {
		const src = source();

		expect(src).toContain('data-og-ready');
	});

	it('should build the ASCII field deterministically so captures are reproducible', () => {
		const src = source();

		expect(src).toContain('seededSequence');
		// Math.random would make every capture a different image.
		expect(src).not.toContain('Math.random');
	});
});

describe('Generated OG cover asset', () => {
	const coverFile = path.join(process.cwd(), 'static', 'cover.png');

	it('should exist', () => {
		expect(existsSync(coverFile)).toBe(true);
	});

	it('should be a 1200x630 PNG', () => {
		const buffer = readFileSync(coverFile);

		// PNG magic number, then IHDR width/height as big-endian uint32s.
		expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
		expect(buffer.readUInt32BE(16)).toBe(1200);
		expect(buffer.readUInt32BE(20)).toBe(630);
	});

	it('should stay small enough for link unfurls', () => {
		expect(statSync(coverFile).size).toBeLessThan(1_000_000);
	});
});
