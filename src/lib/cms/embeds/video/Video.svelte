<!--
  Video — a short clip from the media library, with native controls.
  Renders on the server so the poster paints with the page; preload stays at
  metadata so the clip itself only downloads when someone presses play.
-->
<script lang="ts">
	import { safeMediaPath } from './definition';

	export let src = '';
	export let poster = '';
	export let label = '';
	export let caption = '';

	$: safeSrc = safeMediaPath(src);
	$: safePoster = safeMediaPath(poster);
</script>

{#if safeSrc}
	<figure class="cms-video">
		<!-- svelte-ignore a11y-media-has-caption -->
		<video
			src={safeSrc}
			poster={safePoster || undefined}
			aria-label={label || undefined}
			controls
			playsinline
			preload="metadata"
		></video>
		{#if caption}
			<figcaption>{caption}</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.cms-video video {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-md, 0.5rem);
		background: #000;
	}
</style>
