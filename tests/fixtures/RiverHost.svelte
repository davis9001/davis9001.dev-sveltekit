<!--
  Test host for RiverColumns — the component takes its content through slots,
  so exercising the clone, offset and outro logic needs a real parent.
-->
<script lang="ts">
	import RiverColumns from '../../src/lib/components/RiverColumns.svelte';

	export let enabled = true;
	export let columns = 3;
</script>

<RiverColumns {enabled} {columns}>
	<p class="probe-a">Alpha paragraph</p>
	<p class="probe-b">Beta paragraph</p>
	<p><a class="probe-link" href="/somewhere">A link in the flow</a></p>
	<p><a class="probe-anchor" href="#probe-target">Jump down</a></p>
	<h2 id="probe-target">A target further down</h2>
	<svg class="cms-chart chart-anim in-view"><circle class="cr" /></svg>
	<p><a href="#gamma" class="probe-link">a footnote</a></p>

	<svelte:fragment slot="outro" let:atEnd>
		<div class="probe-outro" data-at-end={atEnd}>The end</div>
	</svelte:fragment>
</RiverColumns>
