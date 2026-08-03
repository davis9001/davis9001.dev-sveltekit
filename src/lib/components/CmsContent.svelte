<!--
  CmsContent — public renderer for CMS richtext HTML.

  Splits stored HTML into segments: plain chunks are injected with {@html}
  (content is sanitized server-side at write time), and Svelte embed
  placeholders mount their live components from the embed registry.

  It also plays the entrance animation for inline charts. The sanitizer
  (src/lib/cms/sanitize.ts) strips <style>, style attributes, scripts and every
  animate* tag from post bodies, so an authored chart cannot animate itself —
  but `class` survives, so the keyframes live in app.css and this decides when
  they run. Marks are only hidden once JS is here to reveal them again, and a
  chart below the fold waits until it is actually on screen instead of playing
  to nobody.
-->
<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import { parseContentSegments } from '$lib/cms/embed';
	import { getEmbedComponent } from '$lib/cms/embeds';

	export let html = '';

	$: segments = parseContentSegments(html || '');

	let observer: IntersectionObserver | null = null;

	/**
	 * Arm every chart that is not armed yet. Idempotent, because it runs again
	 * after each update — client-side navigation to another post reuses this
	 * component instance and brings new charts with it.
	 */
	function armCharts(): void {
		if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') return;

		const charts = Array.from(document.querySelectorAll('svg.cms-chart')).filter(
			(el) => !el.classList.contains('chart-anim')
		);
		if (charts.length === 0) return;

		observer ??= new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add('in-view');
					observer?.unobserve(entry.target);
				}
			},
			// A sliver is enough: the figure is tall, and waiting for a third of it
			// means the top has already been read by the time anything moves.
			{ threshold: 0.12 }
		);

		for (const chart of charts) {
			chart.classList.add('chart-anim');
			observer.observe(chart);
		}
	}

	onMount(armCharts);
	afterUpdate(armCharts);
	onDestroy(() => {
		observer?.disconnect();
		observer = null;
	});
</script>

{#each segments as segment, i (i)}
	{#if segment.type === 'html'}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized at write time -->
		{@html segment.html}
	{:else}
		{@const component = getEmbedComponent(segment.name)}
		{#if component}
			<svelte:component this={component} {...segment.props} />
		{/if}
	{/if}
{/each}
