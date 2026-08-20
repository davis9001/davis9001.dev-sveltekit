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

	<svelte:fragment slot="outro" let:atEnd>
		<div class="probe-outro" data-at-end={atEnd}>The end</div>
	</svelte:fragment>
</RiverColumns>
