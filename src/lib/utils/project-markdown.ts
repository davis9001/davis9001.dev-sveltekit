/**
 * Markdown rendering for portfolio project bodies.
 *
 * Adds one thing on top of plain `marked`: theme-paired screenshots. A project
 * body writes a single image whose path contains `{theme}`,
 *
 *   ![The AgapeVerse home page](/agapeverse/home-{theme}.webp)
 *
 * and both variants are emitted, wrapped in a figure with its own light/dark
 * switch. The page theme picks the variant to start with; the switch lets a
 * reader look at the other one without changing the whole page.
 *
 * See `$lib/utils/theme-image` for the convention and why the swap is CSS.
 */
import { marked } from 'marked';
import {
	escapeAttribute,
	hasThemePlaceholder,
	renderThemeSwitchFigure,
	withTheme
} from './theme-image';

export { THEME_PLACEHOLDER } from './theme-image';

/**
 * Build the markup for one project-body image.
 *
 * A `{theme}` source becomes a switchable pair; anything else stays a single
 * plain tag, so bodies without paired screenshots render as they always did.
 * `id` distinguishes this figure's checkbox from every other one on the page.
 */
export function renderThemeImage(
	href: string,
	alt: string,
	title?: string | null,
	id = 'theme-figure'
): string {
	const altAttr = escapeAttribute(alt || '');
	const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';

	if (!hasThemePlaceholder(href)) {
		return `<img src="${escapeAttribute(href)}" alt="${altAttr}"${titleAttr} loading="lazy" />`;
	}

	return renderThemeSwitchFigure({
		id,
		light: withTheme(href, 'light'),
		dark: withTheme(href, 'dark'),
		alt: alt || '',
		titleAttr
	});
}

/** Render a project body to HTML, expanding any `{theme}` image pairs. */
export function renderProjectMarkdown(content: string): string {
	const renderer = new marked.Renderer();

	// Each switchable figure needs a checkbox id no other figure shares. The
	// counter is per render, so ids are a function of position in the body and
	// come out the same on the server and the client.
	let figureCount = 0;

	// Only a switchable figure takes a number, so the ids count figures rather
	// than images and a plain screenshot in between does not create a gap.
	renderer.image = ({ href, title, text }) =>
		renderThemeImage(
			href,
			text,
			title,
			hasThemePlaceholder(href) ? `theme-figure-${++figureCount}` : undefined
		);

	return marked(content, { renderer }) as string;
}
