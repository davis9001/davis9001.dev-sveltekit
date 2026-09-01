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

/** Classes that make one variant of a switchable pair visible. */
export function themeSwapClass(theme: ThemeVariant): string {
	return `theme-swap theme-swap--${theme}`;
}

/**
 * What the switch offers next. The label sitting on the light variant offers
 * dark, and vice versa, so the button always names where it will take you.
 */
const SWITCH_LABEL: Record<ThemeVariant, string> = {
	light: 'See it in dark',
	dark: 'See it in light'
};

/** The switch's wording for the variant currently on screen. */
export function themeSwitchLabel(theme: ThemeVariant): string {
	return SWITCH_LABEL[theme];
}

/**
 * A screenshot pair with its own light/dark switch.
 *
 * Built from a hidden checkbox and CSS sibling state rather than a component,
 * so it can be dropped into `{@html}` markdown output and needs no JavaScript.
 * Only phrasing elements are used (span, input, label, img), which keeps it
 * valid inside the `<p>` that a markdown renderer wraps an image in.
 *
 * `id` must be unique on the page — the label depends on it to reach the input.
 */
export function renderThemeSwitchFigure(options: {
	id: string;
	light: string;
	dark: string;
	alt: string;
	titleAttr?: string;
}): string {
	const { id, light, dark, alt, titleAttr = '' } = options;
	const altAttr = escapeAttribute(alt);
	const idAttr = escapeAttribute(id);

	const image = (theme: ThemeVariant, src: string) =>
		`<img src="${escapeAttribute(src)}" alt="${altAttr}"${titleAttr} loading="lazy" class="${themeSwapClass(theme)}" />`;

	const labelText = (theme: ThemeVariant) =>
		`<span class="${themeSwapClass(theme)}">${SWITCH_LABEL[theme]}</span>`;

	return (
		`<span class="theme-figure">` +
		`<input class="theme-figure-flip" type="checkbox" id="${idAttr}" />` +
		image('light', light) +
		image('dark', dark) +
		`<label class="theme-figure-switch" for="${idAttr}">` +
		labelText('light') +
		labelText('dark') +
		`</label>` +
		`</span>`
	);
}
