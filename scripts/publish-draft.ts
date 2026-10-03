/**
 * Turn a blog draft in docs/blog-drafts/ into the INSERT that publishes it.
 *
 * The drafts are markdown with YAML frontmatter; the CMS stores sanitized HTML
 * in a blog item's `body` field. This does that conversion the same way the
 * posts already in the database were converted, so a new post reads like the
 * ones beside it:
 *
 *   - the opening **By ...** line becomes <p class="byline">
 *   - an image followed by an italic line becomes <figure> + <figcaption>,
 *     with the image's real pixel size read off the file so the page reserves
 *     the right box before it loads
 *   - everything else is marked (gfm, no breaks), then the server sanitizer
 *
 * It writes SQL rather than running it — publishing is a plain INSERT against
 * prod, no migration, so the file is reviewable before it is applied:
 *
 *   bun scripts/publish-draft.ts ../docs/blog-drafts/<slug>.md
 *   bunx wrangler d1 execute davis9001-prod-db --remote --file=../backups/insert-<slug>.sql
 *
 * Env:
 *   BLOG_AUTHOR_ID   author (default: David's prod admin id)
 *   PUBLISHED_AT     ISO timestamp (default: now)
 *   MEDIA_DIR        where to find the uploaded files, to measure them
 *                    (default: test-outputs/fly — pass the dir the webps came from)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { marked } from 'marked';

import { sanitizeHtml } from '../src/lib/cms/sanitize';
import { sqlQuote, tagSlug, importTagId, truncateExcerpt } from '../src/lib/cms/blog-import';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BLOG_TYPE_ID = '2d76b976-536d-43de-bf01-12573fa53103'; // prod's blog content type
const AUTHOR_ID = process.env.BLOG_AUTHOR_ID || '415560b420f679815c0a272f8db5bedd';

interface DraftMeta {
	title: string;
	slug: string;
	category: string;
	read_time: number;
	featured_image: string;
	tags: string[];
	excerpt: string;
}

/** Split the YAML frontmatter off the markdown body. */
function splitFrontmatter(source: string): { meta: DraftMeta; body: string } {
	const text = source.replace(/^﻿/, '').trimStart();
	if (!text.startsWith('---')) throw new Error('draft has no frontmatter');
	const end = text.indexOf('\n---', 3);
	if (end === -1) throw new Error('draft frontmatter is not closed');
	const meta = parseFrontmatter(text.slice(3, end));
	for (const key of ['title', 'slug', 'excerpt'] as const) {
		if (!meta?.[key]) throw new Error(`draft frontmatter is missing ${key}`);
	}
	return { meta, body: text.slice(end + 4).trimStart() };
}

/**
 * The frontmatter subset the drafts use: `key: value`, an inline `[a, b]`
 * list, and YAML's folded `>-` block for the excerpt. Hand-parsed rather than
 * pulled from a YAML library the app does not otherwise depend on.
 */
function parseFrontmatter(block: string): DraftMeta {
	const meta: Record<string, unknown> = {};
	const lines = block.split('\n');
	for (let i = 0; i < lines.length; i += 1) {
		const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
		if (!match) continue;
		const [, key, raw] = match;
		if (raw === '>-' || raw === '>' || raw === '|' || raw === '|-') {
			const folded: string[] = [];
			while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
				folded.push(lines[i + 1].trim());
				i += 1;
			}
			meta[key] = folded.join(raw.startsWith('>') ? ' ' : '\n');
			continue;
		}
		const value = raw.trim().replace(/^['"]|['"]$/g, '');
		if (value.startsWith('[') && value.endsWith(']')) {
			meta[key] = value
				.slice(1, -1)
				.split(',')
				.map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
				.filter(Boolean);
		} else if (/^\d+$/.test(value)) {
			meta[key] = Number(value);
		} else {
			meta[key] = value;
		}
	}
	return meta as unknown as DraftMeta;
}

/** The intrinsic size of an uploaded image, so the figure reserves its box. */
function imageSize(src: string): { width: number; height: number } | null {
	const mediaDir = process.env.MEDIA_DIR || join(root, 'test-outputs', 'fly');
	const file = join(mediaDir, basename(src));
	if (!existsSync(file)) return null;
	return readSize(file);
}

/** Intrinsic size from the file header — WebP (VP8X/VP8 /VP8L) and PNG. */
function readSize(file: string): { width: number; height: number } | null {
	const buf = readFileSync(file);
	if (
		buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buf.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		const chunk = buf.subarray(12, 16).toString('ascii');
		if (chunk === 'VP8X') {
			return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
		}
		if (chunk === 'VP8 ') {
			return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
		}
		if (chunk === 'VP8L') {
			const bits = buf.readUInt32LE(21);
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
		}
		return null;
	}
	if (buf.subarray(1, 4).toString('ascii') === 'PNG') {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}
	return null;
}

/**
 * Markdown, with the two shapes the drafts use that plain marked does not
 * produce: the byline paragraph and captioned figures.
 */
function renderBody(markdown: string): string {
	const lines = markdown.split('\n');
	const out: string[] = [];

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];

		// ![alt](light-src)(dark-src): a screenshot in both themes. Two figures,
		// each wrapped in a div the post page shows only in its theme
		// (.cms-only-light / .cms-only-dark); the hidden one is display:none, so a
		// screen reader meets the image and its caption once.
		const themed = /^!\[([^\]]*)\]\(([^)\s]+)\)\(([^)\s]+)\)\s*$/.exec(line);
		if (themed) {
			const [, alt, light, dark] = themed;
			const next = lines[i + 1] ?? '';
			const caption = /^[*_](.+)[*_]\s*$/.exec(next.trim());
			const inner = caption ? (marked.parseInline(caption[1]) as string).trim() : '';
			if (caption) i += 1;
			for (const [cls, src] of [
				['cms-only-light', light],
				['cms-only-dark', dark]
			]) {
				const size = imageSize(src);
				const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
				const attrs = `src="${src}" alt="${escapeAttr(alt)}"${dims}`;
				const cap = caption ? `\n    <figcaption>${inner}</figcaption>` : '';
				out.push(`<div class="${cls}">\n<figure>\n    <img ${attrs} />${cap}\n</figure>\n</div>`);
			}
			continue;
		}

		// ![alt](src) on its own line, optionally captioned by the next line
		const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line);
		if (image) {
			const [, alt, src] = image;
			const next = lines[i + 1] ?? '';
			const caption = /^[*_](.+)[*_]\s*$/.exec(next.trim());
			const size = imageSize(src);
			const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
			const attrs = `src="${src}" alt="${escapeAttr(alt)}"${dims}`;
			if (caption) {
				const inner = (marked.parseInline(caption[1]) as string).trim();
				out.push(
					`<figure>\n    <img ${attrs} />\n    <figcaption>${inner}</figcaption>\n</figure>`
				);
				i += 1;
			} else {
				out.push(`<figure>\n    <img ${attrs} />\n</figure>`);
			}
			continue;
		}

		// The byline: the first **By ...** line in the document
		const byline = /^\*\*(By .+)\*\*\s*$/.exec(line);
		if (byline && !out.some((block) => block.includes('class="byline"'))) {
			const inner = (marked.parseInline(byline[1]) as string).trim();
			out.push(`<p class="byline">\n    <strong>${inner}</strong>\n</p>`);
			continue;
		}

		out.push(line);
	}

	const html = marked(out.join('\n'), { gfm: true, breaks: false }) as string;
	return prettify(html);
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Break paragraphs onto their own indented lines, as the stored posts are. */
function prettify(html: string): string {
	return html
		.replace(/<p>([\s\S]*?)<\/p>/g, (_m, inner) => `<p>\n    ${inner.trim()}\n</p>`)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function main() {
	const draftPath = process.argv[2];
	if (!draftPath) throw new Error('usage: bun scripts/publish-draft.ts <draft.md>');

	const { meta, body } = splitFrontmatter(readFileSync(draftPath, 'utf-8'));
	const bodyHtml = sanitizeHtml(renderBody(body));
	const publishedAt = process.env.PUBLISHED_AT || new Date().toISOString().replace(/\.\d+Z$/, 'Z');
	const id = randomUUID();
	const excerpt = truncateExcerpt(meta.excerpt.replace(/\s+/g, ' '));

	// Crawlers need an absolute share image; a relative one is dropped by most
	// of them. The body keeps site-relative paths.
	const seoImage = meta.featured_image
		? new URL(meta.featured_image, 'https://davis9001.dev').toString()
		: '';

	const fields = JSON.stringify({
		excerpt,
		body: bodyHtml,
		featured_image: meta.featured_image ?? '',
		category: meta.category ?? 'general',
		read_time: meta.read_time ?? 5
	});

	const statements = [
		`-- ${meta.slug} — generated by scripts/publish-draft.ts, ${publishedAt}`,
		`INSERT INTO content_items (id, content_type_id, slug, title, status, fields, seo_title, seo_description, seo_image, author_id, published_at, created_at, updated_at) VALUES (${sqlQuote(id)},${sqlQuote(BLOG_TYPE_ID)},${sqlQuote(meta.slug)},${sqlQuote(meta.title)},'published',${sqlQuote(fields)},${sqlQuote(meta.title)},${sqlQuote(excerpt)},${sqlQuote(seoImage)},${sqlQuote(AUTHOR_ID)},${sqlQuote(publishedAt)},${sqlQuote(publishedAt)},${sqlQuote(publishedAt)});`
	];

	for (const tag of meta.tags ?? []) {
		const slug = tagSlug(tag);
		if (!slug) continue;
		statements.push(
			`INSERT INTO content_tags (id, content_type_id, name, slug) SELECT ${sqlQuote(importTagId(slug))},${sqlQuote(BLOG_TYPE_ID)},${sqlQuote(tag)},${sqlQuote(slug)} WHERE NOT EXISTS (SELECT 1 FROM content_tags WHERE content_type_id = ${sqlQuote(BLOG_TYPE_ID)} AND slug = ${sqlQuote(slug)});`
		);
		statements.push(
			`INSERT OR IGNORE INTO content_item_tags (content_item_id, content_tag_id) SELECT ${sqlQuote(id)}, t.id FROM content_tags t WHERE t.content_type_id = ${sqlQuote(BLOG_TYPE_ID)} AND t.slug = ${sqlQuote(slug)};`
		);
	}

	const out = process.env.OUT_SQL || join(root, '..', 'backups', `insert-${meta.slug}-post.sql`);
	writeFileSync(out, statements.join('\n') + '\n');

	const words = body.split(/\s+/).length;
	console.log(`${meta.slug} — ${words} words, body ${(bodyHtml.length / 1024).toFixed(1)} kB HTML`);
	console.log(`id ${id}, published_at ${publishedAt}`);
	console.log(`tags: ${(meta.tags ?? []).join(', ')}`);
	console.log(`wrote ${out}`);
}

main();
