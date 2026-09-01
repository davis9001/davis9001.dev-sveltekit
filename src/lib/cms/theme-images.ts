/**
 * Theme-paired images inside CMS content.
 *
 * A post body written in the admin editor can point an image at a `{theme}`
 * source — `/media/uploads/dashboard-{theme}.webp` — and both variants are
 * emitted here at render time, for CSS to choose between.
 *
 * This runs on already-sanitized stored HTML, on the way to the page. It has to
 * run late: the sanitizer's img allowlist is `src, alt, title, width, height`,
 * so the `.theme-img--*` classes the swap depends on would be stripped if they
 * were written into the stored body.
 */
import {
	THEME_VARIANTS,
	hasThemePlaceholder,
	themeImgClass,
	withTheme,
	type ThemeVariant
} from '$lib/utils/theme-image';

const IMG_TAG = /<img\b[^>]*>/gi;
const CLASS_ATTR = /\sclass\s*=\s*(["'])(.*?)\1/i;

/**
 * Add classes to one `<img>` tag, merging with any it already carries.
 * Sanitized bodies have no class on images, but content from elsewhere might.
 */
function addClasses(tag: string, classes: string): string {
	const existing = tag.match(CLASS_ATTR);

	if (existing) {
		return tag.replace(CLASS_ATTR, ` class="${classes} ${existing[2]}"`.replace(/\s+"$/, '"'));
	}

	// Insert before the tag's closing bracket, keeping any self-closing slash.
	return tag.replace(/\s*\/?>$/, (end) => ` class="${classes}"${end.trimStart()}`);
}

/** Resolve one `<img>` tag to a single theme variant, classed for the swap. */
function variantTag(tag: string, theme: ThemeVariant): string {
	return addClasses(withTheme(tag, theme), themeImgClass(theme));
}

/**
 * Expand every `{theme}` image in a block of CMS HTML into its light/dark pair.
 * Tags without the placeholder are returned untouched, so ordinary posts are
 * passed through unchanged.
 */
export function expandThemeImages(html: string): string {
	if (!html || !hasThemePlaceholder(html)) return html;

	return html.replace(IMG_TAG, (tag) => {
		if (!hasThemePlaceholder(tag)) return tag;

		return THEME_VARIANTS.map((theme) => variantTag(tag, theme)).join('');
	});
}
