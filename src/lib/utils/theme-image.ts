/**
 * Theme-paired images.
 *
 * An image that has a light and a dark capture is written once, with `{theme}`
 * standing in for the variant:
 *
 *   /portfolio-screenshot/nebulakit_starspace_group-{theme}.webp
 *
 * Both tags are rendered and `.theme-img--*` in app.css shows whichever matches
 * the reader's `data-theme`. CSS rather than `<picture>` with
 * `prefers-color-scheme`, because the site's theme toggle sets `data-theme`
 * explicitly and a media query would ignore a reader who switched modes.
 *
 * `display: none` keeps the hidden variant out of the accessibility tree, so
 * both tags can carry the same alt text without it being announced twice.
 *
 * Used by portfolio screenshots, project markdown bodies, and CMS content.
 */

export type ThemeVariant = 'light' | 'dark';

/** Light first: it is the default, so the pair resolves before `data-theme` is set. */
export const THEME_VARIANTS: readonly ThemeVariant[] = ['light', 'dark'];

export const THEME_PLACEHOLDER = '{theme}';

/** Whether a source declares a light/dark pair. */
export function hasThemePlaceholder(src: string): boolean {
	return src.includes(THEME_PLACEHOLDER);
}

/** Resolve a `{theme}` source to one variant. Replaces every occurrence. */
export function withTheme(src: string, theme: ThemeVariant): string {
	return src.split(THEME_PLACEHOLDER).join(theme);
}

/** Classes that make one variant of a pair visible in its own theme. */
export function themeImgClass(theme: ThemeVariant): string {
	return `theme-img theme-img--${theme}`;
}

/** Escape a string for interpolation into an HTML attribute value. */
export function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
