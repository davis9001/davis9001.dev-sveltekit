<!--
  RiverColumns — a three-column reading mode for long posts on wide screens.

  The page itself does not scroll. The columns do, in unison: three windows
  onto one continuous flow, each offset from the last by exactly one column
  height. Text rises inside a column and, where it leaves the top of column 2,
  it continues at the bottom of column 1 — so at any instant you read left to
  right, and new text arrives at the bottom right.

  Wheel, trackpad and keyboard drive the flow directly, eased rather than
  stepped, so it glides instead of jumping. While it is active the document
  scroll is locked, because two things that both answer to one wheel is a
  fight the reader always loses.

  Column 1 holds the real content. Screen readers and keyboard users get that
  one, complete and in order; the rest are inert, aria-hidden clones showing
  what is coming next, so nothing is announced or focusable twice. Interactive
  embeds only work in column 1 for the same reason — they become live as the
  text reaches it.

  Offsets are applied as native scrollTop rather than transforms: translating
  a subtree the height of a whole article leaves the browser unable to
  invalidate it, and figures paint blank.

  Without JS, or below the width threshold, none of this activates and the
  slot renders as an ordinary single column in a normally scrolling page.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	/** How many windows onto the flow. Three is the designed case. */
	export let columns = 3;
	/** Below this viewport width the river never activates. */
	export let minWidth = 1100;
	/** Caller's switch, so a reader can opt back out to one column. */
	export let enabled = true;

	let hostEl: HTMLDivElement;
	let viewportEl: HTMLDivElement;
	let colEls: HTMLDivElement[] = [];
	let flowEls: HTMLDivElement[] = [];

	let active = false;
	let columnHeight = 0;
	let maxOffset = 0;

	/** Where the reader is steering, and where the carpet actually is. */
	let targetOffset = 0;
	let currentOffset = 0;
	let glideFrame = 0;

	let mql: MediaQueryList | null = null;
	let resizeObserver: ResizeObserver | null = null;

	$: progress = maxOffset > 0 ? Math.min(1, Math.max(0, currentOffset / maxOffset)) : 0;

	const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

	function prefersReducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/** Line height of the body copy, so column heights land on whole lines. */
	function lineGrid(): number {
		// Prefer body copy: the flow now starts with the post's title and
		// excerpt, whose line heights are not the reading grid.
		const sample =
			flowEls[0]?.querySelector('.cms-content p') ?? flowEls[0]?.querySelector('p');
		if (!sample) return 0;
		const lh = parseFloat(getComputedStyle(sample).lineHeight);
		return Number.isFinite(lh) && lh > 0 ? lh : 0;
	}

	function measure() {
		if (!active || !flowEls[0] || !hostEl) return;

		// Whatever sits above the river — nav, title, byline — has already been
		// laid out, so the space left in the window is what the columns get.
		const top = hostEl.getBoundingClientRect().top + window.scrollY;
		const available = Math.max(320, window.innerHeight - top - 32);

		// Snapping to whole lines stops the boundary slicing a line in half
		// horizontally, its top on one column and its bottom on the next.
		const lh = lineGrid();
		const snap = (h: number) => (lh ? Math.max(lh * 4, Math.floor(h / lh) * lh) : h);

		columnHeight = snap(available);
		viewportEl.style.height = `${columnHeight}px`;
		hostEl.style.height = `${columnHeight}px`;

		// Anything after the river — footer, trailing margins — can still push
		// the document past the viewport, and a page with somewhere to go will
		// go there. Take that overflow out of the columns so there is nothing
		// left to scroll.
		const overflow = document.documentElement.scrollHeight - window.innerHeight;
		if (overflow > 0) {
			columnHeight = snap(Math.max(320, columnHeight - overflow));
			viewportEl.style.height = `${columnHeight}px`;
			hostEl.style.height = `${columnHeight}px`;
		}

		const articleHeight = flowEls[0].scrollHeight;
		maxOffset = Math.max(0, articleHeight - columns * columnHeight);

		targetOffset = clamp(targetOffset, 0, maxOffset);
		currentOffset = clamp(currentOffset, 0, maxOffset);
		applyOffsets();
	}

	/** Columns 2..n mirror the rendered markup of column 1. */
	function syncClones() {
		if (!active || !flowEls[0]) return;
		const markup = flowEls[0].innerHTML;
		for (let i = 1; i < flowEls.length; i++) {
			if (flowEls[i]) flowEls[i].innerHTML = markup;
		}
	}

	function applyOffsets() {
		for (let i = 0; i < colEls.length; i++) {
			if (colEls[i]) colEls[i].scrollTop = currentOffset + i * columnHeight;
		}
	}

	/**
	 * Ease toward wherever the reader has steered. A carpet, not a staircase —
	 * and it stops running the moment it has arrived.
	 */
	function glide() {
		glideFrame = 0;
		const remaining = targetOffset - currentOffset;

		if (Math.abs(remaining) < 0.5) {
			currentOffset = targetOffset;
			applyOffsets();
			return;
		}

		currentOffset += remaining * 0.18;
		applyOffsets();
		glideFrame = requestAnimationFrame(glide);
	}

	function steerTo(next: number) {
		targetOffset = clamp(next, 0, maxOffset);
		if (prefersReducedMotion()) {
			currentOffset = targetOffset;
			applyOffsets();
			return;
		}
		if (!glideFrame) glideFrame = requestAnimationFrame(glide);
	}

	function steerBy(delta: number) {
		steerTo(targetOffset + delta);
	}

	function onWheel(event: WheelEvent) {
		if (!active) return;
		// deltaMode 1 is lines, 2 is pages; normalise both to pixels.
		const unit =
			event.deltaMode === 1 ? columnHeight / 20 : event.deltaMode === 2 ? columnHeight : 1;
		event.preventDefault();
		steerBy(event.deltaY * unit);
	}

	function isTypingTarget(node: EventTarget | null): boolean {
		const el = node as HTMLElement | null;
		if (!el || !el.tagName) return false;
		return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!active || event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;

		const page = columnHeight * 0.9;
		let delta: number | null = null;
		let absolute: number | null = null;

		switch (event.key) {
			case 'ArrowDown':
				delta = 80;
				break;
			case 'ArrowUp':
				delta = -80;
				break;
			case 'PageDown':
				delta = page;
				break;
			case 'PageUp':
				delta = -page;
				break;
			case ' ':
				delta = event.shiftKey ? -page : page;
				break;
			case 'Home':
				absolute = 0;
				break;
			case 'End':
				absolute = maxOffset;
				break;
			default:
				return;
		}

		event.preventDefault();
		if (absolute !== null) steerTo(absolute);
		else if (delta !== null) steerBy(delta);
	}

	/**
	 * Column 1 is clipped, so a focused link out of view would be invisible
	 * with no way to reveal it. Bring the flow to it instead of moving a page
	 * that no longer scrolls.
	 */
	function onFocusIn(event: FocusEvent) {
		if (!active || !flowEls[0]) return;
		const target = event.target as HTMLElement | null;
		if (!target || !flowEls[0].contains(target)) return;

		const offsetInFlow =
			target.getBoundingClientRect().top - flowEls[0].getBoundingClientRect().top;
		if (offsetInFlow >= 0 && offsetInFlow <= columnHeight - 48) return;
		steerTo(currentOffset + offsetInFlow - columnHeight / 3);
	}

	/** Two things answering to one wheel is a fight the reader always loses. */
	function lockDocumentScroll(lock: boolean) {
		const root = document.documentElement;
		if (lock) {
			root.classList.add('river-scroll-lock');
			window.scrollTo({ top: 0 });
		} else {
			root.classList.remove('river-scroll-lock');
		}
	}

	function teardown() {
		active = false;
		lockDocumentScroll(false);
		if (glideFrame) cancelAnimationFrame(glideFrame);
		glideFrame = 0;
		targetOffset = 0;
		currentOffset = 0;

		if (hostEl) hostEl.style.height = '';
		if (viewportEl) viewportEl.style.height = '';
		for (let i = 0; i < colEls.length; i++) {
			if (colEls[i]) colEls[i].scrollTop = 0;
		}
		for (let i = 1; i < flowEls.length; i++) {
			if (flowEls[i]) flowEls[i].innerHTML = '';
		}
	}

	function evaluate() {
		const shouldRun = enabled && Boolean(mql?.matches);
		if (shouldRun === active) {
			if (active) measure();
			return;
		}
		if (shouldRun) {
			active = true;
			lockDocumentScroll(true);
			syncClones();
			measure();
		} else {
			teardown();
		}
	}

	$: if (mql) {
		void enabled;
		evaluate();
	}

	onMount(() => {
		mql = window.matchMedia(`(min-width: ${minWidth}px)`);
		mql.addEventListener('change', evaluate);
		window.addEventListener('resize', measure);
		window.addEventListener('keydown', onKeydown);
		// Must be non-passive: Svelte's on:wheel is registered passive, which
		// makes preventDefault a no-op and lets the document scroll anyway.
		hostEl.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('focusin', onFocusIn);

		// Images and embeds land after first paint and change the flow height.
		resizeObserver = new ResizeObserver(() => {
			syncClones();
			measure();
		});
		if (flowEls[0]) resizeObserver.observe(flowEls[0]);

		evaluate();
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		if (glideFrame) cancelAnimationFrame(glideFrame);
		lockDocumentScroll(false);
		mql?.removeEventListener('change', evaluate);
		window.removeEventListener('resize', measure);
		window.removeEventListener('keydown', onKeydown);
		hostEl?.removeEventListener('wheel', onWheel);
		window.removeEventListener('focusin', onFocusIn);
		resizeObserver?.disconnect();
	});
</script>

<div class="river" class:river-active={active} bind:this={hostEl}>
	<div class="river-viewport" bind:this={viewportEl} style="--river-columns: {columns}">
		<div class="river-col" bind:this={colEls[0]}>
			<div class="river-flow" bind:this={flowEls[0]}><slot /></div>
		</div>
		{#each Array(Math.max(0, columns - 1)) as _, i}
			<div class="river-col" aria-hidden="true" inert bind:this={colEls[i + 1]}>
				<div class="river-flow" bind:this={flowEls[i + 1]}></div>
			</div>
		{/each}
	</div>

	{#if active && maxOffset > 0}
		<!-- The document scrollbar is gone, so the reader needs some other way
		     to tell how far through they are. -->
		<div
			class="river-progress"
			role="progressbar"
			aria-label="Reading progress"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress * 100)}
		>
			<div class="river-progress-bar" style="transform: scaleX({progress})"></div>
		</div>
	{/if}
</div>

<style>
	/* Inactive: the slot is an ordinary block, so no-JS and narrow screens get
	   the normal single-column article in a normally scrolling page. */
	.river-viewport {
		display: block;
	}

	.river-active {
		position: relative;
		overscroll-behavior: contain;
	}

	.river-active .river-viewport {
		display: grid;
		grid-template-columns: repeat(var(--river-columns), 1fr);
		gap: var(--spacing-xl, 2rem);
		overflow: clip;
	}

	/* Each column is its own scroll port onto the flow — see applyOffsets. */
	.river-active .river-col {
		position: relative;
		min-width: 0;
		height: 100%;
		overflow: hidden;
		scrollbar-width: none;
	}

	.river-active .river-col::-webkit-scrollbar {
		display: none;
	}

	.river-progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-border);
	}

	.river-progress-bar {
		height: 100%;
		width: 100%;
		transform-origin: left center;
		background: var(--color-primary);
	}
</style>
