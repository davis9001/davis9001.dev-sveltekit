<!--
  Dirac embed: "i as a 90° rotation" complex-plane visualization.
  Extracted from the original /update/why-dirac-is-my-hostname page;
  window-global button wiring replaced with component state, and the
  rAF loop / ResizeObserver / listeners are cleaned up on destroy.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'Visualization 0 — i as a 90° Rotation (Complex Plane)';

	let canvas: HTMLCanvasElement;
	let running = true;
	let dragging = false;

	let step: () => void = () => {};

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let t = 0;

		canvas.style.cursor = 'crosshair';
		const ac = new AbortController();
		const { signal } = ac;

		function handleDrag(clientX: number, clientY: number) {
			const rect = canvas.getBoundingClientRect();
			const mx = clientX - rect.left,
				my = clientY - rect.top;
			const cx = w < 480 ? w * 0.5 : w * 0.4;
			const cy = w < 480 ? 185 : h * 0.52;
			const dx = mx - cx,
				dy = my - cy;
			if (Math.sqrt(dx * dx + dy * dy) < 8) return;
			t = -Math.atan2(dy, dx) / 0.6;
		}

		canvas.addEventListener(
			'mousedown',
			(e) => {
				dragging = true;
				running = false;
				handleDrag(e.clientX, e.clientY);
			},
			{ signal }
		);
		canvas.addEventListener(
			'mousemove',
			(e) => {
				if (dragging) handleDrag(e.clientX, e.clientY);
			},
			{ signal }
		);
		canvas.addEventListener('mouseup', () => (dragging = false), { signal });
		canvas.addEventListener('mouseleave', () => (dragging = false), { signal });
		canvas.addEventListener(
			'touchstart',
			(e) => {
				e.preventDefault();
				dragging = true;
				running = false;
				handleDrag(e.touches[0].clientX, e.touches[0].clientY);
			},
			{ passive: false, signal }
		);
		canvas.addEventListener(
			'touchmove',
			(e) => {
				e.preventDefault();
				if (dragging) handleDrag(e.touches[0].clientX, e.touches[0].clientY);
			},
			{ passive: false, signal }
		);
		canvas.addEventListener('touchend', () => (dragging = false), { signal });

		step = () => {
			const currentAngle = t * 0.6;
			const snapped = Math.round(currentAngle / (Math.PI / 2)) * (Math.PI / 2);
			t = (snapped + Math.PI / 2) / 0.6;
			running = false;
		};

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const fg = getVar('--color-text');
			const accent = getVar('--color-accent');
			const muted = getVar('--color-text-secondary');
			const surface = getVar('--color-surface');

			const MOBILE = w < 480;
			const cx = MOBILE ? w * 0.5 : w * 0.4;
			const cy = MOBILE ? 185 : h * 0.52;
			const R = Math.min(cx - 16, cy - 24, MOBILE ? 140 : h * 0.42);

			ctx.beginPath();
			ctx.arc(cx, cy, R, 0, Math.PI * 2);
			ctx.strokeStyle = muted + '44';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			ctx.strokeStyle = muted + '55';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(cx - R - 10, cy);
			ctx.lineTo(cx + R + 18, cy);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(cx, cy - R - 10);
			ctx.lineTo(cx, cy + R + 18);
			ctx.stroke();

			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('Real', cx + R + 18, cy - 8);
			ctx.fillText('Im', cx - 2, cy - R - 14);

			const keyPts = [
				{ re: 1, im: 0, label: '1', offX: 10, offY: 14 },
				{ re: 0, im: -1, label: 'i', offX: 8, offY: -8 },
				{ re: -1, im: 0, label: '−1', offX: -18, offY: 14 },
				{ re: 0, im: 1, label: '−i', offX: 8, offY: 16 }
			];
			keyPts.forEach((p) => {
				const px = cx + p.re * R,
					py = cy + p.im * R;
				ctx.beginPath();
				ctx.arc(px, py, 3, 0, Math.PI * 2);
				ctx.fillStyle = accent;
				ctx.fill();
				ctx.fillStyle = accent;
				ctx.font = 'bold 14px Georgia, serif';
				ctx.textAlign = 'left';
				ctx.fillText(p.label, px + p.offX, py + p.offY);
			});

			const vectorAngle = -t * 0.6;
			const vx = cx + Math.cos(vectorAngle) * R;
			const vy = cy + Math.sin(vectorAngle) * R;

			for (let s = 80; s >= 0; s--) {
				const ta = -(t - s * 0.018) * 0.6;
				const tx2 = cx + Math.cos(ta) * R,
					ty2 = cy + Math.sin(ta) * R;
				const alpha = ((80 - s) / 80) * 0.4;
				ctx.beginPath();
				ctx.arc(tx2, ty2, 2.5, 0, Math.PI * 2);
				ctx.fillStyle =
					accent +
					Math.round(alpha * 255)
						.toString(16)
						.padStart(2, '0');
				ctx.fill();
			}

			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(vx, vy);
			ctx.strokeStyle = accent;
			ctx.lineWidth = 2.5;
			ctx.stroke();
			const ha = Math.atan2(vy - cy, vx - cx);
			ctx.beginPath();
			ctx.moveTo(vx, vy);
			ctx.lineTo(vx - 11 * Math.cos(ha - 0.38), vy - 11 * Math.sin(ha - 0.38));
			ctx.lineTo(vx - 11 * Math.cos(ha + 0.38), vy - 11 * Math.sin(ha + 0.38));
			ctx.closePath();
			ctx.fillStyle = accent;
			ctx.fill();

			const tipPulse = 0.75 + 0.25 * Math.sin(t * 3);
			const glowG = ctx.createRadialGradient(vx, vy, 0, vx, vy, 14);
			glowG.addColorStop(
				0,
				accent +
					Math.round(0.4 * tipPulse * 255)
						.toString(16)
						.padStart(2, '0')
			);
			glowG.addColorStop(1, 'transparent');
			ctx.fillStyle = glowG;
			ctx.beginPath();
			ctx.arc(vx, vy, 14, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(vx, vy, 5.5, 0, Math.PI * 2);
			ctx.fillStyle = accent;
			ctx.fill();

			const realPart = Math.cos(vectorAngle);
			const imagPart = -Math.sin(vectorAngle);
			const realStr = realPart.toFixed(3);
			const imagSign = imagPart >= 0 ? '+' : '';
			const imagStr = `${imagSign}${imagPart.toFixed(3)}i`;
			const angleDeg = ((((-vectorAngle * 180) / Math.PI) % 360) + 360) % 360;

			const lx = MOBILE ? 16 : w * 0.69;
			const ly = MOBILE ? cy + R + 36 : h * 0.14;
			if (!MOBILE) {
				ctx.fillStyle = surface + 'dd';
				ctx.roundRect(lx - 8, ly - 8, w - lx, 210, 8);
				ctx.fill();
				ctx.strokeStyle = getVar('--color-border');
				ctx.lineWidth = 1;
				ctx.stroke();
			}
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('current value:', lx, ly + 4);
			ctx.fillStyle = fg;
			ctx.font = 'bold 15px system-ui';
			ctx.fillText(`z = ${realStr}`, lx, ly + 20);
			ctx.fillText(`    ${imagStr}`, lx, ly + 36);
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.fillText(`angle: ${angleDeg.toFixed(1)}°`, lx, ly + 56);
			ctx.fillText('magnitude:', lx, ly + 76);
			ctx.fillStyle = accent;
			ctx.font = 'bold 15px system-ui';
			ctx.fillText('|z| = 1.000', lx, ly + 92);
			ctx.fillStyle = muted;
			ctx.font = '12px system-ui';
			ctx.fillText('← always exactly 1', lx, ly + 106);
			ctx.fillStyle = fg;
			ctx.font = '13px system-ui';
			ctx.fillText('P = |ψ|² = |z|² = 1', lx, ly + 126);
			ctx.fillText("rotation can't change |z|", lx, ly + 140);
			ctx.fillStyle = accent;
			ctx.font = 'bold 15px system-ui';
			ctx.fillText('∴ probability conserved ✓', lx, ly + 156);

			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('×i each 90°', cx, cy - R - 18);
			ctx.fillStyle = muted + '66';
			ctx.font = '11px system-ui';
			ctx.fillText(dragging ? 'dragging…' : 'drag anywhere to explore', cx, cy + R + 22);

			if (running) t += 0.016;
		}

		const stopLoop = startLoop(draw);
		const resize = observeCanvasResize(
			canvas,
			(s) => {
				ctx = s.ctx;
				w = s.w;
				h = s.h;
			},
			{ mobileHeight: 540, desktopHeight: 300 }
		);

		return () => {
			stopLoop();
			resize.disconnect();
			ac.abort();
		};
	});
</script>

<VizCard {title}>
	<canvas bind:this={canvas} data-height="300" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="controls">
		<button class="viz-btn" class:viz-btn-active={running} on:click={() => (running = !running)}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="viz-btn" on:click={() => step()}>× i → +90°</button>
	</svelte:fragment>
	<svelte:fragment slot="caption">
		Multiplying any complex number by <em>i</em> rotates it 90° counterclockwise — always. The magnitude
		(distance from origin) never changes. Since |ψ|² is probability, and rotation preserves magnitude,
		total probability is conserved through all time evolution.
	</svelte:fragment>
</VizCard>
