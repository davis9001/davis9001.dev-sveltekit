<!--
  Blog Post: Why Dirac is My Hostname
  A dedicated page (not markdown) because it has interactive canvas animations.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	const POST = {
		title: 'Why Dirac is My Hostname',
		publishedAt: '2026-06-26T00:00:00Z',
		summary:
			"How I named my workstation after Paul Dirac when I installed Omarchy, and everything I've learned about the Dirac equation since — with interactive animations.",
		tags: ['linux', 'physics', 'omarchy', 'dirac', 'quantum-mechanics', 'interactive']
	};

	function getVar(name: string): string {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	function setupCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } {
		const dpr = window.devicePixelRatio || 1;
		const h = parseInt(canvas.getAttribute('data-height') || '300');
		canvas.height = h * dpr;
		canvas.style.height = h + 'px';
		// Use parent clientWidth as fallback: getBoundingClientRect can return 0 at mount time
		// on mobile before layout is fully computed.
		const rect = canvas.getBoundingClientRect();
		const w = rect.width || canvas.parentElement?.clientWidth || 300;
		canvas.width = w * dpr;
		const ctx = canvas.getContext('2d')!;
		ctx.scale(dpr, dpr);
		return { ctx, w, h };
	}

	onMount(() => {
		// ── ANIMATION 0: Complex Plane / i as Rotation ──────────────────
		(function () {
			const canvas = document.getElementById('complexCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let t = 0,
				complexRunning = true, isDragging = false;

			canvas.style.cursor = 'crosshair';

			function handleComplexDrag(clientX: number, clientY: number) {
				const rect = canvas.getBoundingClientRect();
				const mx = clientX - rect.left, my = clientY - rect.top;
				const cx = w * 0.40, cy = h * 0.52;
				const dx = mx - cx, dy = my - cy;
				if (Math.sqrt(dx * dx + dy * dy) < 8) return;
				t = -Math.atan2(dy, dx) / 0.6;
			}
			canvas.addEventListener('mousedown', (e) => {
				isDragging = true; complexRunning = false;
				const btn = document.getElementById('complexPlayBtn');
				if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); }
				handleComplexDrag(e.clientX, e.clientY);
			});
			canvas.addEventListener('mousemove', (e) => { if (isDragging) handleComplexDrag(e.clientX, e.clientY); });
			canvas.addEventListener('mouseup', () => { isDragging = false; });
			canvas.addEventListener('mouseleave', () => { isDragging = false; });
			canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDragging = true; complexRunning = false; handleComplexDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
			canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDragging) handleComplexDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
			canvas.addEventListener('touchend', () => { isDragging = false; });

			(window as any).toggleComplex = () => {
				complexRunning = !complexRunning;
				const btn = document.getElementById('complexPlayBtn');
				if (btn) {
					btn.textContent = complexRunning ? '⏸ Pause' : '▶ Play';
					btn.classList.toggle('viz-btn-active', complexRunning);
				}
			};
			(window as any).stepComplex = () => {
				const currentAngle = t * 0.6;
				const snapped = Math.round(currentAngle / (Math.PI / 2)) * (Math.PI / 2);
				t = (snapped + Math.PI / 2) / 0.6;
				complexRunning = false;
				const btn = document.getElementById('complexPlayBtn');
				if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); }
			};

			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text');
				const accent = getVar('--color-accent');
				const muted = getVar('--color-text-secondary');
				const surface = getVar('--color-surface');

				const cx = w * 0.40, cy = h * 0.52;
				const R = Math.min(cx - 20, cy - 24, h * 0.42);

				ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
				ctx.strokeStyle = muted + '44'; ctx.lineWidth = 1.5; ctx.stroke();

				ctx.strokeStyle = muted + '55'; ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(cx - R - 10, cy); ctx.lineTo(cx + R + 18, cy); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(cx, cy - R - 10); ctx.lineTo(cx, cy + R + 18); ctx.stroke();

				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('Real', cx + R + 18, cy - 8);
				ctx.fillText('Im', cx - 2, cy - R - 14);

				const keyPts = [
					{ re: 1, im: 0, label: '1', offX: 10, offY: 14 },
					{ re: 0, im: -1, label: 'i', offX: 8, offY: -8 },
					{ re: -1, im: 0, label: '−1', offX: -18, offY: 14 },
					{ re: 0, im: 1, label: '−i', offX: 8, offY: 16 }
				];
				keyPts.forEach((p) => {
					const px = cx + p.re * R, py = cy + p.im * R;
					ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
					ctx.fillStyle = accent; ctx.fill();
					ctx.fillStyle = accent; ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'left';
					ctx.fillText(p.label, px + p.offX, py + p.offY);
				});

				const vectorAngle = -t * 0.6;
				const vx = cx + Math.cos(vectorAngle) * R;
				const vy = cy + Math.sin(vectorAngle) * R;

				for (let s = 80; s >= 0; s--) {
					const ta = -(t - s * 0.018) * 0.6;
					const tx2 = cx + Math.cos(ta) * R, ty2 = cy + Math.sin(ta) * R;
					const alpha = ((80 - s) / 80) * 0.4;
					ctx.beginPath(); ctx.arc(tx2, ty2, 2.5, 0, Math.PI * 2);
					ctx.fillStyle = accent + Math.round(alpha * 255).toString(16).padStart(2, '0');
					ctx.fill();
				}

				ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, vy);
				ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke();
				const ha = Math.atan2(vy - cy, vx - cx);
				ctx.beginPath();
				ctx.moveTo(vx, vy);
				ctx.lineTo(vx - 11 * Math.cos(ha - 0.38), vy - 11 * Math.sin(ha - 0.38));
				ctx.lineTo(vx - 11 * Math.cos(ha + 0.38), vy - 11 * Math.sin(ha + 0.38));
				ctx.closePath(); ctx.fillStyle = accent; ctx.fill();

				const tipPulse = 0.75 + 0.25 * Math.sin(t * 3);
				const glowG = ctx.createRadialGradient(vx, vy, 0, vx, vy, 14);
				glowG.addColorStop(0, accent + Math.round(0.4 * tipPulse * 255).toString(16).padStart(2, '0'));
				glowG.addColorStop(1, 'transparent');
				ctx.fillStyle = glowG; ctx.beginPath(); ctx.arc(vx, vy, 14, 0, Math.PI * 2); ctx.fill();
				ctx.beginPath(); ctx.arc(vx, vy, 5.5, 0, Math.PI * 2);
				ctx.fillStyle = accent; ctx.fill();

				const realPart = Math.cos(vectorAngle);
				const imagPart = -Math.sin(vectorAngle);
				const realStr = realPart.toFixed(3);
				const imagSign = imagPart >= 0 ? '+' : '';
				const imagStr = `${imagSign}${imagPart.toFixed(3)}i`;
				const angleDeg = ((-vectorAngle * 180 / Math.PI) % 360 + 360) % 360;

				const lx = w * 0.69, ly = h * 0.14;
				ctx.fillStyle = surface + 'dd';
				ctx.roundRect(lx - 8, ly - 8, w - lx, 210, 8); ctx.fill();
				ctx.strokeStyle = getVar('--color-border'); ctx.lineWidth = 1; ctx.stroke();

				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
				ctx.fillText('current value:', lx, ly + 4);
				ctx.fillStyle = fg; ctx.font = 'bold 15px system-ui';
				ctx.fillText(`z = ${realStr}`, lx, ly + 20);
				ctx.fillText(`    ${imagStr}`, lx, ly + 36);
				ctx.fillStyle = muted; ctx.font = '13px system-ui';
				ctx.fillText(`angle: ${angleDeg.toFixed(1)}°`, lx, ly + 56);
				ctx.fillText('magnitude:', lx, ly + 76);
				ctx.fillStyle = accent; ctx.font = 'bold 15px system-ui';
				ctx.fillText('|z| = 1.000', lx, ly + 92);
				ctx.fillStyle = muted; ctx.font = '12px system-ui';
				ctx.fillText('← always exactly 1', lx, ly + 106);
				ctx.fillStyle = fg; ctx.font = '13px system-ui';
				ctx.fillText('P = |ψ|² = |z|² = 1', lx, ly + 126);
				ctx.fillText("rotation can't change |z|", lx, ly + 140);
				ctx.fillStyle = accent; ctx.font = 'bold 15px system-ui';
				ctx.fillText('∴ probability conserved ✓', lx, ly + 156);

				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('×i each 90°', cx, cy - R - 18);
				ctx.fillStyle = muted + '66'; ctx.font = '11px system-ui';
				ctx.fillText(isDragging ? 'dragging…' : 'drag anywhere to explore', cx, cy + R + 22);

				if (complexRunning) t += 0.016;
			}
			function loop() { draw(); requestAnimationFrame(loop); }
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			loop();
		})();

		// ── ANIMATION 1: Equation Canvas ─────────────────────────────────
		(function () {
			const canvas = document.getElementById('eqCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let t = 0;
			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text');
				const accent = getVar('--color-accent');
				const muted = getVar('--color-text-secondary');
				const glow = 0.55 + 0.45 * Math.sin(t * 1.5);
				const cx = w / 2, cy = h / 2;
				const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.5);
				grad.addColorStop(0, `rgba(36,209,96,${0.07 * glow})`);
				grad.addColorStop(1, 'transparent');
				ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
				ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
				const eqFontSize = Math.max(32, Math.min(100, w / 10));
				const sub = eqFontSize * 0.65;
				// Draw as one string to avoid manual positioning issues on narrow screens
				ctx.font = `bold ${eqFontSize}px Georgia, serif`;
				ctx.shadowColor = `rgba(36,209,96,${0.7 * glow})`; ctx.shadowBlur = 18 * glow;
				ctx.fillStyle = fg;
				// Measure parts for accurate subscript placement
				const part1 = '(iγᵘ∂';
				const part2 = ' − m)ψ = 0';
				const w1 = ctx.measureText(part1).width;
				const w2 = ctx.measureText(part2).width;
				const subW = ctx.measureText('μ').width * (sub / eqFontSize);
				const totalW = w1 + subW + w2;
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
					ctx.font = `${labelSize}px system-ui`; ctx.fillStyle = muted; ctx.textAlign = 'center';
					[{ x: cx - totalW * 0.38, text: 'γᵘ: gamma matrices' }, { x: cx, text: '∂ᵤ: four-gradient' }, { x: cx + totalW * 0.38, text: 'ψ: Dirac spinor' }]
						.forEach(l => ctx.fillText(l.text, l.x, labelY));
				}
				ctx.textAlign = 'left'; t += 0.016;
			}
			function loop() { draw(); requestAnimationFrame(loop); }
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			loop();
		})();

		// ── ANIMATION 2: Dirac Sea ────────────────────────────────────────
		(function () {
			const canvas = document.getElementById('seaCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let t = 0, seaRunning = true;
			const pairs: { t: number; x: number; life: number; holeCol?: number; holeRow?: number; startY?: number }[] = [];
			(window as any).toggleSea = () => {
				seaRunning = !seaRunning;
				const btn = document.getElementById('seaPlayBtn');
				if (btn) { btn.textContent = seaRunning ? '⏸ Pause' : '▶ Play'; btn.classList.toggle('viz-btn-active', seaRunning); }
			};
			(window as any).triggerPair = () => pairs.push({ t: 0, x: w * (0.25 + Math.random() * 0.5), life: 0 });
			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text'); const accent = getVar('--color-accent'); const muted = getVar('--color-text-secondary');
				const midY = h * 0.42, seaTop = midY + 30;
				ctx.save(); ctx.translate(22, h / 2); ctx.rotate(-Math.PI / 2);
				ctx.textAlign = 'center'; ctx.font = '13px system-ui'; ctx.fillStyle = muted; ctx.fillText('Energy E', 0, 0); ctx.restore();
				ctx.strokeStyle = muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(40, midY); ctx.lineTo(w - 10, midY); ctx.stroke(); ctx.setLineDash([]);
				ctx.font = '13px system-ui'; ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText('E = 0', 42, midY - 6);
				const gap = h * 0.12, posLine = midY - gap, negLine = midY + gap;
				ctx.strokeStyle = accent + '55'; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(40, posLine); ctx.lineTo(w - 10, posLine); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(40, negLine); ctx.lineTo(w - 10, negLine); ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = accent; ctx.font = '13px system-ui'; ctx.textAlign = 'right';
				ctx.fillText('+mc²', w - 12, posLine - 4); ctx.fillText('−mc²', w - 12, negLine + 14);
				const rows = 5, cols = 12, seaH = h - seaTop - 20, rowH = seaH / rows, colW = (w - 60) / cols;
				const seaGrad = ctx.createLinearGradient(0, seaTop, 0, h - 10);
				seaGrad.addColorStop(0, 'rgba(30,58,138,0.45)'); seaGrad.addColorStop(1, 'rgba(15,23,42,0.45)');
				ctx.fillStyle = seaGrad; ctx.roundRect(36, seaTop, w - 46, seaH + 10, 6); ctx.fill();
				ctx.fillStyle = '#3b82f6'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('DIRAC SEA  (all negative-energy states filled)', w / 2, seaTop + 14);
				const activePairs = pairs.filter(p => p.life < 1.5);
				for (let r = 0; r < rows; r++) {
					for (let c = 0; c < cols; c++) {
						const ex = 44 + c * colW + colW / 2, ey = seaTop + 24 + r * rowH + rowH / 2;
						const wave = Math.sin(t * 2 + c * 0.5 + r * 0.7) * 2;
						const isHole = activePairs.some(p => p.holeCol === c && p.holeRow === r && p.life > 0.3);
						if (!isHole) {
							ctx.beginPath(); ctx.arc(ex, ey + wave, 6, 0, Math.PI * 2);
							ctx.fillStyle = 'rgba(96,165,250,0.85)'; ctx.fill();
							ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('−', ex, ey + wave + 1);
						} else {
							ctx.beginPath(); ctx.arc(ex, ey + wave, 6, 0, Math.PI * 2);
							ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
							ctx.fillStyle = 'rgba(251,191,36,0.15)'; ctx.fill();
							ctx.fillStyle = 'rgba(251,191,36,0.9)'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', ex, ey + wave + 1);
						}
					}
				}
				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('Positive energy states (empty by default)', w / 2, midY - gap * 0.4);
				for (const p of pairs) {
					if (p.life === 0) { if (p.holeCol === undefined) p.holeCol = Math.floor(Math.random() * cols); p.holeRow = 0; p.startY = seaTop + 24 + rowH / 2; }
					const progress = Math.min(1, p.life / 0.8);
					if (p.life < 0.3) {
						const alpha = 1 - p.life / 0.3;
						ctx.strokeStyle = `rgba(250,204,21,${alpha})`; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
						const flashY = midY - gap - (p.life / 0.3) * h * 0.25;
						const px2 = 44 + (p.holeCol || 0) * colW + colW / 2;
						ctx.beginPath(); ctx.moveTo(px2 - 20, flashY + 40); ctx.lineTo(px2 + 20, flashY); ctx.stroke(); ctx.setLineDash([]);
						ctx.fillStyle = `rgba(250,204,21,${alpha})`; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('γ', px2 + 25, flashY);
					}
					if (progress > 0.1) {
						const eAlpha = Math.min(1, (progress - 0.1) / 0.3);
						const px2 = 44 + (p.holeCol || 0) * colW + colW / 2;
						const sy = (p.startY || 0) - progress * ((p.startY || 0) - (midY - gap * 2.2));
						ctx.beginPath(); ctx.arc(px2, sy, 8, 0, Math.PI * 2);
						ctx.fillStyle = `rgba(96,165,250,${eAlpha * 0.9})`; ctx.fill();
						ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('e⁻', px2, sy + 4);
					}
					p.life += 0.012;
				}
				while (pairs.length && pairs[0].life > 2.5) pairs.shift();
				if (seaRunning) t += 0.016;
			}
			canvas.style.cursor = 'crosshair';
			canvas.addEventListener('click', (e) => {
				const rect = canvas.getBoundingClientRect();
				const clickX = e.clientX - rect.left;
				const colW2 = (w - 60) / 12;
				const col = Math.max(0, Math.min(11, Math.floor((clickX - 44) / colW2)));
				const midY2 = h * 0.42, seaTop2 = midY2 + 30, rowH2 = (h - seaTop2 - 20) / 5;
				pairs.push({ t: 0, x: clickX, life: 0, holeCol: col, holeRow: 0, startY: seaTop2 + 24 + rowH2 / 2 });
			});
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			function loop() { draw(); requestAnimationFrame(loop); }
			loop();
		})();

		// ── ANIMATION 3: Belt Trick ───────────────────────────────────
		(function () {
			const canvas = document.getElementById('beltCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let angle = 0, beltRunning = true;
			(window as any).toggleBelt = () => {
				beltRunning = !beltRunning;
				const btn = document.getElementById('beltPlayBtn');
				if (btn) { btn.textContent = beltRunning ? '⏸ Pause' : '▶ Play'; btn.classList.toggle('viz-btn-active', beltRunning); }
			};
			(window as any).resetBelt = () => { angle = 0; };

			let beltDragging = false, beltDragStartX = 0, beltDragStartAngle = 0;
			canvas.style.cursor = 'ew-resize';
			canvas.addEventListener('mousedown', (e) => {
				beltDragging = true; beltDragStartX = e.clientX; beltDragStartAngle = angle;
				beltRunning = false;
				const btn = document.getElementById('beltPlayBtn');
				if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); }
			});
			window.addEventListener('mousemove', (e) => { if (!beltDragging) return; angle = beltDragStartAngle + (e.clientX - beltDragStartX) / w * Math.PI * 8; });
			window.addEventListener('mouseup', () => { beltDragging = false; });
			canvas.addEventListener('touchstart', (e) => { e.preventDefault(); beltDragging = true; beltDragStartX = e.touches[0].clientX; beltDragStartAngle = angle; beltRunning = false; const btn = document.getElementById('beltPlayBtn'); if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); } }, { passive: false });
			canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!beltDragging) return; angle = beltDragStartAngle + (e.touches[0].clientX - beltDragStartX) / w * Math.PI * 8; }, { passive: false });
			canvas.addEventListener('touchend', () => { beltDragging = false; });

			const mkRgba = (c: string, a: number): string =>
				c.replace('rgb(', 'rgba(').replace(')', `, ${Math.max(0, Math.min(1, a))})`);

			// Ribbon drawn as per-segment quads so front/back faces are visually distinct.
			function drawRibbon(
				x1: number, y1: number, x2: number, y2: number,
				twistTurns: number, frontColor: string, alpha: number
			) {
				const dx = x2 - x1, dy = y2 - y1;
				const len = Math.sqrt(dx * dx + dy * dy);
				const steps = 44, halfW = 10;
				const nx = -dy / len, ny = dx / len;
				// Pass 0: back faces; Pass 1: front faces on top
				for (let pass = 0; pass < 2; pass++) {
					for (let i = 0; i < steps; i++) {
						const face = Math.cos(twistTurns * Math.PI * 2 * ((i + 0.5) / steps));
						if (pass === 0 && face >= 0) continue;
						if (pass === 1 && face < 0) continue;
						const segW = Math.abs(face) * halfW + 0.8;
						const ax = x1 + dx * (i / steps), ay = y1 + dy * (i / steps);
						const bx2 = x1 + dx * ((i + 1) / steps), by2 = y1 + dy * ((i + 1) / steps);
						ctx.beginPath();
						ctx.moveTo(ax + nx * segW, ay + ny * segW);
						ctx.lineTo(bx2 + nx * segW, by2 + ny * segW);
						ctx.lineTo(bx2 - nx * segW, by2 - ny * segW);
						ctx.lineTo(ax - nx * segW, ay - ny * segW);
						ctx.closePath();
						ctx.fillStyle = pass === 1
							? mkRgba(frontColor, alpha * (0.65 + 0.35 * face))
							: `rgba(0, 0, 0, ${alpha * (0.50 + 0.35 * Math.abs(face))})`;
						ctx.fill();
					}
				}
				// Silhouette outline traces the folded edge
				ctx.beginPath();
				for (let i = 0; i <= steps; i++) {
					const s = i / steps, ow = Math.cos(twistTurns * Math.PI * 2 * s) * halfW;
					const px = x1 + dx * s, py = y1 + dy * s;
					i === 0 ? ctx.moveTo(px + nx * ow, py + ny * ow) : ctx.lineTo(px + nx * ow, py + ny * ow);
				}
				for (let i = steps; i >= 0; i--) {
					const s = i / steps, ow = Math.cos(twistTurns * Math.PI * 2 * s) * halfW;
					ctx.lineTo(x1 + dx * s - nx * ow, y1 + dy * s - ny * ow);
				}
				ctx.closePath();
				ctx.strokeStyle = mkRgba(frontColor, alpha * 0.4);
				ctx.lineWidth = 0.8; ctx.stroke();
			}

			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text');
				const accent = getVar('--color-accent');
				const muted = getVar('--color-text-secondary');
				const cx = w / 2, cy = h * 0.48;
				const r = Math.min(w, h) * 0.115;
				const normDeg = ((angle * 180 / Math.PI) % 720 + 720) % 720;
				const isSecondHalf = normDeg >= 360;
				const stateColor = isSecondHalf ? accent : '#f97316';

				// Header
				ctx.fillStyle = stateColor;
				ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
				ctx.fillText(`${Math.round(normDeg)}° / 720°`, cx, 22);
				ctx.font = '13px system-ui'; ctx.fillStyle = muted;
				ctx.fillText(isSecondHalf ? 'ψ → +ψ  (belts untwisting)' : 'ψ → −ψ  (belts twisting)', cx, 38);

				// Environment box + wall anchor pegs
				const bxSpan = Math.min(w * 0.37, 140), bySpan = h * 0.295;
				const pts = [
					{ x: cx - bxSpan, y: cy - bySpan }, { x: cx + bxSpan, y: cy - bySpan },
					{ x: cx - bxSpan, y: cy + bySpan }, { x: cx + bxSpan, y: cy + bySpan }
				];
				ctx.strokeStyle = muted + '44'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
				ctx.strokeRect(pts[0].x - 10, pts[0].y - 10, bxSpan * 2 + 20, bySpan * 2 + 20);
				ctx.setLineDash([]);
				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('Environment (fixed)', cx, pts[0].y - 14);
				pts.forEach(pt => {
					ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
					ctx.fillStyle = muted + '77'; ctx.fill();
					ctx.strokeStyle = muted; ctx.lineWidth = 1.5; ctx.stroke();
				});

				// Smooth raised-cosine twist envelope over 720°
				const cycleAngle = ((angle % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
				const cycleT = cycleAngle / (4 * Math.PI);
				const totalTwist = 0.5 * (1 - Math.cos(cycleT * 2 * Math.PI));

				// Ribbons — rotating pegs on disk rim to fixed wall anchors
				const ribbonColors = ['rgb(96,165,250)', 'rgb(251,191,36)', 'rgb(249,115,22)', 'rgb(167,139,250)'];
				pts.forEach((pt, i) => {
					const pAngle = angle + i * Math.PI / 2;
					drawRibbon(
						cx + Math.cos(pAngle) * r, cy + Math.sin(pAngle) * r,
						pt.x, pt.y,
						totalTwist + i * 0.25, ribbonColors[i], 0.88
					);
				});

				// Disk
				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(angle);

				// Glow ring
				const glowR = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
				glowR.addColorStop(0, stateColor + '22'); glowR.addColorStop(1, 'transparent');
				ctx.fillStyle = glowR; ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();

				// Disk face
				ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
				ctx.fillStyle = getVar('--color-surface'); ctx.fill();
				ctx.strokeStyle = stateColor; ctx.lineWidth = 2.5; ctx.stroke();

				// Spinor phasor — rotates at half the disk speed, directly showing ψ phase.
				// In disk-local coords it sits at −angle/2, so in world space it's at angle/2.
				const phasorAngle = -angle / 2, pLen = r * 0.68;
				const ptx = Math.cos(phasorAngle) * pLen, pty = Math.sin(phasorAngle) * pLen;
				ctx.strokeStyle = stateColor; ctx.lineWidth = 2.5;
				ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ptx, pty); ctx.stroke();
				const ha = Math.atan2(pty, ptx);
				ctx.beginPath();
				ctx.moveTo(ptx, pty);
				ctx.lineTo(ptx - 9 * Math.cos(ha - 0.42), pty - 9 * Math.sin(ha - 0.42));
				ctx.lineTo(ptx - 9 * Math.cos(ha + 0.42), pty - 9 * Math.sin(ha + 0.42));
				ctx.closePath(); ctx.fillStyle = stateColor; ctx.fill();

				// Colour-coded rim pegs (ribbon attachment points)
				ribbonColors.forEach((c, i) => {
					const pa = i * Math.PI / 2;
					ctx.beginPath(); ctx.arc(Math.cos(pa) * r, Math.sin(pa) * r, 4.5, 0, Math.PI * 2);
					ctx.fillStyle = mkRgba(c, 0.95); ctx.fill();
					ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
				});
				ctx.restore();

				// Labels below disk
				ctx.fillStyle = fg; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('spin-½', cx, cy + r + 20);
				ctx.fillStyle = stateColor; ctx.font = '13px system-ui';
				ctx.fillText(`ψ = ${Math.cos(angle / 2).toFixed(2)}`, cx, cy + r + 38);

				// Phase bar
				const phase = Math.cos(angle / 2), phaseT = (phase + 1) / 2;
				const barW = Math.min(200, w * 0.44), barX = cx - barW / 2, barY = h - 32;
				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('spinor phase  ψ', cx, barY - 10);
				ctx.font = '12px system-ui';
				ctx.textAlign = 'right'; ctx.fillStyle = '#f97316'; ctx.fillText('−1', barX - 4, barY + 9);
				ctx.textAlign = 'left'; ctx.fillStyle = accent; ctx.fillText('+1', barX + barW + 4, barY + 9);
				ctx.fillStyle = getVar('--color-border');
				ctx.roundRect(barX, barY, barW, 10, 5); ctx.fill();
				ctx.fillStyle = stateColor;
				ctx.roundRect(barX + barW / 2, barY, (phaseT - 0.5) * barW, 10, 3); ctx.fill();
				ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5;
				ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
				ctx.fillText(phase.toFixed(2), cx + (phaseT - 0.5) * barW + (phaseT > 0.5 ? 20 : -20), barY + 9);
				ctx.shadowBlur = 0;

				// Drag hint at bottom
				ctx.fillStyle = muted + '55'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
				ctx.fillText(beltDragging ? 'scrubbing…' : 'drag to scrub · play to animate', cx, h - 6);

				if (beltRunning) angle += 0.008;
			}
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			function loop() { draw(); requestAnimationFrame(loop); }
			loop();
		})();

		// ── ANIMATION 4: Energy-Momentum ──────────────────────────────────
		(function () {
			const canvas = document.getElementById('energyCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let t = 0, energyRunning = true;
			let energyUserP: number | null = null;
			let _eOx = 52, _ePScale = 1;
			canvas.style.cursor = 'crosshair';
			canvas.addEventListener('mousedown', (e) => {
				const rect = canvas.getBoundingClientRect();
				energyUserP = Math.max(0, Math.min(3.0, (e.clientX - rect.left - _eOx) / _ePScale));
				energyRunning = false;
				const btn = document.getElementById('energyPlayBtn');
				if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); }
			});
			canvas.addEventListener('mousemove', (e) => {
				if (e.buttons > 0) { const rect = canvas.getBoundingClientRect(); energyUserP = Math.max(0, Math.min(3.0, (e.clientX - rect.left - _eOx) / _ePScale)); }
			});
			canvas.addEventListener('dblclick', () => { energyUserP = null; });
			canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); energyUserP = Math.max(0, Math.min(3.0, (e.touches[0].clientX - rect.left - _eOx) / _ePScale)); energyRunning = false; const btn = document.getElementById('energyPlayBtn'); if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('viz-btn-active'); } }, { passive: false });
			canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); energyUserP = Math.max(0, Math.min(3.0, (e.touches[0].clientX - rect.left - _eOx) / _ePScale)); }, { passive: false });
			(window as any).toggleEnergy = () => {
				energyRunning = !energyRunning;
				const btn = document.getElementById('energyPlayBtn');
				if (btn) { btn.textContent = energyRunning ? '⏸ Pause' : '▶ Play'; btn.classList.toggle('viz-btn-active', energyRunning); }
			};
			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text'); const accent = getVar('--color-accent'); const muted = getVar('--color-text-secondary');
				const pad = 52, plotW = w - pad * 1.4, plotH = h - pad * 1.5, ox = pad, oy = pad + plotH / 2;
				const pScale = plotW / 4, eScale = plotH * 0.46;
				ctx.strokeStyle = muted; ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, pad + plotH); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + plotW, oy); ctx.stroke();
				ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
				ctx.fillText('p (momentum)', ox + plotW / 2, pad + plotH + 18);
				ctx.save(); ctx.translate(14, oy); ctx.rotate(-Math.PI / 2); ctx.fillText('E (energy)', 0, 0); ctx.restore();
				const mc2y = oy - eScale, negmc2y = oy + eScale;
				ctx.setLineDash([3, 5]); ctx.strokeStyle = accent + '55'; ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(ox, mc2y); ctx.lineTo(ox + plotW, mc2y); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(ox, negmc2y); ctx.lineTo(ox + plotW, negmc2y); ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = accent; ctx.font = '13px system-ui'; ctx.textAlign = 'right';
				ctx.fillText('+mc²', ox - 3, mc2y + 4); ctx.fillText('−mc²', ox - 3, negmc2y + 4); ctx.fillText('0', ox - 3, oy + 4);
				ctx.strokeStyle = 'rgba(250,204,21,0.35)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
				ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + plotW, oy - plotW * eScale / pScale); ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = 'rgba(250,204,21,0.7)'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
				ctx.fillText('E = pc (photon)', ox + plotW * 0.6, oy - plotW * 0.6 * eScale / pScale - 4);
				ctx.beginPath();
				for (let px = 0; px <= plotW; px += 1.5) { const p = px / pScale, E = Math.sqrt(p * p + 1) * eScale; if (px === 0) ctx.moveTo(ox + px, oy - E); else ctx.lineTo(ox + px, oy - E); }
				ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.stroke();
				ctx.beginPath();
				for (let px = 0; px <= plotW; px += 1.5) { const p = px / pScale, E = Math.sqrt(p * p + 1) * eScale; if (px === 0) ctx.moveTo(ox + px, oy - E); else ctx.lineTo(ox + px, oy - E); }
				ctx.lineTo(ox + plotW, mc2y); ctx.lineTo(ox, mc2y); ctx.closePath();
				ctx.fillStyle = 'rgba(96,165,250,0.07)'; ctx.fill();
				ctx.beginPath();
				for (let px = 0; px <= plotW; px += 1.5) { const p = px / pScale, E = -Math.sqrt(p * p + 1) * eScale; if (px === 0) ctx.moveTo(ox + px, oy - E); else ctx.lineTo(ox + px, oy - E); }
				ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3; ctx.stroke();
				_eOx = ox; _ePScale = pScale;
				const pNorm = energyUserP !== null ? energyUserP : (Math.sin(t * 0.6) * 0.5 + 0.5) * 3.0;
				const eNorm = Math.sqrt(pNorm * pNorm + 1);
				const dotX = ox + pNorm * pScale, dotY = oy - eNorm * eScale;
				const dotPulse = 0.7 + 0.3 * Math.sin(t * 3);
				const glowG = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 16);
				glowG.addColorStop(0, `rgba(96,165,250,${0.5 * dotPulse})`); glowG.addColorStop(1, 'transparent');
				ctx.fillStyle = glowG; ctx.beginPath(); ctx.arc(dotX, dotY, 16, 0, Math.PI * 2); ctx.fill();
				ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, Math.PI * 2); ctx.fillStyle = '#60a5fa'; ctx.fill();
				ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
				ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('e⁻', dotX, dotY + 3);
				// E/p readout
				const eNormVal = Math.sqrt(pNorm * pNorm + 1);
				const readX = dotX < ox + plotW - 90 ? dotX + 12 : dotX - 90;
				ctx.save();
				ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5;
				ctx.fillStyle = '#fff'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
				ctx.fillText('E=' + eNormVal.toFixed(2) + 'mc²', readX, dotY - 5);
				ctx.fillText('p=' + pNorm.toFixed(2) + 'mc', readX, dotY + 8);
				ctx.restore();
				ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
				ctx.fillStyle = '#60a5fa'; ctx.fillText('Electron branch', ox + 4, mc2y - 10);
				ctx.fillStyle = '#fb923c'; ctx.fillText('Positron branch', ox + 4, negmc2y + 22);
				ctx.setLineDash([2, 4]); ctx.strokeStyle = accent + 'aa'; ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(ox + 6, mc2y); ctx.lineTo(ox + 6, negmc2y); ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = accent; ctx.font = '13px system-ui'; ctx.textAlign = 'left'; ctx.fillText('2mc²', ox + 10, oy + 4);
				// Interaction hint
				ctx.fillStyle = muted + '55'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
				if (energyUserP === null) {
					ctx.fillText('drag to set momentum · dbl-click to animate', ox + plotW / 2, pad + plotH + 30);
				} else {
					ctx.fillText('dbl-click to resume animation', ox + plotW / 2, pad + plotH + 30);
				}

				if (energyRunning) t += 0.016;
			}
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			function loop() { draw(); requestAnimationFrame(loop); }
			loop();
		})();

		// ── ANIMATION 5: Zitterbewegung ───────────────────────────────────
		(function () {
			const canvas = document.getElementById('zittCanvas') as HTMLCanvasElement;
			if (!canvas) return;
			let { ctx, w, h } = setupCanvas(canvas);
			let t = 0, zittRunning = true, zittSpeed = 1;
			(window as any).cycleZittSpeed = () => {
				const speeds = [0.5, 1, 2];
				const idx = speeds.indexOf(zittSpeed);
				zittSpeed = speeds[(idx + 1) % speeds.length];
				const btn = document.getElementById('zittSpeedBtn');
				if (btn) btn.textContent = zittSpeed + '× speed';
			};
			(window as any).toggleZitt = () => {
				zittRunning = !zittRunning;
				const btn = document.getElementById('zittPlayBtn');
				if (btn) { btn.textContent = zittRunning ? '⏸ Pause' : '▶ Play'; btn.classList.toggle('viz-btn-active', zittRunning); }
			};
			function zittX(time: number) { return 0.6 * time + 18 * Math.sin(12 * time) * Math.exp(-time / 8); }
			function draw() {
				ctx.clearRect(0, 0, w, h);
				const fg = getVar('--color-text'); const accent = getVar('--color-accent'); const muted = getVar('--color-text-secondary');
				const pad = 48, plotW = w - pad * 1.5, plotH = h - pad * 1.5, ox = pad, oy = pad + plotH / 2;
				ctx.strokeStyle = muted; ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, pad + plotH); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + plotW, oy); ctx.stroke();
				ctx.fillStyle = muted; ctx.font = '16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('time →', ox + plotW / 2, pad + plotH + 18);
				ctx.save(); ctx.translate(14, oy); ctx.rotate(-Math.PI / 2); ctx.fillText('⟨x⟩ position', 0, 0); ctx.restore();
				const windowTime = 18, tStart = Math.max(0, t - windowTime), tScale = plotW / windowTime;
				ctx.strokeStyle = accent + '66'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
				ctx.beginPath();
				for (let px = 0; px <= plotW; px += 4) { const time = tStart + px / tScale; const xDrift = (0.6 * time - 0.6 * tStart) * (plotH * 0.18); if (px === 0) ctx.moveTo(ox + px, oy - xDrift); else ctx.lineTo(ox + px, oy - xDrift); }
				ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = accent; ctx.font = '16px system-ui'; ctx.textAlign = 'right';
				ctx.fillText('group drift (v·t)', ox + plotW - 4, oy - 0.6 * windowTime * plotH * 0.18 + 4);
				ctx.beginPath();
				for (let px = 0; px <= plotW; px += 1.5) { const time = tStart + px / tScale; const yPlot = oy - zittX(time) * (plotH * 0.18 / 0.6); if (px === 0) ctx.moveTo(ox + px, yPlot); else ctx.lineTo(ox + px, yPlot); }
				ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
				const dotX = ox + plotW, dotY = oy - zittX(t) * (plotH * 0.18 / 0.6);
				const pulse = 0.7 + 0.3 * Math.sin(t * 15);
				const glowG2 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 14);
				glowG2.addColorStop(0, `rgba(167,139,250,${0.6 * pulse})`); glowG2.addColorStop(1, 'transparent');
				ctx.fillStyle = glowG2; ctx.beginPath(); ctx.arc(dotX, dotY, 14, 0, Math.PI * 2); ctx.fill();
				ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI * 2); ctx.fillStyle = '#a78bfa'; ctx.fill();
				ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'left'; ctx.fillText('⟨x(t)⟩ with Zitterbewegung', ox + 4, pad + 16);
				ctx.fillStyle = muted; ctx.font = '16px system-ui'; ctx.fillText('Oscillation: ~10²⁰ Hz (exaggerated)', ox + 4, pad + 38);
				if (zittRunning) t += 0.016 * zittSpeed;
			}
			new ResizeObserver(entries => { const e = entries[0]; if (!e || !e.contentRect.width) return; const dpr = window.devicePixelRatio||1; canvas.width = e.contentRect.width*dpr; w = e.contentRect.width; ctx = canvas.getContext('2d')!; ctx.scale(dpr,dpr); }).observe(canvas);
			function loop() { draw(); requestAnimationFrame(loop); }
			loop();
		})();
	});
</script>

<SEO
	title={POST.title}
	description={POST.summary}
	path="/update/why-dirac-is-my-hostname"
	type="article"
	publishedAt={POST.publishedAt}
/>

<div class="px-6 sm:px-8 py-2 bg-background text-foreground min-h-screen overflow-x-hidden">
	<header class="flex justify-between items-center p-2 sm:p-4 mx-auto z-50 relative gap-2">
		<nav class="flex-shrink-0">
			<a href={base || '/'} class="internal-button text-sm px-3 py-2">« davis9001.dev</a>
		</nav>
		<div class="flex items-center gap-4">
			<ThemeSwitcher variant="inline" simpleToggle={true} />
		</div>
	</header>

	<main class="px-2 py-1 md:p-9 flex-1 relative max-w-5xl mx-auto">
		<div class="fixed inset-0 bg-cover bg-center bg-no-repeat z-10 opacity-10 blur-xl"
			style="background-image:url('/logo-green-Icon-250.webp');background-size:contain;background-position:-9ch -9em;"></div>

		<div class="relative z-50">
			<div class="mb-9">
				<a href="/updates" class="internal-button">« Back to /updates</a>
			</div>

			<h1 class="text-2xl sm:text-4xl font-bold">{POST.title}</h1>

			<div class="post-meta">
				<time datetime={POST.publishedAt} class="text-foreground/60">June 26, 2026</time>
				<span class="text-foreground/60">15 min read</span>
			</div>

			<div class="post-tags">
				{#each POST.tags as tag}
					<span class="post-tag">{tag}</span>
				{/each}
			</div>

			<div class="prose">
				<p>
					When I installed Omarchy on my main workstation back in May — the machine I <a href="/update/installed-omarchy-on-main-workstation">wrote about here</a> — the installer asked me to pick a hostname.
				</p>
				<p>
					I have had a thing for theoretical physicist names on my Linux machines for years. If I'm going to spend ten hours a day staring at a terminal, the machine deserves a name with some weight to it. I used to keep a loose rule: real physicists for production servers, fictional ones for staging and dev. Each one I've looked into a little after the fact, and each one surprised me with how deep the rabbit hole went. So I thought carefully about which name to pick, then asked an AI for a theoretical physicist I didn't know yet. It gave me Dirac.
				</p>
				<p>
					The idea of using a themed naming scheme came from my uncle. He worked at a large company years ago where every server had a Simpsons character name — Homer, Marge, Bart, the whole cast eventually. It's a good system: you never have to think hard about what to call the next machine, the names are memorable, and there's something enjoyable about a room full of servers that all belong to the same universe. I stole the concept and just swapped the Simpsons for physicists.
				</p>
				<p>
					This machine became <strong>Dirac</strong>. Named after Paul Adrien Maurice Dirac. British. Nobel Prize 1933. One of the strangest and most brilliant people in the history of science. And I will be honest — at the moment the Omarchy installer asked me to pick a hostname and I typed <code>dirac</code>, my knowledge of the man was basically: <em>quantum stuff, equation, antimatter, kind of weird</em>.
				</p>
				<p>
					I have since corrected this. What follows is what I actually learned, and a set of interactive visuals I built to help me understand it intuitively — because reading the equations alone was not enough for my brain, and I suspect it might not be for yours either.
				</p>

				<hr />

				<h2>Who Was Paul Dirac?</h2>
				<p>
					Dirac was born in Bristol in 1902 to a Swiss father who was a strict French teacher, and an English mother. His father's rule at dinner was that the children could only speak French — which for young Paul, who was naturally quiet to begin with, meant he mostly didn't speak at all. His contemporaries later described him as the most taciturn person in physics, which is saying something in a field full of people who preferred writing equations to talking.
				</p>
				<p>
					He was so renowned for saying almost nothing that there is a unit named after him at Cambridge: one "dirac" is defined as one word per hour.
				</p>
				<p>
					He finished his PhD at Cambridge in 1926, at age 23. By 1928, at 25, he had written the equation that bears his name. It is, without exaggeration, one of the most beautiful and consequential things ever written down.
				</p>


					<!-- ── Life: Bristol birth ── -->
					<div class="life-illo-wrap">
						<svg viewBox="0 0 400 152" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bristol cityscape illustration">
							<!-- Ground hills -->
							<path d="M0,126 Q70,108 165,120 Q260,108 400,118 L400,152 L0,152Z" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-accent)" stroke-width="1.2" stroke-opacity="0.3" stroke-linecap="round"/>
							<!-- Clifton Suspension Bridge — left half -->
							<!-- Left tower -->
							<rect x="48" y="72" width="10" height="52" rx="1" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round"/>
							<path d="M45,72 L53,60 L61,72Z" fill="var(--color-text)" fill-opacity="0.7" stroke="var(--color-text)" stroke-width="1" stroke-linejoin="round"/>
							<!-- Right tower -->
							<rect x="118" y="72" width="10" height="52" rx="1" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round"/>
							<path d="M115,72 L123,60 L131,72Z" fill="var(--color-text)" fill-opacity="0.7" stroke="var(--color-text)" stroke-width="1" stroke-linejoin="round"/>
							<!-- Bridge deck -->
							<line x1="30" y1="112" x2="152" y2="112" stroke="var(--color-text)" stroke-width="2.5" stroke-linecap="round"/>
							<!-- Suspension cables -->
							<line x1="53" y1="63" x2="30" y2="112" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.55"/>
							<line x1="53" y1="63" x2="90" y2="112" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.55"/>
							<line x1="53" y1="63" x2="123" y2="112" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.55"/>
							<line x1="123" y1="63" x2="152" y2="112" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.55"/>
							<line x1="123" y1="63" x2="90" y2="112" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.55"/>
							<text x="90" y="135" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)" opacity="0.65">Clifton Suspension Bridge</text>
							<!-- Star + date (center) -->
							<text x="200" y="20" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="var(--color-accent)">★</text>
							<text x="200" y="42" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="bold" fill="var(--color-text)">8 August 1902</text>
							<text x="200" y="57" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="var(--color-text-secondary)" font-style="italic">Bishopston · Bristol · England</text>
							<circle cx="200" cy="74" r="3" fill="var(--color-accent)" opacity="0.7"/>
							<line x1="200" y1="62" x2="200" y2="71" stroke="var(--color-accent)" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.7"/>
							<!-- Terraced houses — right half -->
							<!-- House 1 -->
							<path d="M252,126 L252,82 L267,70 L282,82 L282,126" stroke="var(--color-text)" stroke-width="1.5" fill="var(--color-surface)" stroke-linecap="round" stroke-linejoin="round"/>
							<rect x="257" y="98" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="270" y="98" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="260" y="110" width="10" height="16" stroke="var(--color-text)" stroke-width="1" fill="var(--color-surface)"/>
							<rect x="274" y="70" width="5" height="10" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-surface)"/>
							<!-- House 2 -->
							<path d="M282,126 L282,85 L297,73 L312,85 L312,126" stroke="var(--color-text)" stroke-width="1.5" fill="var(--color-surface)" stroke-linecap="round" stroke-linejoin="round"/>
							<rect x="287" y="101" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="300" y="101" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="290" y="112" width="10" height="14" stroke="var(--color-text)" stroke-width="1" fill="var(--color-surface)"/>
							<rect x="304" y="73" width="5" height="10" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-surface)"/>
							<!-- House 3 -->
							<path d="M312,126 L312,88 L327,76 L342,88 L342,126" stroke="var(--color-text)" stroke-width="1.5" fill="var(--color-surface)" stroke-linecap="round" stroke-linejoin="round"/>
							<rect x="317" y="104" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="330" y="104" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<rect x="320" y="114" width="10" height="12" stroke="var(--color-text)" stroke-width="1" fill="var(--color-surface)"/>
							<!-- House 4 (partial, cut off) -->
							<path d="M342,126 L342,90 L357,78 L372,90 L372,126" stroke="var(--color-text)" stroke-width="1.5" fill="var(--color-surface)" stroke-linecap="round" stroke-linejoin="round"/>
							<rect x="347" y="106" width="7" height="7" stroke="var(--color-text-secondary)" stroke-width="1" fill="var(--color-accent)" fill-opacity="0.08"/>
							<text x="307" y="143" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)" opacity="0.65">Bristol terraced houses, Bishopston</text>
						</svg>
						<p class="life-illo-caption">The view Dirac grew up with — the Clifton Suspension Bridge over the Avon Gorge, and the narrow terraced streets of Bishopston.</p>
					</div>

					<p>
						He was born <strong>Paul Adrien Maurice Dirac</strong> on <strong>8 August 1902</strong>, in the Bishopston district of Bristol. His father Charles had emigrated from Saint-Maurice, in the Swiss canton of Valais; his mother Florence was a Cornish woman from Liskeard who had worked as a librarian before the children arrived. Paul was the middle child — his older brother Reginald (Felix) was two years ahead, and his younger sister Béatrice (Betty) came four years after. Felix died by suicide in March 1925, a loss that haunted Dirac and deepened his already considerable reserve.
					</p>

					<!-- ── Life: Education ── -->
					<div class="life-illo-wrap">
						<svg viewBox="0 0 400 152" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Education timeline from Bristol to Cambridge">
							<!-- Dashed journey path — ends horizontally at arrowhead base (320,85) -->
							<path d="M75,95 C 130,58 260,85 320,85" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-dasharray="5,3" fill="none" stroke-linecap="round" opacity="0.5"/>
							<!-- Arrow head at Cambridge end -->
							<polygon points="330,85 320,80 320,90" fill="var(--color-text-secondary)" opacity="0.5"/>
							<!-- BRISTOL — book icon -->
							<rect x="20" y="68" width="36" height="48" rx="3" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.5"/>
							<line x1="38" y1="68" x2="38" y2="116" stroke="var(--color-text-secondary)" stroke-width="1"/>
							<line x1="40" y1="80" x2="52" y2="80" stroke="var(--color-text-secondary)" stroke-width="0.9"/>
							<line x1="40" y1="87" x2="52" y2="87" stroke="var(--color-text-secondary)" stroke-width="0.9"/>
							<line x1="40" y1="94" x2="52" y2="94" stroke="var(--color-text-secondary)" stroke-width="0.9"/>
							<line x1="24" y1="80" x2="36" y2="80" stroke="var(--color-text-secondary)" stroke-width="0.9"/>
							<line x1="24" y1="87" x2="36" y2="87" stroke="var(--color-text-secondary)" stroke-width="0.9"/>
							<text x="38" y="124" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="var(--color-text)">Bristol</text>
							<text x="38" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)">Eng. 1921</text>
							<!-- Milestone 1: BSc -->
							<circle cx="128" cy="77" r="18" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5"/>
							<text x="128" y="74" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-accent)">BSc</text>
							<text x="128" y="86" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)">1921</text>
							<!-- Milestone 2: PhD -->
							<circle cx="210" cy="95" r="18" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5"/>
							<text x="210" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-accent)">PhD</text>
							<text x="210" y="104" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)">1926</text>
							<!-- Milestone 3: Lucasian -->
							<circle cx="285" cy="90" r="18" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5"/>
							<text x="285" y="87" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-accent)" textLength="32" lengthAdjust="spacingAndGlyphs">Lucasian</text>
							<text x="285" y="99" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)">1932</text>
							<!-- CAMBRIDGE — spire icon -->
							<path d="M350,116 L350,62 L360,42 L370,62 L370,116" stroke="var(--color-text)" stroke-width="1.5" fill="var(--color-surface)" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M348,63 L354,53 L360,42 L366,53 L372,63Z" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.5" stroke-linejoin="round"/>
							<rect x="352" y="74" width="7" height="9" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-text-secondary)" stroke-width="1"/>
							<rect x="362" y="74" width="7" height="9" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-text-secondary)" stroke-width="1"/>
							<rect x="352" y="90" width="7" height="9" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-text-secondary)" stroke-width="1"/>
							<rect x="362" y="90" width="7" height="9" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-text-secondary)" stroke-width="1"/>
							<text x="360" y="124" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="var(--color-text)">Cambridge</text>
							<text x="360" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)">St John's</text>
							<!-- title -->
							<text x="200" y="22" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="var(--color-text-secondary)" font-style="italic">The road to the equation</text>
						</svg>
						<p class="life-illo-caption">Bristol → Cambridge: engineering degree at 18, the world's first PhD in quantum mechanics at 23, Lucasian Professor by 29.</p>
					</div>

					<p>
						His schooling was at the Merchant Venturers' Technical College in Bristol — the same institution where his father taught French, which offered no respite from the dinner-table language rules. He read electrical engineering at the University of Bristol and graduated at eighteen with a first-class degree in 1921. Unable to find engineering work in the post-war recession, he stayed to study mathematics, then moved to St John's College, Cambridge. His 1926 doctoral thesis — completed under Ralph Fowler — was the first PhD thesis in history on quantum mechanics. Cambridge made him Lucasian Professor of Mathematics in 1932, the chair once held by Newton and later by Hawking, which he kept for thirty-seven years.
					</p>

					<!-- ── Life: Marriage ── -->
					<div class="life-illo-wrap">
						<svg viewBox="0 0 600 178" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Marriage timeline: Margit's first marriage, meeting Paul Dirac at Princeton, and their London wedding in 1937">

							<!-- ── Scene dividers ── -->
							<line x1="200" y1="5" x2="200" y2="174" stroke="var(--color-text-secondary)" stroke-width="0.7" stroke-dasharray="4,4" opacity="0.35"/>
							<line x1="400" y1="5" x2="400" y2="174" stroke="var(--color-text-secondary)" stroke-width="0.7" stroke-dasharray="4,4" opacity="0.35"/>
							<text x="200" y="94" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="var(--color-text-secondary)" opacity="0.4">→</text>
							<text x="400" y="94" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="var(--color-text-secondary)" opacity="0.4">→</text>

							<!-- ══════════════════════════════════
							     SCENE 1 — First marriage
							     ══════════════════════════════════ -->
							<text x="100" y="16" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" fill="var(--color-text-secondary)" font-style="italic">first marriage</text>
							<!-- Margit (left, accent, dress) -->
							<circle cx="68" cy="68" r="13" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.6"/>
							<path d="M56,85 Q54,108 56,118 L80,118 Q82,108 80,85" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M56,118 Q62,132 68,132 Q74,132 80,118" fill="var(--color-accent)" fill-opacity="0.08" stroke="var(--color-accent)" stroke-width="1.3" stroke-linecap="round"/>
							<path d="M79,92 Q91,100 97,105" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
							<text x="68" y="148" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="var(--color-accent)">Margit</text>
							<text x="68" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)" font-style="italic">Wigner</text>
							<!-- Balász (right, text-secondary) -->
							<circle cx="132" cy="68" r="13" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.6"/>
							<path d="M120,85 Q118,108 120,118 L144,118 Q146,108 144,85" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
							<line x1="124" y1="118" x2="122" y2="143" stroke="var(--color-text-secondary)" stroke-width="1.6" stroke-linecap="round"/>
							<line x1="140" y1="118" x2="142" y2="143" stroke="var(--color-text-secondary)" stroke-width="1.6" stroke-linecap="round"/>
							<path d="M121,92 Q109,100 103,105" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
							<text x="132" y="148" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="var(--color-text-secondary)">Balász</text>
							<text x="132" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)" font-style="italic">first husband</text>
							<!-- Divorce X (between the reaching arms) -->
							<line x1="93" y1="96" x2="107" y2="110" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
							<line x1="107" y1="96" x2="93" y2="110" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
							<text x="100" y="171" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-text-secondary)" font-style="italic" opacity="0.8">divorced · children: Judith &amp; Gabriel</text>

							<!-- ══════════════════════════════════
							     SCENE 2 — Princeton meeting
							     ══════════════════════════════════ -->
							<text x="300" y="16" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" fill="var(--color-text-secondary)" font-style="italic">Princeton · 1934</text>
							<!-- Eugene Wigner (connector, top centre, small) -->
							<circle cx="300" cy="30" r="7" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.3"/>
							<path d="M295,39 Q293,52 294,57 L306,57 Q307,52 305,39" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
							<text x="300" y="70" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="var(--color-text-secondary)" font-style="italic">E. Wigner</text>
							<!-- Dotted introduction lines -->
							<path d="M292,48 Q268,68 251,89" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-dasharray="3,3" stroke-linecap="round" fill="none" opacity="0.6"/>
							<path d="M308,48 Q332,68 349,89" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-dasharray="3,3" stroke-linecap="round" fill="none" opacity="0.6"/>
							<!-- Margit (bottom left, accent, dress) -->
							<circle cx="252" cy="100" r="11" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5"/>
							<path d="M242,115 Q240,132 241,140 L263,140 Q264,132 262,115" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M241,140 Q247,150 252,150 Q257,150 263,140" fill="var(--color-accent)" fill-opacity="0.08" stroke="var(--color-accent)" stroke-width="1.2" stroke-linecap="round"/>
							<text x="252" y="164" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" font-weight="bold" fill="var(--color-accent)">Margit</text>
							<!-- Paul (bottom right, text) -->
							<circle cx="348" cy="100" r="11" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.5"/>
							<path d="M338,115 Q336,132 336,140 L360,140 Q360,132 358,115" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
							<line x1="342" y1="140" x2="340" y2="158" stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round"/>
							<line x1="356" y1="140" x2="358" y2="158" stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round"/>
							<text x="348" y="164" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" font-weight="bold" fill="var(--color-text)">Paul</text>

							<!-- ══════════════════════════════════
							     SCENE 3 — London wedding
							     ══════════════════════════════════ -->
							<text x="500" y="16" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" fill="var(--color-text-secondary)" font-style="italic">London · 2 January 1937</text>
							<!-- Paul (left, text) -->
							<circle cx="456" cy="65" r="14" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.7"/>
							<path d="M443,83 Q441,108 443,120 L469,120 Q471,108 469,83" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<line x1="447" y1="120" x2="445" y2="146" stroke="var(--color-text)" stroke-width="1.8" stroke-linecap="round"/>
							<line x1="465" y1="120" x2="467" y2="146" stroke="var(--color-text)" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M469,91 Q484,101 490,106" stroke="var(--color-text)" stroke-width="1.7" stroke-linecap="round" fill="none"/>
							<text x="456" y="158" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="var(--color-text)">Paul</text>
							<!-- Margit (right, accent, dress) -->
							<circle cx="544" cy="65" r="14" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.7"/>
							<path d="M532,83 Q530,108 526,120 L562,120 Q558,108 556,83" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M526,120 Q535,138 544,138 Q553,138 562,120" fill="var(--color-accent)" fill-opacity="0.08" stroke="var(--color-accent)" stroke-width="1.4" stroke-linecap="round"/>
							<path d="M532,91 Q518,101 512,106" stroke="var(--color-accent)" stroke-width="1.7" stroke-linecap="round" fill="none"/>
							<text x="544" y="158" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="var(--color-accent)">Margit</text>
							<text x="544" y="171" text-anchor="middle" font-family="Georgia,serif" font-size="9.5" fill="var(--color-text-secondary)" font-style="italic">now Dirac</text>
							<!-- Heart and wedding rings -->
							<text x="500" y="111" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="var(--color-accent)" opacity="0.55">♡</text>
							<circle cx="493" cy="127" r="5.5" fill="none" stroke="var(--color-text)" stroke-width="1.3"/>
							<circle cx="507" cy="127" r="5.5" fill="none" stroke="var(--color-accent)" stroke-width="1.3"/>

						</svg>
						<p class="life-illo-caption">Margit Wigner had been married before — a Hungarian named Balász, with whom she had two children, Judith and Gabriel. She met Paul at Princeton in 1934, while visiting her brother, the physicist Eugene Wigner. They married in London on 2 January 1937.</p>
					</div>

					<p>
						In the mid-1930s, while Dirac was at Princeton, he met Margit Balász — a Hungarian divorcée visiting her brother, the physicist Eugene Wigner. She was lively and sociable in all the ways Dirac was not. They married in London on 2 January 1937. His colleagues were reportedly less surprised that it happened than that he had managed to propose. Margit later said she had done most of the talking throughout their courtship, which is consistent with everything else we know about the man.
					</p>

					<!-- ── Life: Children ── -->
					<div class="life-illo-wrap">
						<svg viewBox="0 0 400 148" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Family tree illustration showing Paul, Margit, and their four children">
							<!-- Title -->
							<text x="200" y="16" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text-secondary)" font-style="italic">The Dirac family</text>
							<!-- Parent: Paul -->
							<circle cx="160" cy="32" r="12" fill="var(--color-surface)" stroke="var(--color-text)" stroke-width="1.5"/>
							<text x="160" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text)">Paul</text>
							<!-- Parent: Margit -->
							<circle cx="240" cy="32" r="12" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-width="1.5"/>
							<text x="240" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-accent)">Margit</text>
							<!-- Connecting line between parents -->
							<line x1="172" y1="32" x2="228" y2="32" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<!-- Trunk line down -->
							<line x1="200" y1="32" x2="200" y2="68" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<!-- Horizontal branch -->
							<line x1="72" y1="68" x2="328" y2="68" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<!-- Children drop lines -->
							<line x1="72" y1="68" x2="72" y2="90" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<line x1="178" y1="68" x2="178" y2="90" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<line x1="252" y1="68" x2="252" y2="90" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<line x1="328" y1="68" x2="328" y2="90" stroke="var(--color-text-secondary)" stroke-width="1.2" stroke-linecap="round"/>
							<!-- Child 1: Judith (Margit's) -->
							<circle cx="72" cy="100" r="11" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.3" stroke-dasharray="3,2"/>
							<text x="72" y="122" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text)">Judith</text>
							<text x="72" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-text-secondary)" font-style="italic">Margit's</text>
							<!-- Child 2: Gabriel (Margit's) -->
							<circle cx="178" cy="100" r="11" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.3" stroke-dasharray="3,2"/>
							<text x="178" y="122" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text)">Gabriel</text>
							<text x="178" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-text-secondary)" font-style="italic">Margit's</text>
							<!-- Child 3: Mary (Paul & Margit's) -->
							<circle cx="252" cy="100" r="11" fill="var(--color-accent)" fill-opacity="0.12" stroke="var(--color-accent)" stroke-width="1.3"/>
							<text x="252" y="122" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text)">Mary</text>
							<text x="252" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-text-secondary)" font-style="italic">b. 1940</text>
							<!-- Child 4: Florence (Paul & Margit's) -->
							<circle cx="328" cy="100" r="11" fill="var(--color-accent)" fill-opacity="0.12" stroke="var(--color-accent)" stroke-width="1.3"/>
							<text x="328" y="122" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text)">Florence</text>
							<text x="328" y="134" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="var(--color-text-secondary)" font-style="italic">b. 1942</text>
							<!-- Legend -->
							<rect x="100" y="140" width="8" height="6" rx="1" stroke="var(--color-text-secondary)" stroke-width="1" stroke-dasharray="2,1.5" fill="none"/>
							<text x="112" y="146" font-family="Georgia,serif" font-size="8" fill="var(--color-text-secondary)">Margit's children (raised by Paul)</text>
							<circle cx="240" cy="143" r="4" fill="var(--color-accent)" fill-opacity="0.25" stroke="var(--color-accent)" stroke-width="1"/>
							<text x="248" y="146" font-family="Georgia,serif" font-size="8" fill="var(--color-text-secondary)">Paul &amp; Margit's daughters</text>
						</svg>
						<p class="life-illo-caption">Margit's two children from her previous marriage, Judith and Gabriel, joined the family. Paul and Margit also had two daughters together, Mary Elizabeth (1940) and Florence Monica (1942).</p>
					</div>

					<p>
						Margit came with two children from her previous marriage — Judith and Gabriel — whom Dirac raised as his own. Together they went on to have two daughters: <strong>Mary Elizabeth</strong>, born in 1940, and <strong>Florence Monica</strong>, born in 1942. By the accounts of those who knew him in later life, he was a devoted father — still quiet about it, but present.
					</p>

					<!-- ── Life: Tallahassee & death ── -->
					<div class="life-illo-wrap">
						<svg viewBox="0 0 400 148" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Tallahassee sunset illustration marking Dirac's death">
							<!-- Sky gradient bg -->
							<defs>
								<radialGradient id="sunset-glow" cx="50%" cy="85%" r="50%">
									<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.18"/>
									<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0"/>
								</radialGradient>
							</defs>
							<rect x="0" y="0" width="400" height="148" fill="url(#sunset-glow)"/>
							<!-- Horizon line -->
							<line x1="0" y1="110" x2="400" y2="110" stroke="var(--color-text-secondary)" stroke-width="1" opacity="0.3"/>
							<!-- Ground -->
							<rect x="0" y="110" width="400" height="38" fill="var(--color-accent)" fill-opacity="0.07"/>
							<!-- Sun setting on horizon -->
							<circle cx="200" cy="112" r="22" fill="var(--color-accent)" fill-opacity="0.25" stroke="var(--color-accent)" stroke-width="1.2" stroke-opacity="0.5"/>
							<circle cx="200" cy="112" r="12" fill="var(--color-accent)" fill-opacity="0.35"/>
							<!-- Palm tree left -->
							<path d="M90,110 Q88,88 86,70 Q84,52 88,40" stroke="var(--color-text)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
							<!-- Palm fronds left -->
							<path d="M88,40 Q70,28 55,34" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M88,40 Q74,50 68,42" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M88,40 Q84,22 76,18" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M88,40 Q100,28 110,32" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M88,40 Q102,46 106,40" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<!-- Palm tree right -->
							<path d="M310,110 Q312,90 314,72 Q316,54 312,42" stroke="var(--color-text)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
							<!-- Palm fronds right -->
							<path d="M312,42 Q330,30 345,36" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M312,42 Q326,52 332,44" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M312,42 Q316,24 324,20" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M312,42 Q298,30 288,34" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<path d="M312,42 Q298,52 294,46" stroke="var(--color-text)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
							<!-- Headstone / memorial marker -->
							<path d="M185,110 L185,80 Q185,72 200,72 Q215,72 215,80 L215,110Z" fill="var(--color-surface)" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<text x="200" y="88" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" font-weight="bold" fill="var(--color-text)">P.A.M.</text>
							<text x="200" y="98" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" font-weight="bold" fill="var(--color-text)">DIRAC</text>
							<line x1="188" y1="101" x2="212" y2="101" stroke="var(--color-text-secondary)" stroke-width="0.8"/>
							<text x="200" y="109" text-anchor="middle" font-family="Georgia,serif" font-size="7.5" fill="var(--color-text-secondary)">1902 – 1984</text>
							<!-- Date / location text -->
							<text x="200" y="130" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="var(--color-text)" font-weight="bold">20 October 1984</text>
							<text x="200" y="144" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="var(--color-text-secondary)" font-style="italic">Tallahassee, Florida</text>
						</svg>
						<p class="life-illo-caption">Dirac died on 20 October 1984 in Tallahassee, Florida, aged 82. He is buried at Roselawn Cemetery.</p>
					</div>

					<p>
						He held the Lucasian Professorship until 1969, then spent several years considering where to go next before joining Florida State University in Tallahassee in 1971 as a professor of physics. He remained there until the very end. He died on <strong>20 October 1984</strong>, aged 82, in Tallahassee — reportedly still thinking about physics in the months before he died. He is buried at Roselawn Cemetery, Tallahassee, Florida.
					</p>

				<h2>The Problem He Was Solving</h2>
				<p>
					By the late 1920s, quantum mechanics was young and exciting and also deeply uncomfortable. Schrödinger had his wave equation, which described how electrons behave. It worked. But it had a problem: it was not compatible with special relativity. At the velocities electrons move inside atoms, relativity matters. You need both theories to be simultaneously true, and Schrödinger's equation only obeyed one of them.
				</p>
				<p>
					Others had tried. The Klein-Gordon equation combined quantum mechanics and special relativity mathematically, but it produced physically nonsensical results — negative probability densities. You cannot have a negative probability of finding a particle somewhere. That is not a thing.
				</p>
				<p>
					Dirac's approach was different. Instead of starting with the energy equation and trying to force it into a quantum-compatible form, he asked: <em>what equation for a free electron would be first-order in both space and time, satisfy special relativity, and reduce to Schrödinger's equation in the non-relativistic limit?</em>
				</p>
				<p>
					The answer he found required him to invent a new kind of mathematical object — the gamma matrices — and produce something that looked, at first glance, almost too clean to be real.
				</p>

				<hr />

				<h2>The Dirac Equation</h2>

				<div class="viz-card eq-card">
					<div class="viz-title">The Dirac Equation (1928)</div>
					<div class="eq-unit-badge eq-unit-natural">Natural units &middot; ℏ = c = 1</div>
					<canvas id="eqCanvas" data-height="280" style="width:100%;display:block;border-radius:8px;"></canvas>
					<p class="viz-caption">γᵘ are the gamma matrices, ∂ᵤ is the four-gradient, m is rest mass, and ψ is the four-component Dirac spinor. First-order in all four spacetime coordinates simultaneously.</p>
				</div>

				<div class="viz-card eq-card">
					<div class="viz-title">The Dirac Equation — SI / Standard Units</div>
					<div class="eq-unit-badge eq-unit-si">SI units &middot; ℏ and c explicit</div>
					<p class="eq-display">(iℏγᵘ∂<sub>μ</sub> &minus; mc)ψ = 0</p>
					<p class="viz-caption">Setting ℏ&thinsp;=&thinsp;c&thinsp;=&thinsp;1 (natural units) absorbs both constants: ℏmc becomes m, and the equation above becomes the cleaner form shown in the visualization.</p>
				</div>

				<h3>What Is the <em>i</em> Out Front?</h3>
				<p>
					The very first character in the equation is <em>i</em> — the imaginary unit, √−1. This is not a notational trick. It's doing essential physical work.
				</p>
				<p>
					The wavefunction ψ is complex-valued — it has both a real and imaginary part at every point in space. Why? Because time evolution in quantum mechanics must be <strong>unitary</strong>: the total probability of finding the particle <em>somewhere</em> must always equal exactly 1. It can't leak away or appear from nowhere.
				</p>
				<p>
					The <em>i</em> guarantees this. Geometrically, multiplying by <em>i</em> is a 90° rotation in the complex plane. Rotation preserves the length of a vector. Length in the complex plane is |ψ| — and |ψ|² is the probability density. So as ψ rotates in complex space over time, its total modulus stays fixed, and probability is conserved. Not by assumption, but by the geometry of complex arithmetic.
				</p>
				<p>
					This is why quantum mechanics genuinely <em>requires</em> complex numbers. You can't replicate this with real-valued wavefunctions. The universe insists on the complex plane.
				</p>

				<div class="viz-card">
					<div class="viz-title">Visualization 0 — <em>i</em> as a 90° Rotation (Complex Plane)</div>
					<canvas id="complexCanvas" data-height="300" style="width:100%;display:block;border-radius:8px;"></canvas>
					<div class="viz-controls">
						<button id="complexPlayBtn" class="viz-btn viz-btn-active" onclick={() => (window as any).toggleComplex()}>⏸ Pause</button>
						<button class="viz-btn" onclick={() => (window as any).stepComplex()}>× i  →  +90°</button>
					</div>
					<p class="viz-caption">Multiplying any complex number by <em>i</em> rotates it 90° counterclockwise — always. The magnitude (distance from origin) never changes. Since |ψ|² is probability, and rotation preserves magnitude, total probability is conserved through all time evolution.</p>
				</div>

				<p>
					What makes the full equation remarkable is the compactness. That one line encodes the full quantum-mechanical behavior of any spin-½ particle moving at any speed up to the speed of light. It correctly predicted the fine structure of the hydrogen atom. It gave the right magnetic moment of the electron. And — almost accidentally — it predicted something nobody had asked for.
				</p>
				<p>
					The equation has four solutions where you might expect two. Two solutions correspond to the electron with spin up and spin down. The other two? They have negative energy. Dirac initially tried to explain this away, then realized he couldn't, and then did something audacious: he took the negative energy solutions seriously and asked what they meant physically.
				</p>
				<p>His answer was antimatter.</p>

				<hr />

				<h2>The Dirac Sea and Antimatter</h2>
				<p>
					Dirac proposed what became known as the <strong>Dirac sea</strong>: the idea that all negative energy states in the universe are already completely filled with electrons. Because of the Pauli exclusion principle, no regular electron can fall into these filled states. But if you added enough energy to a negative-energy electron, you could knock it up into a positive energy state — creating a real observable electron and leaving behind a "hole" in the negative-energy sea.
				</p>
				<p>
					That hole would look, to any observer, like a particle with the same mass as an electron but with opposite charge. A positive electron. Carl Anderson found it in 1932. He called it the positron.
				</p>
				<p>
					Dirac predicted antimatter mathematically in 1928, four years before it was observed. He won the Nobel Prize in 1933. Anderson won it in 1936.
				</p>

				<div class="viz-card">
					<div class="viz-title">Visualization 1 — The Dirac Sea &amp; Pair Production</div>
					<canvas id="seaCanvas" data-height="380" style="width:100%;display:block;border-radius:8px;"></canvas>
					<div class="viz-controls">
						<button id="seaPlayBtn" class="viz-btn viz-btn-active" onclick={() => (window as any).toggleSea()}>⏸ Pause</button>
						<button class="viz-btn" onclick={() => (window as any).triggerPair()}>⚡ Pair Create</button>
					</div>
					<p class="viz-caption">The sea of filled negative-energy states (bottom). A sufficiently energetic photon (γ) can excite an electron into a positive-energy state, leaving a hole — the positron (e⁺). This is pair production. The reverse — pair annihilation — also happens.</p>
				</div>

				<hr />

				<h2>Spin and Spinors</h2>
				<p>
					The four components of ψ are not arbitrary. They encode something deeply weird: <strong>spin</strong>. Electrons have an intrinsic angular momentum called spin-½. This is not like a spinning top — it is a purely quantum-mechanical property with no classical analogue. One of the most counterintuitive things about spin-½ particles is their rotational symmetry.
				</p>
				<p>
					A normal object — a ball, a coffee cup, a planet — looks the same after you rotate it 360°. Full circle, back to where you started. Spin-½ particles do not. Rotating an electron 360° multiplies its wave function by -1. You have to rotate it <strong>720°</strong> to get back to the original state.
				</p>
				<p>
					This sounds insane. And yet it is measurably, experimentally true. Neutron interferometry in the 1970s confirmed it. There is a beautiful physical demonstration of this property called the Dirac belt trick — you connect an object to its surroundings with ribbons, and rotating the object 360° tangles the ribbons in a way that can't be untangled without rotating another 360°.
				</p>

				<div class="viz-card">
					<div class="viz-title">Visualization 2 — The 720° Spinor (Belt Trick)</div>
					<canvas id="beltCanvas" data-height="360" style="width:100%;display:block;border-radius:8px;"></canvas>
					<div class="viz-controls">
						<button id="beltPlayBtn" class="viz-btn viz-btn-active" onclick={() => (window as any).toggleBelt()}>⏸ Pause</button>
						<button class="viz-btn" onclick={() => (window as any).resetBelt()}>↺ Reset</button>
					</div>
					<p class="viz-caption">A spin-½ particle (center) connected to its environment by "belts." Rotating 360° twists the belts — the state picks up a factor of −1. Only after a full 720° rotation do the belts untwist and return to their original configuration. This topological property is real and measurable.</p>
				</div>

				<hr />

				<h2>The Energy-Momentum Relation</h2>
				<p>
					Special relativity gives us the energy-momentum relation: E² = (pc)² + (mc²)². This is the relativistic version of E = mc² that actually works for moving particles. For a massless photon, it becomes E = pc. For a particle at rest, it becomes E = mc².
				</p>
				<p>
					The Dirac equation respects this exactly — but it also has solutions for both the positive square root (particles) and the negative square root (antiparticles). The "mass gap" between the two branches is 2mc², which is the minimum energy needed to create a particle-antiparticle pair from scratch.
				</p>

				<div class="viz-card">
					<div class="viz-title">Visualization 3 — Relativistic Energy-Momentum Dispersion</div>
					<canvas id="energyCanvas" data-height="340" style="width:100%;display:block;border-radius:8px;"></canvas>
					<div class="viz-controls">
						<button id="energyPlayBtn" class="viz-btn viz-btn-active" onclick={() => (window as any).toggleEnergy()}>⏸ Pause</button>
					</div>
					<p class="viz-caption">E vs momentum p. Blue branch: electrons. Orange branch: positrons. The gap between them is 2mc² — the energy cost of creating a pair from nothing. Massless particles (photons) travel along the dashed light cone (E = pc).</p>
				</div>

				<hr />

				<h2>Zitterbewegung — The Trembling Motion</h2>
				<p>
					One of the stranger predictions that falls out of the Dirac equation is <em>Zitterbewegung</em> — German for "trembling motion." Even a free electron at rest, with no forces acting on it, exhibits a rapid oscillatory motion at roughly 10²⁰ Hz. This emerges from the interference between the positive and negative energy components of the Dirac spinor.
				</p>
				<p>
					It was long considered a mathematical curiosity — the oscillations happen at too high a frequency and too small a scale (near the Compton wavelength ~2.4 × 10⁻¹² m) to observe directly for electrons. But in 2010, physicists simulated Zitterbewegung with trapped ions, and it has since been observed in graphene and other condensed matter systems where the effective "speed of light" is much slower and the effect becomes accessible.
				</p>

				<div class="viz-card">
					<div class="viz-title">Visualization 4 — Zitterbewegung (Trembling Motion)</div>
					<canvas id="zittCanvas" data-height="280" style="width:100%;display:block;border-radius:8px;"></canvas>
					<div class="viz-controls">
						<button id="zittPlayBtn" class="viz-btn viz-btn-active" onclick={() => (window as any).toggleZitt()}>⏸ Pause</button>
					</div>
					<p class="viz-caption">The expected position of a free electron vs time. The smooth drift (group velocity) is overlaid with rapid Zitterbewegung oscillations — a consequence of the positive and negative energy components of the Dirac wavepacket interfering. Scale is exaggerated for visibility.</p>
				</div>

				<hr />

				<h2>The Hidden Braid: ε₀, μ₀, and What c = 1 Reveals</h2>
				<p>
					Here's something I didn't expect to find beautiful. The permeability and permittivity of free space — μ₀ and ε₀, the constants that describe how electric and magnetic fields propagate through vacuum — are not independent. Their product is:
				</p>
				<p class="eq-display" style="font-size:1rem;">ε₀ × μ₀ = 1/c²</p>
				<p>
					The speed of light isn't imposed on electromagnetism from outside. It <em>emerges</em> from the structure of the field equations themselves. That's not a coincidence — it was Maxwell's actual discovery in 1865. He wrote down the equations governing electric and magnetic fields, solved for how fast oscillations in those fields would propagate, and got: exactly the measured speed of light. Light <em>is</em> an electromagnetic wave.
				</p>
				<p>
					That factor of 4π in μ₀ (it's defined as 4π × 10⁻⁷ H/m in SI) isn't arbitrary either. It comes from the spherical geometry of electromagnetic fields — the solid angle subtended by a full sphere is 4π steradians. The geometry of three-dimensional space is baked into the constants of nature.
				</p>
				<p>
					Now take natural units and set c = 1. Then 1/c² becomes 1. The product ε₀ × μ₀ collapses to 1. Space and time become interchangeable — you measure them in the same units. E = mc² becomes simply E = m. The Dirac equation sheds every c and ℏ from its formula, which is exactly how I've been displaying it in these visualizations.
				</p>
				<p>
					The particular value 299,792,458 m/s isn't a fundamental truth — it's the accident of how long a metre turned out to be when French scientists defined it relative to Earth's circumference in the 1790s. Set c = 1 and you're not losing information. You're removing a layer of historical contingency and seeing the underlying structure more clearly. That's what Dirac was doing when he wrote his equation in natural units: stripping away the dimensional scaffolding to find out what nature actually required.
				</p>

				<hr />

				<h2>Why This Still Matters</h2>
				<p>
					The Dirac equation is not historical curiosity. It is the foundation of quantum field theory, which is the most precisely tested physical theory in human history. The prediction of the electron's anomalous magnetic moment matches experiment to better than one part in a trillion.
				</p>
				<p>
					Everything made of matter — quarks, leptons, and everything built from them — is described by a field that satisfies a version of the Dirac equation. The Standard Model is, at its core, Dirac equations coupled to gauge fields.
				</p>
				<p>
					Dirac also originated a style of doing physics that went something like: if your math is beautiful and internally consistent, trust it, even when it's telling you something that seems impossible. The equation told him there were negative energy solutions. He trusted it. He was right. The positron exists.
				</p>
				<p>
					That attitude — following rigorous structure into unfamiliar territory — is something I find myself reaching back to in software as well. The weird output that makes no immediate sense is sometimes pointing at something real that you haven't understood yet.
				</p>

				<blockquote>
					<strong>A note on the machine itself.</strong> Dirac (the workstation) is an i7-10700K with 62GB of RAM and an RTX 3060 with 12GB VRAM. It's been running Arch Linux with Omarchy since May. As of this month it's also running local AI models via Ollama — including qwen2.5-coder:14b and qwen3:8b, both of which fit on the GPU at Q4 quantization. I find it mildly amusing that a machine named after the man who predicted antimatter is now generating poems and analyzing code on its own.
				</blockquote>

				<hr />

				<h2>Further Reading</h2>
				<ul>
					<li><em>The Strangest Man</em> by Graham Farmelo — a biography of Dirac that reads like fiction</li>
					<li>Dirac's original 1928 paper: "The Quantum Theory of the Electron," <em>Proc. R. Soc. Lond. A</em></li>

					<li><em>Quantum Field Theory in a Nutshell</em> by A. Zee if you want the actual math</li>
				</ul>
			</div>
		</div>
	</main>

	<SocialLinks />
	<Footer />
</div>

<style>
	.life-illo-wrap {
		margin: 1.75rem 0 0.5rem;
	}
	.life-illo-wrap svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.life-illo-caption {
		text-align: center;
		font-size: 0.8rem;
		font-style: italic;
		color: var(--color-text-secondary);
		margin: 0.4rem 0 1.5rem;
	}
	.post-meta {
		display: flex;
		gap: var(--spacing-md);
		font-size: 0.875rem;
		margin-top: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}
	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-md);
	}
	.post-tag {
		display: inline-block;
		padding: 0.125rem var(--spacing-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-accent);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	/* ── Prose ── */
	.prose {
		font-size: 1.0625rem;
		line-height: 1.8;
		color: var(--color-text);
	}
	.prose :global(h2), .prose h2 {
		font-size: 1.5rem; font-weight: 600;
		margin-top: var(--spacing-2xl); margin-bottom: var(--spacing-md);
	}
	.prose :global(h3), .prose h3 {
		font-size: 1.2rem; font-weight: 600;
		margin-top: var(--spacing-xl); margin-bottom: var(--spacing-sm);
	}
	.prose p { margin-bottom: var(--spacing-md); }
	.prose a { color: var(--color-primary); text-decoration: underline; }
	.prose strong { font-weight: 600; }
	.prose em { font-style: italic; }
	.prose ul { margin-bottom: var(--spacing-md); padding-left: var(--spacing-xl); }
	.prose li { margin-bottom: var(--spacing-xs); }
	.prose hr { border: none; border-top: 1px solid var(--color-border); margin: var(--spacing-2xl) 0; }
	.prose blockquote {
		border-left: 3px solid var(--color-accent);
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		font-size: 0.9rem;
		margin: var(--spacing-lg) 0;
	}
	.prose code {
		font-family: var(--font-mono);
		font-size: 0.875em;
		background: var(--color-surface);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
	}

	.eq-display {
		text-align: center;
		font-family: 'Georgia', serif;
		font-size: clamp(1.5rem, 4vw, 3rem);
		letter-spacing: 0.05em;
		padding: 1rem 0;
	}

	.eq-unit-badge {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.2rem 0.65rem;
		border-radius: var(--radius-sm);
		margin-bottom: 0.85rem;
	}
	.eq-unit-natural {
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
	}
	.eq-unit-si {
		background: color-mix(in srgb, var(--color-text-secondary) 12%, transparent);
		color: var(--color-text-secondary);
		border: 1px solid color-mix(in srgb, var(--color-text-secondary) 30%, transparent);
	}

	/* ── Viz cards ── */
	.viz-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin: var(--spacing-xl) 0;
		overflow: hidden;
	}
	.eq-card { text-align: center; }
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
	.viz-btn {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border: 1px solid var(--color-accent);
		color: var(--color-accent);
		border-radius: var(--radius-sm);
		padding: 0.3rem 0.75rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.viz-btn:hover, .viz-btn.viz-btn-active {
		background: var(--color-accent);
		color: #fff;
	}
	:global(.viz-btn-active) {
		background: var(--color-accent) !important;
		color: #fff !important;
	}
</style>
