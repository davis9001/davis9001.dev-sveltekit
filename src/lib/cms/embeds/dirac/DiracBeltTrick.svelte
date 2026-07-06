<!--
  Dirac embed: the 720° spinor belt trick visualization.
  Extracted from the original /update/why-dirac-is-my-hostname page.
  Drag horizontally to scrub the rotation.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getVar, observeCanvasResize, setupCanvas, startLoop } from './canvas-utils';
	import VizCard from './VizCard.svelte';

	export let title = 'Visualization 2 — The 720° Spinor (Belt Trick)';

	let canvas: HTMLCanvasElement;
	let running = true;

	let reset: () => void = () => {};

	onMount(() => {
		const setup = setupCanvas(canvas);
		if (!setup) return;
		let { ctx, w, h } = setup;
		let angle = 0;
		let dragging = false,
			dragStartX = 0,
			dragStartAngle = 0;
		const ac = new AbortController();
		const { signal } = ac;

		reset = () => {
			angle = 0;
		};

		canvas.style.cursor = 'ew-resize';
		canvas.addEventListener(
			'mousedown',
			(e) => {
				dragging = true;
				dragStartX = e.clientX;
				dragStartAngle = angle;
				running = false;
			},
			{ signal }
		);
		window.addEventListener(
			'mousemove',
			(e) => {
				if (!dragging) return;
				angle = dragStartAngle + ((e.clientX - dragStartX) / w) * Math.PI * 8;
			},
			{ signal }
		);
		window.addEventListener('mouseup', () => (dragging = false), { signal });
		canvas.addEventListener(
			'touchstart',
			(e) => {
				e.preventDefault();
				dragging = true;
				dragStartX = e.touches[0].clientX;
				dragStartAngle = angle;
				running = false;
			},
			{ passive: false, signal }
		);
		canvas.addEventListener(
			'touchmove',
			(e) => {
				e.preventDefault();
				if (!dragging) return;
				angle = dragStartAngle + ((e.touches[0].clientX - dragStartX) / w) * Math.PI * 8;
			},
			{ passive: false, signal }
		);
		canvas.addEventListener('touchend', () => (dragging = false), { signal });

		const mkRgba = (c: string, a: number): string =>
			c.replace('rgb(', 'rgba(').replace(')', `, ${Math.max(0, Math.min(1, a))})`);

		// Ribbon drawn as per-segment quads so front/back faces are visually distinct.
		function drawRibbon(
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			twistTurns: number,
			frontColor: string,
			alpha: number
		) {
			const dx = x2 - x1,
				dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy);
			const steps = 44,
				halfW = 10;
			const nx = -dy / len,
				ny = dx / len;
			// Pass 0: back faces; Pass 1: front faces on top
			for (let pass = 0; pass < 2; pass++) {
				for (let i = 0; i < steps; i++) {
					const face = Math.cos(twistTurns * Math.PI * 2 * ((i + 0.5) / steps));
					if (pass === 0 && face >= 0) continue;
					if (pass === 1 && face < 0) continue;
					const segW = Math.abs(face) * halfW + 0.8;
					const ax = x1 + dx * (i / steps),
						ay = y1 + dy * (i / steps);
					const bx2 = x1 + dx * ((i + 1) / steps),
						by2 = y1 + dy * ((i + 1) / steps);
					ctx.beginPath();
					ctx.moveTo(ax + nx * segW, ay + ny * segW);
					ctx.lineTo(bx2 + nx * segW, by2 + ny * segW);
					ctx.lineTo(bx2 - nx * segW, by2 - ny * segW);
					ctx.lineTo(ax - nx * segW, ay - ny * segW);
					ctx.closePath();
					ctx.fillStyle =
						pass === 1
							? mkRgba(frontColor, alpha * (0.65 + 0.35 * face))
							: `rgba(0, 0, 0, ${alpha * (0.5 + 0.35 * Math.abs(face))})`;
					ctx.fill();
				}
			}
			// Silhouette outline traces the folded edge
			ctx.beginPath();
			for (let i = 0; i <= steps; i++) {
				const s = i / steps,
					ow = Math.cos(twistTurns * Math.PI * 2 * s) * halfW;
				const px = x1 + dx * s,
					py = y1 + dy * s;
				if (i === 0) ctx.moveTo(px + nx * ow, py + ny * ow);
				else ctx.lineTo(px + nx * ow, py + ny * ow);
			}
			for (let i = steps; i >= 0; i--) {
				const s = i / steps,
					ow = Math.cos(twistTurns * Math.PI * 2 * s) * halfW;
				ctx.lineTo(x1 + dx * s - nx * ow, y1 + dy * s - ny * ow);
			}
			ctx.closePath();
			ctx.strokeStyle = mkRgba(frontColor, alpha * 0.4);
			ctx.lineWidth = 0.8;
			ctx.stroke();
		}

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const fg = getVar('--color-text');
			const accent = getVar('--color-accent');
			const muted = getVar('--color-text-secondary');
			const cx = w / 2,
				cy = h * 0.48;
			const r = Math.min(w, h) * 0.115;
			const normDeg = ((((angle * 180) / Math.PI) % 720) + 720) % 720;
			const isSecondHalf = normDeg >= 360;
			const stateColor = isSecondHalf ? accent : '#f97316';

			// Header
			ctx.fillStyle = stateColor;
			ctx.font = 'bold 15px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText(`${Math.round(normDeg)}° / 720°`, cx, 22);
			ctx.font = '13px system-ui';
			ctx.fillStyle = muted;
			ctx.fillText(
				isSecondHalf ? 'ψ → +ψ  (belts untwisting)' : 'ψ → −ψ  (belts twisting)',
				cx,
				38
			);

			// Environment box + wall anchor pegs
			const bxSpan = Math.min(w * 0.37, 140),
				bySpan = h * 0.295;
			const pts = [
				{ x: cx - bxSpan, y: cy - bySpan },
				{ x: cx + bxSpan, y: cy - bySpan },
				{ x: cx - bxSpan, y: cy + bySpan },
				{ x: cx + bxSpan, y: cy + bySpan }
			];
			ctx.strokeStyle = muted + '44';
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 5]);
			ctx.strokeRect(pts[0].x - 10, pts[0].y - 10, bxSpan * 2 + 20, bySpan * 2 + 20);
			ctx.setLineDash([]);
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('Environment (fixed)', cx, pts[0].y - 14);
			pts.forEach((pt) => {
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
				ctx.fillStyle = muted + '77';
				ctx.fill();
				ctx.strokeStyle = muted;
				ctx.lineWidth = 1.5;
				ctx.stroke();
			});

			// Smooth raised-cosine twist envelope over 720°
			const cycleAngle = ((angle % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
			const cycleT = cycleAngle / (4 * Math.PI);
			const totalTwist = 0.5 * (1 - Math.cos(cycleT * 2 * Math.PI));

			// Ribbons — rotating pegs on disk rim to fixed wall anchors
			const ribbonColors = [
				'rgb(96,165,250)',
				'rgb(251,191,36)',
				'rgb(249,115,22)',
				'rgb(167,139,250)'
			];
			pts.forEach((pt, i) => {
				const pAngle = angle + (i * Math.PI) / 2;
				drawRibbon(
					cx + Math.cos(pAngle) * r,
					cy + Math.sin(pAngle) * r,
					pt.x,
					pt.y,
					totalTwist + i * 0.25,
					ribbonColors[i],
					0.88
				);
			});

			// Disk
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(angle);

			// Glow ring
			const glowR = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
			glowR.addColorStop(0, stateColor + '22');
			glowR.addColorStop(1, 'transparent');
			ctx.fillStyle = glowR;
			ctx.beginPath();
			ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
			ctx.fill();

			// Disk face
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fillStyle = getVar('--color-surface');
			ctx.fill();
			ctx.strokeStyle = stateColor;
			ctx.lineWidth = 2.5;
			ctx.stroke();

			// Spinor phasor — rotates at half the disk speed, directly showing ψ phase.
			// In disk-local coords it sits at −angle/2, so in world space it's at angle/2.
			const phasorAngle = -angle / 2,
				pLen = r * 0.68;
			const ptx = Math.cos(phasorAngle) * pLen,
				pty = Math.sin(phasorAngle) * pLen;
			ctx.strokeStyle = stateColor;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(ptx, pty);
			ctx.stroke();
			const ha = Math.atan2(pty, ptx);
			ctx.beginPath();
			ctx.moveTo(ptx, pty);
			ctx.lineTo(ptx - 9 * Math.cos(ha - 0.42), pty - 9 * Math.sin(ha - 0.42));
			ctx.lineTo(ptx - 9 * Math.cos(ha + 0.42), pty - 9 * Math.sin(ha + 0.42));
			ctx.closePath();
			ctx.fillStyle = stateColor;
			ctx.fill();

			// Colour-coded rim pegs (ribbon attachment points)
			ribbonColors.forEach((c, i) => {
				const pa = (i * Math.PI) / 2;
				ctx.beginPath();
				ctx.arc(Math.cos(pa) * r, Math.sin(pa) * r, 4.5, 0, Math.PI * 2);
				ctx.fillStyle = mkRgba(c, 0.95);
				ctx.fill();
				ctx.strokeStyle = 'rgba(255,255,255,0.5)';
				ctx.lineWidth = 1;
				ctx.stroke();
			});
			ctx.restore();

			// Labels below disk
			ctx.fillStyle = fg;
			ctx.font = 'bold 14px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('spin-½', cx, cy + r + 20);
			ctx.fillStyle = stateColor;
			ctx.font = '13px system-ui';
			ctx.fillText(`ψ = ${Math.cos(angle / 2).toFixed(2)}`, cx, cy + r + 38);

			// Phase bar
			const phase = Math.cos(angle / 2),
				phaseT = (phase + 1) / 2;
			const barW = Math.min(200, w * 0.44),
				barX = cx - barW / 2,
				barY = h - 32;
			ctx.fillStyle = muted;
			ctx.font = '13px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('spinor phase  ψ', cx, barY - 10);
			ctx.font = '12px system-ui';
			ctx.textAlign = 'right';
			ctx.fillStyle = '#f97316';
			ctx.fillText('−1', barX - 4, barY + 9);
			ctx.textAlign = 'left';
			ctx.fillStyle = accent;
			ctx.fillText('+1', barX + barW + 4, barY + 9);
			ctx.fillStyle = getVar('--color-border');
			ctx.roundRect(barX, barY, barW, 10, 5);
			ctx.fill();
			ctx.fillStyle = stateColor;
			ctx.roundRect(barX + barW / 2, barY, (phaseT - 0.5) * barW, 10, 3);
			ctx.fill();
			ctx.shadowColor = 'rgba(0,0,0,0.85)';
			ctx.shadowBlur = 5;
			ctx.fillStyle = '#fff';
			ctx.font = 'bold 15px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText(
				phase.toFixed(2),
				cx + (phaseT - 0.5) * barW + (phaseT > 0.5 ? 20 : -20),
				barY + 9
			);
			ctx.shadowBlur = 0;

			// Drag hint at bottom
			ctx.fillStyle = muted + '55';
			ctx.font = '11px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText(dragging ? 'scrubbing…' : 'drag to scrub · play to animate', cx, h - 6);

			if (running) angle += 0.008;
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
	<canvas bind:this={canvas} data-height="360" style="width:100%;display:block;border-radius:8px;"
	></canvas>
	<svelte:fragment slot="controls">
		<button class="viz-btn" class:viz-btn-active={running} on:click={() => (running = !running)}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="viz-btn" on:click={() => reset()}>↺ Reset</button>
	</svelte:fragment>
	<svelte:fragment slot="caption">
		A spin-½ particle (center) connected to its environment by "belts." Rotating 360° twists the
		belts — the state picks up a factor of −1. Only after a full 720° rotation do the belts untwist
		and return to their original configuration. This topological property is real and measurable.
	</svelte:fragment>
</VizCard>
