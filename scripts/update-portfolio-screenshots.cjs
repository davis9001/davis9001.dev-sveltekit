/**
 * Portfolio Screenshot Generator
 *
 * Captures screenshots of all portfolio project URLs and saves them as .webp
 * in static/portfolio-screenshot/. Skips if the screenshot already exists.
 *
 * Usage: node scripts/update-portfolio-screenshots.cjs
 *
 * Requires Chrome/Chromium installed on the system.
 * Uses capture-website (puppeteer-based) to take screenshots.
 */

const { readdir, readFile, mkdir, stat } = require('fs/promises');
const { join } = require('path');

// --- Inline frontmatter parser (matches src/lib/utils/portfolio.ts) ---

function parseFrontmatter(markdown) {
	const normalized = markdown.replace(/\r\n/g, '\n');
	const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
	if (!match) return { meta: {}, content: normalized };

	const lines = match[1].split('\n');
	const meta = {};
	let currentKey = null, currentValue = null;
	let collectingArray = false, arrayLines = [];

	for (const line of lines) {
		if (collectingArray) {
			arrayLines.push(line.trim());
			if (line.trim().endsWith(']')) {
				const joined = arrayLines.join(' ');
				try { currentValue = JSON.parse(joined); } catch {
					try { currentValue = JSON.parse(joined.replace(/,\s*\]/g, ']')); } catch { currentValue = joined; }
				}
				collectingArray = false;
				arrayLines = [];
			}
			continue;
		}
		const km = line.match(/^(\w+):\s*(.*)$/);
		if (km) {
			if (currentKey) meta[currentKey] = currentValue;
			currentKey = km[1];
			const v = km[2].trim();
			if (v.startsWith('[') && v.endsWith(']')) {
				try { currentValue = JSON.parse(v); } catch { currentValue = v; }
			} else if (v.startsWith('[')) {
				collectingArray = true;
				arrayLines = [v];
			} else if (v.startsWith('"') || v.startsWith("'")) {
				currentValue = v.slice(1, -1);
			} else {
				currentValue = v;
			}
		}
	}
	if (currentKey) meta[currentKey] = currentValue;
	return { meta, content: match[2] };
}

function safeFilename(url) {
	return url.replace(/https?:\/\//, '').replace(/\W+/g, '_') + '.webp';
}

// --- Chrome detection ---

function findChrome() {
	const fs = require('fs');
	const candidates = [];

	if (process.platform === 'win32') {
		const pf = process.env['PROGRAMFILES'] || 'C:\\Program Files';
		const pfx86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
		const local = process.env['LOCALAPPDATA'] || '';
		candidates.push(
			`${pf}\\Google\\Chrome\\Application\\chrome.exe`,
			`${pfx86}\\Google\\Chrome\\Application\\chrome.exe`,
			`${local}\\Google\\Chrome\\Application\\chrome.exe`,
			`${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
		);
	} else if (process.platform === 'darwin') {
		candidates.push(
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
		);
	} else {
		candidates.push(
			'/usr/bin/google-chrome',
			'/usr/bin/google-chrome-stable',
			'/usr/bin/chromium',
			'/usr/bin/chromium-browser',
			'/snap/bin/chromium',
		);
	}

	for (const c of candidates) {
		try { fs.statSync(c); return c; } catch { /* next */ }
	}
	return undefined;
}

// --- Main ---

async function main() {
	const projectsDir = join(process.cwd(), 'src', 'projects');
	const outputDir = join(process.cwd(), 'static', 'portfolio-screenshot');

	// Ensure output directory
	await mkdir(outputDir, { recursive: true });

	// Read all project markdowns
	const files = (await readdir(projectsDir)).filter(f => f.endsWith('.md'));
	const urls = [];
	for (const file of files) {
		const md = await readFile(join(projectsDir, file), 'utf-8');
		const { meta } = parseFrontmatter(md);
		if (meta.url && meta.url.startsWith('http')) {
			urls.push(meta.url);
		}
	}

	if (urls.length === 0) {
		console.log('No project URLs found.');
		return;
	}

	const chromePath = process.env.CHROME_PATH || findChrome();
	if (!chromePath) {
		console.warn('⚠ No Chrome/Chromium found. Screenshot capture will be skipped.');
		console.warn('  Install Chrome or set CHROME_PATH environment variable.');
		process.exit(0);
	}
	console.log(`Using Chrome: ${chromePath}`);

	// Dynamic import for ESM module
	const captureWebsite = (await import('capture-website')).default;

	let captured = 0, skipped = 0, failed = 0;

	for (const url of urls) {
		if (url.includes('localhost')) {
			console.log(`Skipping localhost URL: ${url}`);
			skipped++;
			continue;
		}

		const filename = safeFilename(url);
		const outputPath = join(outputDir, filename);

		// Skip if already exists
		try {
			await stat(outputPath);
			console.log(`Skipping existing: ${filename}`);
			skipped++;
			continue;
		} catch { /* file doesn't exist, proceed */ }

		try {
			console.log(`Capturing ${url} -> ${filename}`);
			await captureWebsite.file(url, outputPath, {
				type: 'webp',
				width: 1280,
				height: 720,
				quality: 0.7,
				darkMode: true,
				launchOptions: {
					executablePath: chromePath,
				},
			});
			console.log(`✓ Captured ${url}`);
			captured++;
		} catch (error) {
			console.error(`✗ Failed to capture ${url}:`, error.message || error);
			failed++;
		}
	}

	console.log(`\nScreenshots done: ${captured} captured, ${skipped} skipped, ${failed} failed`);
}

main().catch(err => { console.error(err); process.exit(1); });
