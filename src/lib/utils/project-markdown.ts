/**
 * Markdown rendering for portfolio project bodies.
 *
 * Adds one thing on top of plain `marked`: theme-paired screenshots. A project
 * body writes a single image whose path contains the `{theme}` placeholder,
 *
 *   ![The AgapeVerse home page](/agapeverse/home-{theme}.webp)
 *
 * and both variants are emitted, with CSS showing whichever matches the
 * reader's `data-theme`. The swap is CSS-only on purpose: the site has an
 * explicit theme toggle, so a `<picture>` with `prefers-color-scheme` would
 * keep serving the system's theme after a reader switches modes.
 *
 * Only the visible variant reaches the accessibility tree — `display: none`
 * removes the other one — so both carry the same alt text.
 */
import { marked } from 'marked';

export const THEME_PLACEHOLDER = '{theme}';

/** Escape a string for interpolation into an HTML attribute value. */
function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Build the `<img>` pair for a `{theme}` source. Returns a single plain `<img>`
 * when the source has no placeholder, so untouched project bodies render as before.
 */
export function renderThemeImage(href: string, alt: string, title?: string | null): string {
	const altAttr = escapeAttribute(alt || '');
	const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';

	if (!href.includes(THEME_PLACEHOLDER)) {
		return `<img src="${escapeAttribute(href)}" alt="${altAttr}"${titleAttr} loading="lazy" />`;
	}

	return (['light', 'dark'] as const)
		.map((theme) => {
			const src = escapeAttribute(href.split(THEME_PLACEHOLDER).join(theme));
			return `<img src="${src}" alt="${altAttr}"${titleAttr} loading="lazy" class="theme-img theme-img--${theme}" />`;
		})
		.join('');
}

/** Render a project body to HTML, expanding any `{theme}` image pairs. */
export function renderProjectMarkdown(content: string): string {
	const renderer = new marked.Renderer();

	renderer.image = ({ href, title, text }) => renderThemeImage(href, text, title);

	return marked(content, { renderer }) as string;
}
