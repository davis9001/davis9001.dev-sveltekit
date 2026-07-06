<!--
  Dirac embed: Zitterbewegung (trembling motion) visualization.
  Extracted from the original /update/why-dirac-is-my-hostname page.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'Visualization 4 — Zitterbewegung (Trembling Motion)';

	const SPEEDS = [0.5, 1, 2];

	let canvas: HTMLCanvasElement;
	let running = true;
	let speed = 1;

	function cycleSpeed() {
		const idx = SPEEDS.indexOf(speed);
		speed = SPEEDS[(idx + 1) % SPEEDS.length];
	}

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let t = 0;

		function zittX(time: number) {
			return 0.6 * time + 18 * Math.sin(12 * time) * Math.exp(-time / 8);
		}

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const accent = getVar('--color-accent');
			const muted = getVar('--color-text-secondary');
			const pad = 48,
				plotW = w - pad * 1.5,
				plotH = h - pad * 1.5,
				ox = pad,
				oy = pad + plotH / 2;
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
			ctx.font = '16px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('time →', ox + plotW / 2, pad + plotH + 18);
			ctx.save();
			ctx.translate(14, oy);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText('⟨x⟩ position', 0, 0);
			ctx.restore();
			const windowTime = 18,
				tStart = Math.max(0, t - windowTime),
				tScale = plotW / windowTime;
			ctx.strokeStyle = accent + '66';
			ctx.setLineDash([5, 5]);
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			for (let px = 0; px <= plotW; px += 4) {
				const time = tStart + px / tScale;
				const xDrift = (0.6 * time - 0.6 * tStart) * (plotH * 0.18);
				if (px === 0) ctx.moveTo(ox + px, oy - xDrift);
				else ctx.lineTo(ox + px, oy - xDrift);
			}
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = accent;
			ctx.font = '16px system-ui';
			ctx.textAlign = 'right';
			ctx.fillText('group drift (v·t)', ox + plotW - 4, oy - 0.6 * windowTime * plotH * 0.18 + 4);
			ctx.beginPath();
			for (let px = 0; px <= plotW; px += 1.5) {
				const time = tStart + px / tScale;
				const yPlot = oy - zittX(time) * ((plotH * 0.18) / 0.6);
				if (px === 0) ctx.moveTo(ox + px, yPlot);
				else ctx.lineTo(ox + px, yPlot);
			}
			ctx.strokeStyle = '#a78bfa';
			ctx.lineWidth = 2;
			ctx.stroke();
			const dotX = ox + plotW,
				dotY = oy - zittX(t) * ((plotH * 0.18) / 0.6);
			const pulse = 0.7 + 0.3 * Math.sin(t * 15);
			const glowG2 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 14);
			glowG2.addColorStop(0, `rgba(167,139,250,${0.6 * pulse})`);
			glowG2.addColorStop(1, 'transparent');
			ctx.fillStyle = glowG2;
			ctx.beginPath();
			ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
			ctx.fillStyle = '#a78bfa';
			ctx.fill();
			ctx.fillStyle = '#a78bfa';
			ctx.font = 'bold 17px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('⟨x(t)⟩ with Zitterbewegung', ox + 4, pad + 16);
			ctx.fillStyle = muted;
			ctx.font = '16px system-ui';
			ctx.fillText('Oscillation: ~10²⁰ Hz (exaggerated)', ox + 4, pad + 38);
			if (running) t += 0.016 * speed;
		}

		const stopLoop = startLoop(draw);
		const resize = observeCanvasResize(canvas, (s) => {
			ctx = s.ctx;
			w = s.w;
		});

		return () => {
			stopLoop();
			resize.disconnect();
		};
	});
</script>

<VizCard {title}>
	<canvas bind:this={canvas} data-height="280" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="controls">
		<button class="viz-btn" class:viz-btn-active={running} on:click={() => (running = !running)}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="viz-btn" on:click={cycleSpeed}>{speed}× speed</button>
	</svelte:fragment>
	<svelte:fragment slot="caption">
		The expected position of a free electron vs time. The smooth drift (group velocity) is overlaid
		with rapid Zitterbewegung oscillations — a consequence of the positive and negative energy
		components of the Dirac wavepacket interfering. Scale is exaggerated for visibility.
	</svelte:fragment>
</VizCard>
