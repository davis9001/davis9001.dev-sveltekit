/**
 * Markdown rendering for portfolio project bodies.
 *
 * Adds one thing on top of plain `marked`: theme-paired screenshots. A project
 * body writes a single image whose path contains `{theme}`,
 *
 *   ![The AgapeVerse home page](/agapeverse/home-{theme}.webp)
 *
 * and both variants are emitted for CSS to choose between. See
 * `$lib/utils/theme-image` for why the swap is CSS rather than `<picture>`.
 */
import { marked } from 'marked';
import {
	THEME_VARIANTS,
	escapeAttribute,
	hasThemePlaceholder,
	themeImgClass,
	withTheme
} from './theme-image';

export { THEME_PLACEHOLDER } from './theme-image';

/**
 * Build the `<img>` pair for a `{theme}` source. Returns a single plain `<img>`
 * when the source has no placeholder, so untouched project bodies render as before.
 */
export function renderThemeImage(href: string, alt: string, title?: string | null): string {
	const altAttr = escapeAttribute(alt || '');
	const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';

	if (!hasThemePlaceholder(href)) {
		return `<img src="${escapeAttribute(href)}" alt="${altAttr}"${titleAttr} loading="lazy" />`;
	}

	return THEME_VARIANTS.map((theme) => {
		const src = escapeAttribute(withTheme(href, theme));
		return `<img src="${src}" alt="${altAttr}"${titleAttr} loading="lazy" class="${themeImgClass(theme)}" />`;
	}).join('');
}

/** Render a project body to HTML, expanding any `{theme}` image pairs. */
export function renderProjectMarkdown(content: string): string {
	const renderer = new marked.Renderer();

	renderer.image = ({ href, title, text }) => renderThemeImage(href, text, title);

	return marked(content, { renderer }) as string;
}
