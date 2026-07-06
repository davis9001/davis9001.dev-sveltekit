<!--
  Dirac embed: relativistic energy-momentum dispersion visualization.
  Extracted from the original /update/why-dirac-is-my-hostname page.
  Drag to set momentum; double-click to resume the animation.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'Visualization 3 — Relativistic Energy-Momentum Dispersion';

	let canvas: HTMLCanvasElement;
	let running = true;

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let t = 0;
		let userP: number | null = null;
		let eOx = 52,
			ePScale = 1;
		const ac = new AbortController();
		const { signal } = ac;

		canvas.style.cursor = 'crosshair';
		canvas.addEventListener(
			'mousedown',
			(e) => {
				const rect = canvas.getBoundingClientRect();
				userP = Math.max(0, Math.min(3.0, (e.clientX - rect.left - eOx) / ePScale));
				running = false;
			},
			{ signal }
		);
		canvas.addEventListener(
			'mousemove',
			(e) => {
				if (e.buttons > 0) {
					const rect = canvas.getBoundingClientRect();
					userP = Math.max(0, Math.min(3.0, (e.clientX - rect.left - eOx) / ePScale));
				}
			},
			{ signal }
		);
		canvas.addEventListener('dblclick', () => (userP = null), { signal });
		canvas.addEventListener(
			'touchstart',
			(e) => {
				e.preventDefault();
				const rect = canvas.getBoundingClientRect();
				userP = Math.max(0, Math.min(3.0, (e.touches[0].clientX - rect.left - eOx) / ePScale));
				running = false;
			},
			{ passive: false, signal }
		);
		canvas.addEventListener(
			'touchmove',
			(e) => {
				e.preventDefault();
				const rect = canvas.getBoundingClientRect();
				userP = Math.max(0, Math.min(3.0, (e.touches[0].clientX - rect.left - eOx) / ePScale));
			},
			{ passive: false, signal }
		);

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const accent = getVar('--color-accent');
			const muted = getVar('--color-text-secondary');
			const pad = 52,
				plotW = w - pad * 1.4,
				plotH = h - pad * 1.5,
				ox = pad,
				oy = pad + plotH / 2;
			const pScale = plotW / 4,
				eScale = plotH * 0.46;
			ctx.strokeStyle = muted;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ox, pad);
			ctx.lineTo(ox, pad + plotH);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox + plotW, oy);
			ctx.stroke();
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('p (momentum)', ox + plotW / 2, pad + plotH + 18);
			ctx.save();
			ctx.translate(14, oy);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText('E (energy)', 0, 0);
			ctx.restore();
			const mc2y = oy - eScale,
				negmc2y = oy + eScale;
			ctx.setLineDash([3, 5]);
			ctx.strokeStyle = accent + '55';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ox, mc2y);
			ctx.lineTo(ox + plotW, mc2y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(ox, negmc2y);
			ctx.lineTo(ox + plotW, negmc2y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = accent;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'right';
			ctx.fillText('+mc²', ox - 3, mc2y + 4);
			ctx.fillText('−mc²', ox - 3, negmc2y + 4);
			ctx.fillText('0', ox - 3, oy + 4);
			ctx.strokeStyle = 'rgba(250,204,21,0.35)';
			ctx.setLineDash([5, 4]);
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox + plotW, oy - (plotW * eScale) / pScale);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = 'rgba(250,204,21,0.7)';
			ctx.font = '13px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('E = pc (photon)', ox + plotW * 0.6, oy - (plotW * 0.6 * eScale) / pScale - 4);
			ctx.beginPath();
			for (let px = 0; px <= plotW; px += 1.5) {
				const p = px / pScale,
					E = Math.sqrt(p * p + 1) * eScale;
				if (px === 0) ctx.moveTo(ox + px, oy - E);
				else ctx.lineTo(ox + px, oy - E);
			}
			ctx.strokeStyle = '#60a5fa';
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.beginPath();
			for (let px = 0; px <= plotW; px += 1.5) {
				const p = px / pScale,
					E = Math.sqrt(p * p + 1) * eScale;
				if (px === 0) ctx.moveTo(ox + px, oy - E);
				else ctx.lineTo(ox + px, oy - E);
			}
			ctx.lineTo(ox + plotW, mc2y);
			ctx.lineTo(ox, mc2y);
			ctx.closePath();
			ctx.fillStyle = 'rgba(96,165,250,0.07)';
			ctx.fill();
			ctx.beginPath();
			for (let px = 0; px <= plotW; px += 1.5) {
				const p = px / pScale,
					E = -Math.sqrt(p * p + 1) * eScale;
				if (px === 0) ctx.moveTo(ox + px, oy - E);
				else ctx.lineTo(ox + px, oy - E);
			}
			ctx.strokeStyle = '#fb923c';
			ctx.lineWidth = 3;
			ctx.stroke();
			eOx = ox;
			ePScale = pScale;
			const pNorm = userP !== null ? userP : (Math.sin(t * 0.6) * 0.5 + 0.5) * 3.0;
			const eNorm = Math.sqrt(pNorm * pNorm + 1);
			const dotX = ox + pNorm * pScale,
				dotY = oy - eNorm * eScale;
			const dotPulse = 0.7 + 0.3 * Math.sin(t * 3);
			const glowG = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 16);
			glowG.addColorStop(0, `rgba(96,165,250,${0.5 * dotPulse})`);
			glowG.addColorStop(1, 'transparent');
			ctx.fillStyle = glowG;
			ctx.beginPath();
			ctx.arc(dotX, dotY, 16, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
			ctx.fillStyle = '#60a5fa';
			ctx.fill();
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.fillStyle = '#fff';
			ctx.font = 'bold 15px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('e⁻', dotX, dotY + 3);
			// E/p readout
			const readX = dotX < ox + plotW - 90 ? dotX + 12 : dotX - 90;
			ctx.save();
			ctx.shadowColor = 'rgba(0,0,0,0.85)';
			ctx.shadowBlur = 5;
			ctx.fillStyle = '#fff';
			ctx.font = '11px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('E=' + eNorm.toFixed(2) + 'mc²', readX, dotY - 5);
			ctx.fillText('p=' + pNorm.toFixed(2) + 'mc', readX, dotY + 8);
			ctx.restore();
			ctx.font = 'bold 14px system-ui';
			ctx.textAlign = 'left';
			ctx.fillStyle = '#60a5fa';
			ctx.fillText('Electron branch', ox + 4, mc2y - 10);
			ctx.fillStyle = '#fb923c';
			ctx.fillText('Positron branch', ox + 4, negmc2y + 22);
			ctx.setLineDash([2, 4]);
			ctx.strokeStyle = accent + 'aa';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ox + 6, mc2y);
			ctx.lineTo(ox + 6, negmc2y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = accent;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('2mc²', ox + 10, oy + 4);
			// Interaction hint
			ctx.fillStyle = muted + '55';
			ctx.font = '11px system-ui';
			ctx.textAlign = 'center';
			if (userP === null) {
				ctx.fillText(
					'drag to set momentum · dbl-click to animate',
					ox + plotW / 2,
					pad + plotH + 30
				);
			} else {
				ctx.fillText('dbl-click to resume animation', ox + plotW / 2, pad + plotH + 30);
			}

			if (running) t += 0.016;
		}

		const stopLoop = startLoop(draw);
		const resize = observeCanvasResize(canvas, (s) => {
			ctx = s.ctx;
			w = s.w;
		});

		return () => {
			stopLoop();
			resize.disconnect();
			ac.abort();
		};
	});
</script>

<VizCard {title}>
	<canvas bind:this={canvas} data-height="340" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="controls">
		<button class="viz-btn" class:viz-btn-active={running} on:click={() => (running = !running)}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
	</svelte:fragment>
	<svelte:fragment slot="caption">
		E vs momentum p. Blue branch: electrons. Orange branch: positrons. The gap between them is 2mc²
		— the energy cost of creating a pair from nothing. Massless particles (photons) travel along the
		dashed light cone (E = pc).
	</svelte:fragment>
</VizCard>
