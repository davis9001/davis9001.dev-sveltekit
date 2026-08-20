<!--
  Test host for RiverColumns — the component takes its content through a slot,
  so exercising the clone/offset logic needs a real parent supplying one.
-->
<script lang="ts">
	import RiverColumns from '../../src/lib/components/RiverColumns.svelte';

	export let enabled = true;
	export let columns = 3;
</script>

<RiverColumns {enabled} {columns}>
	<p class="probe-a">Alpha paragraph</p>
	<p class="probe-b">Beta paragraph</p>
</RiverColumns>
