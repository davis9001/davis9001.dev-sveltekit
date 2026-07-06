/**
 * Blog → CMS migration generator.
 *
 * Reads src/updates/*.md (+ the hardcoded Dirac page), converts markdown to
 * HTML with the exact same marked settings as the old /update/[slug]
 * renderer, runs everything through the server sanitizer, and writes
 * migrations/0010_blog_content.sql (idempotent inserts).
 *
 * The Dirac post's prose is extracted from its Svelte page with the six
 * canvas viz-cards replaced by Svelte embed placeholders; the result is
 * also written to scripts/import/dirac-body.html for inspection, and that
 * file is reused if the source page has been deleted.
 *
 * Run: bun scripts/generate-blog-migration.ts
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

import { parseFrontmatter, getReadingTime } from '../src/lib/utils/blog';
import { sanitizeHtml } from '../src/lib/cms/sanitize';
import { buildBlogMigrationSql, type ImportPost } from '../src/lib/cms/blog-import';
import { blogContentType } from '../src/lib/cms/registry';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const updatesDir = join(root, 'src', 'updates');
const diracPagePath = join(
	root,
	'src',
	'routes',
	'update',
	'why-dirac-is-my-hostname',
	'+page.svelte'
);
const diracBodyPath = join(root, 'scripts', 'import', 'dirac-body.html');
const outputPath = join(root, 'migrations', '0010_blog_content.sql');

const CANVAS_TO_EMBED: Record<string, string> = {
	eqCanvas: 'dirac-equation',
	complexCanvas: 'dirac-complex-plane',
	seaCanvas: 'dirac-sea',
	beltCanvas: 'dirac-belt-trick',
	energyCanvas: 'dirac-energy-momentum',
	zittCanvas: 'dirac-zitterbewegung'
};

/** Extract the Dirac article prose, replacing canvas viz-cards with embeds */
function extractDiracBody(): string {
	if (!existsSync(diracPagePath)) {
		if (existsSync(diracBodyPath)) {
			console.log('Dirac page gone — reusing committed dirac-body.html');
			return readFileSync(diracBodyPath, 'utf-8');
		}
		throw new Error('Neither the Dirac page nor dirac-body.html exists');
	}

	const source = readFileSync(diracPagePath, 'utf-8');

	// The article prose lives in <div class="prose"> … </main>; the title,
	// meta, and tags sit above it (the CMS template renders its own).
	const proseMarker = '<div class="prose">';
	const proseStart = source.indexOf(proseMarker);
	const mainEnd = source.indexOf('</main>');
	if (proseStart === -1 || mainEnd === -1) {
		throw new Error('Could not locate the prose container in the Dirac page');
	}
	let body = source.slice(proseStart + proseMarker.length, mainEnd);

	// Strip the trailing closing divs (prose wrapper + layout wrapper)
	body = body.replace(/(\s*<\/div>)+\s*$/, '');

	// Replace each canvas-bearing viz-card with its embed placeholder
	body = body.replace(/<div class="viz-card[^"]*">[\s\S]*?<\/p>\s*<\/div>/g, (block) => {
		const canvasMatch = /<canvas id="([a-zA-Z]+)"/.exec(block);
		if (!canvasMatch) {
			return block; // no canvas (e.g. the SI-units card) — keep as HTML
		}
		const embedName = CANVAS_TO_EMBED[canvasMatch[1]];
		if (!embedName) {
			throw new Error(`No embed mapping for canvas id ${canvasMatch[1]}`);
		}
		return `<div data-svelte-embed="${embedName}"></div>`;
	});

	// Strip Svelte-only bits that survive (onclick handlers are inside the
	// replaced cards; {base} interpolations may appear in hrefs)
	body = body.replace(/\{base\}/g, '');

	return body.trim();
}

function main() {
	const files = readdirSync(updatesDir).filter((f) => f.endsWith('.md'));
	const posts: ImportPost[] = [];

	for (const file of files) {
		const slug = file.replace(/\.md$/, '');
		const raw = readFileSync(join(updatesDir, file), 'utf-8');
		const { meta, content } = parseFrontmatter(raw);

		let bodyHtml: string;
		let readTime: number;

		if (slug === 'why-dirac-is-my-hostname') {
			const diracBody = extractDiracBody();
			mkdirSync(dirname(diracBodyPath), { recursive: true });
			writeFileSync(diracBodyPath, diracBody);
			bodyHtml = diracBody;
			readTime = getReadingTime(diracBody);
		} else {
			bodyHtml = marked(content, { gfm: true, breaks: false }) as string;
			readTime = getReadingTime(content);
		}

		posts.push({
			slug,
			title: meta.title,
			publishedAt: meta.publishedAt,
			summary: meta.summary,
			tags: meta.tags || [],
			bodyHtml: sanitizeHtml(bodyHtml),
			readTime
		});
	}

	// Stable order: oldest first so created_at ordering reads naturally
	posts.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

	const sql = buildBlogMigrationSql(
		posts,
		JSON.stringify(blogContentType.fields),
		JSON.stringify(blogContentType.settings)
	);
	writeFileSync(outputPath, sql);

	console.log(`Wrote ${outputPath}`);
	console.log(`Posts: ${posts.length}`);
	for (const p of posts) {
		console.log(`  ${p.publishedAt.slice(0, 10)}  ${p.slug}  (${p.bodyHtml.length} bytes)`);
	}
}

main();
