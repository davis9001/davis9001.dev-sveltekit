<!--
  VizCard — shared frame for the Dirac canvas visualizations.
  Holds the card chrome, title, controls row, and caption styling so each
  visualization component only supplies its canvas and buttons.
-->
<script lang="ts">
	export let title = '';
</script>

<div class="viz-card">
	{#if title}
		<div class="viz-title">{title}</div>
	{/if}
	<slot />
	{#if $$slots.controls}
		<div class="viz-controls">
			<slot name="controls" />
		</div>
	{/if}
	{#if $$slots.caption}
		<p class="viz-caption"><slot name="caption" /></p>
	{/if}
</div>

<style>
	.viz-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin: var(--spacing-xl, 2rem) 0;
		overflow: hidden;
	}

	.viz-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.75rem;
	}

	.viz-caption {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		margin-top: 0.6rem;
		line-height: 1.5;
	}

	.viz-controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.6rem;
	}

	.viz-card :global(.viz-btn) {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border: 1px solid var(--color-accent);
		color: var(--color-accent);
		border-radius: var(--radius-sm);
		padding: 0.3rem 0.75rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.viz-card :global(.viz-btn:hover),
	.viz-card :global(.viz-btn.viz-btn-active) {
		background: var(--color-accent);
		color: #fff;
	}
</style>
