<!--
  Dirac embed: the Dirac sea & pair production visualization.
  Extracted from the original /update/why-dirac-is-my-hostname page.
  Click the sea (or the button) to trigger pair creation.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'Visualization 1 — The Dirac Sea & Pair Production';

	let canvas: HTMLCanvasElement;
	let running = true;

	let triggerPair: () => void = () => {};

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let t = 0;
		const pairs: {
			t: number;
			x: number;
			life: number;
			holeCol?: number;
			holeRow?: number;
			startY?: number;
		}[] = [];
		const ac = new AbortController();

		triggerPair = () => pairs.push({ t: 0, x: w * (0.25 + Math.random() * 0.5), life: 0 });

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const muted = getVar('--color-text-secondary');
			const accent = getVar('--color-accent');
			const midY = h * 0.42,
				seaTop = midY + 30;
			ctx.save();
			ctx.translate(22, h / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.textAlign = 'center';
			ctx.font = '13px system-ui';
			ctx.fillStyle = muted;
			ctx.fillText('Energy E', 0, 0);
			ctx.restore();
			ctx.strokeStyle = muted;
			ctx.setLineDash([4, 4]);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(40, midY);
			ctx.lineTo(w - 10, midY);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.font = '13px system-ui';
			ctx.fillStyle = muted;
			ctx.textAlign = 'left';
			ctx.fillText('E = 0', 42, midY - 6);
			const gap = h * 0.12,
				posLine = midY - gap,
				negLine = midY + gap;
			ctx.strokeStyle = accent + '55';
			ctx.setLineDash([3, 6]);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(40, posLine);
			ctx.lineTo(w - 10, posLine);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(40, negLine);
			ctx.lineTo(w - 10, negLine);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = accent;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'right';
			ctx.fillText('+mc²', w - 12, posLine - 4);
			ctx.fillText('−mc²', w - 12, negLine + 14);
			const rows = 5,
				cols = 12,
				seaH = h - seaTop - 20,
				rowH = seaH / rows,
				colW = (w - 60) / cols;
			const seaGrad = ctx.createLinearGradient(0, seaTop, 0, h - 10);
			seaGrad.addColorStop(0, 'rgba(30,58,138,0.45)');
			seaGrad.addColorStop(1, 'rgba(15,23,42,0.45)');
			ctx.fillStyle = seaGrad;
			ctx.roundRect(36, seaTop, w - 46, seaH + 10, 6);
			ctx.fill();
			ctx.fillStyle = '#3b82f6';
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('DIRAC SEA  (all negative-energy states filled)', w / 2, seaTop + 14);
			const activePairs = pairs.filter((p) => p.life < 1.5);
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const ex = 44 + c * colW + colW / 2,
						ey = seaTop + 24 + r * rowH + rowH / 2;
					const wave = Math.sin(t * 2 + c * 0.5 + r * 0.7) * 2;
					const isHole = activePairs.some(
						(p) => p.holeCol === c && p.holeRow === r && p.life > 0.3
					);
					if (!isHole) {
						ctx.beginPath();
						ctx.arc(ex, ey + wave, 6, 0, Math.PI * 2);
						ctx.fillStyle = 'rgba(96,165,250,0.85)';
						ctx.fill();
						ctx.fillStyle = '#fff';
						ctx.font = 'bold 14px system-ui';
						ctx.textAlign = 'center';
						ctx.fillText('−', ex, ey + wave + 1);
					} else {
						ctx.beginPath();
						ctx.arc(ex, ey + wave, 6, 0, Math.PI * 2);
						ctx.strokeStyle = 'rgba(251,191,36,0.8)';
						ctx.lineWidth = 1.5;
						ctx.stroke();
						ctx.fillStyle = 'rgba(251,191,36,0.15)';
						ctx.fill();
						ctx.fillStyle = 'rgba(251,191,36,0.9)';
						ctx.font = 'bold 14px system-ui';
						ctx.textAlign = 'center';
						ctx.fillText('+', ex, ey + wave + 1);
					}
				}
			}
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('Positive energy states (empty by default)', w / 2, midY - gap * 0.4);
			for (const p of pairs) {
				if (p.life === 0) {
					if (p.holeCol === undefined) p.holeCol = Math.floor(Math.random() * cols);
					p.holeRow = 0;
					p.startY = seaTop + 24 + rowH / 2;
				}
				const progress = Math.min(1, p.life / 0.8);
				if (p.life < 0.3) {
					const alpha = 1 - p.life / 0.3;
					ctx.strokeStyle = `rgba(250,204,21,${alpha})`;
					ctx.lineWidth = 2;
					ctx.setLineDash([4, 3]);
					const flashY = midY - gap - (p.life / 0.3) * h * 0.25;
					const px2 = 44 + (p.holeCol || 0) * colW + colW / 2;
					ctx.beginPath();
					ctx.moveTo(px2 - 20, flashY + 40);
					ctx.lineTo(px2 + 20, flashY);
					ctx.stroke();
					ctx.setLineDash([]);
					ctx.fillStyle = `rgba(250,204,21,${alpha})`;
					ctx.font = 'bold 14px system-ui';
					ctx.textAlign = 'center';
					ctx.fillText('γ', px2 + 25, flashY);
				}
				if (progress > 0.1) {
					const eAlpha = Math.min(1, (progress - 0.1) / 0.3);
					const px2 = 44 + (p.holeCol || 0) * colW + colW / 2;
					const sy = (p.startY || 0) - progress * ((p.startY || 0) - (midY - gap * 2.2));
					ctx.beginPath();
					ctx.arc(px2, sy, 8, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(96,165,250,${eAlpha * 0.9})`;
					ctx.fill();
					ctx.fillStyle = '#fff';
					ctx.font = 'bold 15px system-ui';
					ctx.textAlign = 'center';
					ctx.fillText('e⁻', px2, sy + 4);
				}
				p.life += 0.012;
			}
			while (pairs.length && pairs[0].life > 2.5) pairs.shift();
			if (running) t += 0.016;
		}

		canvas.style.cursor = 'crosshair';
		canvas.addEventListener(
			'click',
			(e) => {
				const rect = canvas.getBoundingClientRect();
				const clickX = e.clientX - rect.left;
				const colW2 = (w - 60) / 12;
				const col = Math.max(0, Math.min(11, Math.floor((clickX - 44) / colW2)));
				const midY2 = h * 0.42,
					seaTop2 = midY2 + 30,
					rowH2 = (h - seaTop2 - 20) / 5;
				pairs.push({
					t: 0,
					x: clickX,
					life: 0,
					holeCol: col,
					holeRow: 0,
					startY: seaTop2 + 24 + rowH2 / 2
				});
			},
			{ signal: ac.signal }
		);

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
	<canvas bind:this={canvas} data-height="380" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="controls">
		<button class="viz-btn" class:viz-btn-active={running} on:click={() => (running = !running)}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="viz-btn" on:click={() => triggerPair()}>⚡ Pair Create</button>
	</svelte:fragment>
	<svelte:fragment slot="caption">
		The sea of filled negative-energy states (bottom). A sufficiently energetic photon (γ) can
		excite an electron into a positive-energy state, leaving a hole — the positron (e⁺). This is
		pair production. The reverse — pair annihilation — also happens.
	</svelte:fragment>
</VizCard>
