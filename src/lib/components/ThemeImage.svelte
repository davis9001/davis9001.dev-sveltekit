<!--
  ThemeImage — an image that follows the reader's theme.

  Give it a `src` containing `{theme}` and it renders the light and dark
  variants, letting `.theme-img--*` in app.css show the right one. A `src`
  without the placeholder renders as a single ordinary <img>, so this is safe
  to use wherever an image may or may not have a pair.

  See $lib/utils/theme-image for the convention.
-->
<script lang="ts">
	import {
		THEME_VARIANTS,
		hasThemePlaceholder,
		themeImgClass,
		withTheme
	} from '$lib/utils/theme-image';

	export let src = '';
	export let alt = '';
	export let loading: 'lazy' | 'eager' | undefined = undefined;

	// `class` is reserved, so it is taken in and re-exported under its real name.
	let className = '';
	export { className as class };

	$: paired = hasThemePlaceholder(src);
</script>

{#if paired}
	{#each THEME_VARIANTS as theme (theme)}
		<img src={withTheme(src, theme)} {alt} {loading} class="{themeImgClass(theme)} {className}" />
	{/each}
{:else}
	<img {src} {alt} {loading} class={className} />
{/if}
