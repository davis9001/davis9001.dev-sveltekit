<!--
  Dirac embed: the Dirac equation rendered with a pulsing glow.
  Extracted from the original /update/why-dirac-is-my-hostname page.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'The Dirac Equation (1928)';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let t = 0;

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const fg = getVar('--color-text');
			const muted = getVar('--color-text-secondary');
			const glow = 0.55 + 0.45 * Math.sin(t * 1.5);
			const cx = w / 2,
				cy = h / 2;
			// Accent-green glow (theme-agnostic literal kept from the original)
			const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.5);
			grad.addColorStop(0, `rgba(36,209,96,${0.07 * glow})`);
			grad.addColorStop(1, 'transparent');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const eqFontSize = Math.max(32, Math.min(100, w / 10));
			const sub = eqFontSize * 0.65;
			// Draw as one string to avoid manual positioning issues on narrow screens
			ctx.font = `bold ${eqFontSize}px Georgia, serif`;
			ctx.shadowColor = `rgba(36,209,96,${0.7 * glow})`;
			ctx.shadowBlur = 18 * glow;
			ctx.fillStyle = fg;
			// Measure parts for accurate subscript placement
			const part1 = '(iγᵘ∂';
			const part2 = ' − m)ψ = 0';
			const w1 = ctx.measureText(part1).width;
			const subW = ctx.measureText('μ').width * (sub / eqFontSize);
			const totalW = w1 + subW + ctx.measureText(part2).width;
			const startX = cx - totalW / 2;
			ctx.textAlign = 'left';
			ctx.fillText(part1, startX, cy);
			ctx.font = `bold ${sub}px Georgia, serif`;
			ctx.fillText('μ', startX + w1, cy + eqFontSize * 0.28);
			ctx.font = `bold ${eqFontSize}px Georgia, serif`;
			ctx.fillText(part2, startX + w1 + subW, cy);
			ctx.shadowBlur = 0;
			// Labels — only on wider screens
			if (w > 420) {
				const labelY = cy + eqFontSize * 1.4;
				const labelSize = Math.min(14, w / 80);
				ctx.font = `${labelSize}px system-ui`;
				ctx.fillStyle = muted;
				ctx.textAlign = 'center';
				[
					{ x: cx - totalW * 0.38, text: 'γᵘ: gamma matrices' },
					{ x: cx, text: '∂ᵤ: four-gradient' },
					{ x: cx + totalW * 0.38, text: 'ψ: Dirac spinor' }
				].forEach((l) => ctx.fillText(l.text, l.x, labelY));
			}
			ctx.textAlign = 'left';
			t += 0.016;
		}

		const stopLoop = startLoop(draw);
		const resize = observeCanvasResize(canvas, (s) => {
			ctx = s.ctx;
			w = s.w;
			// height is fixed by data-height for this viz
		});

		return () => {
			stopLoop();
			resize.disconnect();
		};
	});
</script>

<VizCard {title}>
	<div class="eq-unit-badge">Natural units · ℏ = c = 1</div>
	<canvas bind:this={canvas} data-height="280" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="caption">
		γᵘ are the gamma matrices, ∂ᵤ is the four-gradient, m is rest mass, and ψ is the four-component
		Dirac spinor. First-order in all four spacetime coordinates simultaneously.
	</svelte:fragment>
</VizCard>

<style>
	.eq-unit-badge {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.2rem 0.65rem;
		border-radius: var(--radius-sm);
		margin-bottom: 0.85rem;
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
	}
</style>
