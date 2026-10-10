/**
 * Shared canvas helpers for the Dirac embed visualizations.
 *
 * Dependency-injected (document/window objects passed in or defaulted) so
 * the math and setup logic can be unit-tested with fakes — happy-dom's
 * canvas support is unreliable.
 */

export interface CanvasSetup {
	ctx: CanvasRenderingContext2D;
	w: number;
	h: number;
}

/** Read a CSS custom property from the document root (theme variables) */
export function getVar(name: string, doc: Document = document): string {
	return getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
}

/** Size a canvas for the device pixel ratio using its data-height attribute */
export function setupCanvas(
	canvas: HTMLCanvasElement,
	win: Pick<Window, 'devicePixelRatio'> = window
): CanvasSetup | null {
	const dpr = win.devicePixelRatio || 1;
	const h = parseInt(canvas.getAttribute('data-height') || '300');
	canvas.height = h * dpr;
	canvas.style.height = h + 'px';
	// Use parent clientWidth as fallback: getBoundingClientRect can return 0
	// at mount time on mobile before layout is fully computed.
	const rect = canvas.getBoundingClientRect();
	const w = rect.width || canvas.parentElement?.clientWidth || 300;
	canvas.width = w * dpr;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return null;
	}
	ctx.scale(dpr, dpr);
	return { ctx, w, h };
}

export interface ResizeHandle {
	disconnect: () => void;
}

/**
 * Observe a canvas for width changes and re-scale it, calling onResize with
 * fresh dimensions. mobileHeight applies below 480px width when provided.
 */
export function observeCanvasResize(
	canvas: HTMLCanvasElement,
	onResize: (setup: CanvasSetup) => void,
	options: { mobileHeight?: number; desktopHeight?: number } = {},
	win: Pick<Window, 'devicePixelRatio'> = window
): ResizeHandle {
	if (typeof ResizeObserver === 'undefined') {
		return { disconnect: () => {} };
	}

	const observer = new ResizeObserver((entries) => {
		const entry = entries[0];
		if (!entry || !entry.contentRect.width) return;

		const dpr = win.devicePixelRatio || 1;
		const w = entry.contentRect.width;
		const baseHeight =
			options.desktopHeight ?? parseInt(canvas.getAttribute('data-height') || '300');
		const h = options.mobileHeight !== undefined && w < 480 ? options.mobileHeight : baseHeight;

		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.height = h + 'px';
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		onResize({ ctx, w, h });
	});
	observer.observe(canvas);

	return { disconnect: () => observer.disconnect() };
}

/**
 * Run a requestAnimationFrame loop with proper cleanup. Returns a stop
 * function that cancels the pending frame (fixes the leak in the original
 * page, which never cancelled its loops).
 */
export function startLoop(draw: () => void): () => void {
	let rafId = 0;
	let stopped = false;

	function frame() {
		if (stopped) return;
		draw();
		rafId = requestAnimationFrame(frame);
	}
	rafId = requestAnimationFrame(frame);

	return () => {
		stopped = true;
		cancelAnimationFrame(rafId);
	};
}
