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
  one, complete and in order; the rest are aria-hidden clones with everything
  inside taken out of the tab order, so the article is announced once and
  tabbed through once while every column stays clickable. Interactive embeds
  only run in column 1 — a clone is markup, not a mounted component — so they
  come alive as the text reaches it.

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
	/** Offset at which the last column stops holding text. */
	let drainStart = 0;

	/** Where this reader had got to, kept per post so a refresh does not restart it. */
	$: storageKey = `river-position:${typeof location === 'undefined' ? '' : location.pathname}`;
	let articleHeight = 0;
	/** Held until the layout stops moving, then dropped. */
	let pendingRestore: { offset: number; height: number } | null = null;
	let restoreRead = false;
	let readerHasSteered = false;

	/** Each chart's place in the flow, and the ones that have already played. */
	let chartBands: Array<{ top: number; bottom: number }> = [];
	const playedCharts = new Set<number>();

	/** Where the reader is steering, and where the carpet actually is. */
	let targetOffset = 0;
	let currentOffset = 0;
	let glideFrame = 0;

	let mql: MediaQueryList | null = null;
	let resizeObserver: ResizeObserver | null = null;

	$: progress = maxOffset > 0 ? Math.min(1, Math.max(0, currentOffset / maxOffset)) : 0;

	/** 0 while there is still text to the right, 1 once the post has drained. */
	$: drain =
		maxOffset > drainStart
			? Math.min(1, Math.max(0, (currentOffset - drainStart) / (maxOffset - drainStart)))
			: 0;
	let atEnd = false;
	// Column 3 is empty by 0.5 and column 2 by 1, so the ending commits late
	// and leaves late: arriving twice because the wheel wobbled is worse than
	// arriving slightly early.
	$: if (drain > 0.82) atEnd = true;
	else if (drain < 0.35) atEnd = false;

	const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

	function prefersReducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/** Line height of the body copy, so column heights land on whole lines. */
	function lineGrid(): number {
		// Prefer body copy: the flow now starts with the post's title and
		// excerpt, whose line heights are not the reading grid.
		const sample = flowEls[0]?.querySelector('.cms-content p') ?? flowEls[0]?.querySelector('p');
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

		// Measure the article on its own: the tail padding below is ours, not
		// the post's, and counting it would inflate the travel every pass.
		for (const flow of flowEls) {
			if (flow) flow.style.paddingBottom = '';
		}
		articleHeight = flowEls[0].scrollHeight;

		// scrollTop clamps at the end of the content, so without somewhere to
		// go the right-hand columns stay pinned on the last screenful instead
		// of emptying. Give every column a column-height of blank per step so
		// the post can leave the frame entirely.
		const tail = (columns - 1) * columnHeight;
		for (const flow of flowEls) {
			if (flow) flow.style.paddingBottom = `${tail}px`;
		}
		// The last word arrives in column 1, not column 3: travel far enough for
		// the tail to drain out of the right-hand columns and rise through the
		// left one. The final stretch is what the outro reveal is keyed to.
		drainStart = Math.max(0, articleHeight - columns * columnHeight);
		maxOffset = Math.max(0, articleHeight - columnHeight);

		measureCharts();
		restorePosition();

		targetOffset = clamp(targetOffset, 0, maxOffset);
		currentOffset = clamp(currentOffset, 0, maxOffset);
		applyOffsets();
	}

	/** Anything a reader could tab to or click. */
	const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], iframe, audio, video';

	/**
	 * Columns 2..n mirror the rendered markup of column 1.
	 *
	 * They were `inert`, which also kills pointer events — and since reading
	 * runs left to right, most links a reader can see live in these columns, so
	 * most links were dead. They are aria-hidden with everything inside taken
	 * out of the tab order instead: the same trick the blog cards use, and it
	 * leaves the mouse working while the article is still announced once.
	 */
	function syncClones() {
		if (!active || !flowEls[0]) return;
		playedCharts.clear();
		const markup = flowEls[0].innerHTML;
		for (let i = 1; i < flowEls.length; i++) {
			if (!flowEls[i]) continue;
			flowEls[i].innerHTML = markup;
			for (const el of flowEls[i].querySelectorAll(FOCUSABLE)) {
				el.setAttribute('tabindex', '-1');
			}

			// A chart hides its own marks under `chart-anim` and waits for
			// CmsContent's observer to add `in-view` — an observer that will
			// never watch a clone. Keep the armed class and clear the cue, so
			// the copies start hidden and we play them ourselves.
			// Ids belong to the real article only: three copies of one id makes
			// every lookup a coin toss, anchors included.
			for (const el of flowEls[i].querySelectorAll('[id]')) {
				el.removeAttribute('id');
			}

			for (const chart of flowEls[i].querySelectorAll('svg.cms-chart')) {
				chart.classList.add('chart-anim');
				chart.classList.remove('in-view');
			}
		}
	}

	/** Chart positions within the flow, which do not move when a column scrolls. */
	function measureCharts() {
		const flow = flowEls[0];
		if (!flow) {
			chartBands = [];
			return;
		}
		const flowTop = flow.getBoundingClientRect().top;
		chartBands = [...flow.querySelectorAll('svg.cms-chart')].map((chart) => {
			const rect = chart.getBoundingClientRect();
			return { top: rect.top - flowTop, bottom: rect.top - flowTop + rect.height };
		});
	}

	/**
	 * Play every copy of a chart at the same moment.
	 *
	 * A chart sitting across a column boundary is drawn twice — its top in one
	 * column, its bottom in the next — so if the copies animated independently
	 * the two halves of one chart would disagree. Each chart runs once, when it
	 * first shows up in any column, and every instance is cued in the same tick.
	 */
	function syncChartPlayback() {
		for (let k = 0; k < chartBands.length; k++) {
			if (playedCharts.has(k)) continue;
			const band = chartBands[k];

			const onScreen = colEls.some((col, i) => {
				if (!col) return false;
				const windowTop = currentOffset + i * columnHeight;
				return band.top < windowTop + columnHeight && band.bottom > windowTop;
			});
			if (!onScreen) continue;

			playedCharts.add(k);
			for (const flow of flowEls) {
				const chart = flow?.querySelectorAll('svg.cms-chart')[k];
				chart?.classList.add('chart-anim', 'in-view');
			}
		}
	}

	function applyOffsets() {
		for (let i = 0; i < colEls.length; i++) {
			if (colEls[i]) colEls[i].scrollTop = currentOffset + i * columnHeight;
		}
		syncChartPlayback();
		savePosition();
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
		readerHasSteered = true;
		pendingRestore = null;
		steerTo(targetOffset + delta);
	}

	/** Where a thing sits in the flow, which does not move when a column scrolls. */
	function offsetOf(el: Element): number {
		const flow = flowEls[0];
		if (!flow) return 0;
		return el.getBoundingClientRect().top - flow.getBoundingClientRect().top;
	}

	/**
	 * The page cannot scroll, so the browser's own anchor handling has nothing
	 * to move: a hash would land the reader at the top of an unmoving post.
	 * Bring the flow to the target instead. Scoped to column 1 — the clones
	 * have had their ids stripped, but this is the lookup that must not guess.
	 */
	function goToHash(hash: string, behaviour: 'jump' | 'glide' = 'glide'): boolean {
		const id = hash.replace(/^#/, '');
		if (!id || !flowEls[0]) return false;

		let target: Element | null = null;
		try {
			target = flowEls[0].querySelector(`#${CSS.escape(id)}`);
		} catch {
			return false;
		}
		if (!target) return false;

		const next = clamp(offsetOf(target) - columnHeight / 8, 0, maxOffset);
		if (behaviour === 'jump') {
			targetOffset = next;
			currentOffset = next;
			applyOffsets();
		} else {
			steerTo(next);
		}
		return true;
	}

	/** In-page links cannot rely on the browser either, so take them here. */
	function onAnchorClick(event: MouseEvent) {
		if (!active || event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
		if (!anchor) return;

		const href = anchor.getAttribute('href') ?? '';
		if (!href.startsWith('#')) return;

		if (goToHash(href)) {
			event.preventDefault();
			history.replaceState(history.state, '', href);
		}
	}

	function onHashChange() {
		if (active && location.hash) goToHash(location.hash);
	}

	/** Have the pictures finished arriving and stopped changing the height? */
	function layoutSettled(): boolean {
		const images = flowEls[0]?.querySelectorAll('img');
		if (!images) return true;
		return [...images].every((image) => image.complete);
	}

	/**
	 * Put the reader back where they were.
	 *
	 * The catch is that the first measurement happens before the images have
	 * loaded, so the flow is shorter then than it will be a moment later — a
	 * position applied against that height lands short. So the saved spot is
	 * held and re-applied on every measurement until the layout stops moving,
	 * and only then let go. It also stores an absolute offset with the height
	 * it was taken against: reopening at the same size restores the exact
	 * pixel, and a different size scales it rather than guessing.
	 */
	function restorePosition() {
		if (maxOffset <= 0) return;

		if (!restoreRead) {
			restoreRead = true;
			if (location.hash && goToHash(location.hash, 'jump')) return;
			try {
				const raw = sessionStorage.getItem(storageKey);
				const saved = raw ? JSON.parse(raw) : null;
				if (saved && Number.isFinite(saved.offset) && saved.offset > 0) {
					pendingRestore = { offset: Number(saved.offset), height: Number(saved.height) || 0 };
				}
			} catch {
				// Storage blocked or corrupt — starting at the top is fine.
			}
		}

		if (!pendingRestore || readerHasSteered) return;

		const scale =
			pendingRestore.height > 0 && articleHeight > 0 ? articleHeight / pendingRestore.height : 1;
		const next = clamp(pendingRestore.offset * scale, 0, maxOffset);
		targetOffset = next;
		currentOffset = next;
		applyOffsets();

		if (layoutSettled()) pendingRestore = null;
	}

	function savePosition() {
		if (!active || maxOffset <= 0 || pendingRestore) return;
		try {
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({ offset: Math.round(currentOffset), height: Math.round(articleHeight) })
			);
		} catch {
			// Not worth failing anything over.
		}
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
	 * The document scroll is locked while the river runs, so on a wide touch
	 * screen — an iPad in landscape clears the width threshold — a finger has
	 * to drive the flow directly or the post is simply unreadable.
	 */
	let lastTouchY: number | null = null;

	function onTouchStart(event: TouchEvent) {
		if (!active || event.touches.length !== 1) return;
		lastTouchY = event.touches[0].clientY;
	}

	function onTouchMove(event: TouchEvent) {
		if (!active || lastTouchY === null || event.touches.length !== 1) return;
		event.preventDefault();
		const y = event.touches[0].clientY;
		steerBy(lastTouchY - y);
		lastTouchY = y;
	}

	function onTouchEnd() {
		lastTouchY = null;
	}

	/**
	 * Column 1 is clipped, so a focused link out of view would be invisible
	 * with no way to reveal it. Bring the flow to it instead of moving a page
	 * that no longer scrolls.
	 */
	function onFocusIn(event: FocusEvent) {
		if (!active || !flowEls[0] || !colEls[0]) return;
		const target = event.target as HTMLElement | null;
		if (!target || !flowEls[0].contains(target)) return;

		// Measure against the column, not the flow: the flow's rect already
		// moves with scrollTop, so a flow-relative offset is the target's place
		// in the whole article and double-counts the current offset.
		const inWindow = target.getBoundingClientRect().top - colEls[0].getBoundingClientRect().top;
		if (inWindow >= 0 && inWindow <= columnHeight - 48) return;
		steerTo(currentOffset + inWindow - columnHeight / 3);
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
		savePosition();
		active = false;
		restoreRead = false;
		pendingRestore = null;
		readerHasSteered = false;
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
		for (let i = 0; i < flowEls.length; i++) {
			if (!flowEls[i]) continue;
			flowEls[i].style.paddingBottom = '';
			if (i > 0) flowEls[i].innerHTML = '';
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
		hostEl.addEventListener('touchstart', onTouchStart, { passive: true });
		// Non-passive for the same reason as wheel: the drag must not also
		// rubber-band the locked document.
		hostEl.addEventListener('touchmove', onTouchMove, { passive: false });
		hostEl.addEventListener('touchend', onTouchEnd, { passive: true });
		hostEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
		window.addEventListener('focusin', onFocusIn);
		window.addEventListener('hashchange', onHashChange);
		hostEl.addEventListener('click', onAnchorClick);

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
		hostEl?.removeEventListener('touchstart', onTouchStart);
		hostEl?.removeEventListener('touchmove', onTouchMove);
		hostEl?.removeEventListener('touchend', onTouchEnd);
		hostEl?.removeEventListener('touchcancel', onTouchEnd);
		window.removeEventListener('focusin', onFocusIn);
		window.removeEventListener('hashchange', onHashChange);
		hostEl?.removeEventListener('click', onAnchorClick);
		resizeObserver?.disconnect();
	});
</script>

<div class="river" class:river-active={active} bind:this={hostEl}>
	<div class="river-viewport" bind:this={viewportEl} style="--river-columns: {columns}">
		<div class="river-col" bind:this={colEls[0]}>
			<div class="river-flow" bind:this={flowEls[0]}><slot /></div>
		</div>
		{#each Array(Math.max(0, columns - 1)) as _, i}
			<div class="river-col" aria-hidden="true" bind:this={colEls[i + 1]}>
				<div class="river-flow" bind:this={flowEls[i + 1]}></div>
			</div>
		{/each}
	</div>

	{#if active}
		<!-- Until it has arrived it is transparent and pointer-events: none, but
		     its links would still be in the tab order — so it is inert too. -->
		<div
			class="river-outro"
			class:river-outro-revealed={atEnd}
			style="--drain: {drain}; --river-columns: {columns}"
			aria-hidden={!atEnd}
			inert={!atEnd}
		>
			<div class="river-outro-stage" aria-hidden="true">
				<span class="river-sweep"></span>
				{#each Array(7) as _, line}
					<span
						class="river-ghost"
						style="--i: {line}; --l: {6 + (line % 3) * 4}%; --r: {10 + (line % 4) * 9}%"
					></span>
				{/each}
			</div>
			<div class="river-outro-inner">
				<slot name="outro" {atEnd} />
			</div>
		</div>
	{/if}

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

{#if !active}
	<slot name="outro" atEnd={true} />
{/if}

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

	/* The outro occupies the same space the columns are vacating, so the post
	   drains out of the right and the ending fades up in its place. `--drain`
	   runs 0 → 1 across that final stretch. */
	.river-outro {
		position: absolute;
		inset: 0 0 2px 0;
		display: grid;
		grid-template-columns: repeat(var(--river-columns), 1fr);
		gap: var(--spacing-xl, 2rem);
		align-items: center;
		pointer-events: none;
		opacity: calc(var(--drain, 0) * 1.6 - 0.15);
		transform: translateY(calc((1 - var(--drain, 0)) * 26px));
	}

	/* Only the panel itself takes clicks. The wrapper spans every column, so
	   making it clickable would swallow anything aimed at column 1, which is
	   still holding the last of the post. */
	.river-outro-revealed .river-outro-inner {
		pointer-events: auto;
	}

	/* Columns 2..n are the ones that empty, so that is where the ending goes. */
	.river-outro-inner {
		position: relative;
		grid-column: 2 / -1;
		justify-self: center;
		width: min(760px, 100%);
		padding: 0 var(--spacing-lg, 1.5rem);
	}

	/* The arrival. The post has just streamed up and out of these columns, so
	   the ending is built out of the same motion rather than dropped on top of
	   it: ghosts of the lines that left keep rising and fading, a sweep of
	   light runs up the vacated space, and the ending resolves in its wake. */
	.river-outro-stage {
		position: absolute;
		inset: -8% 0;
		overflow: hidden;
		pointer-events: none;
		opacity: 0;
	}

	.river-outro-revealed .river-outro-stage {
		animation: river-stage 2200ms ease-out both;
	}

	/* Ghosts of the text that just left, still travelling upward. */
	.river-ghost {
		position: absolute;
		left: var(--l, 8%);
		right: var(--r, 14%);
		top: 78%;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--color-text) 26%, transparent),
			transparent
		);
		opacity: 0;
	}

	.river-outro-revealed .river-ghost {
		animation: river-ghost-rise 1500ms cubic-bezier(0.3, 0, 0.2, 1) both;
		animation-delay: calc(var(--i) * 78ms);
	}

	/* The sweep that resolves them into the ending. */
	.river-sweep {
		position: absolute;
		left: -10%;
		right: -10%;
		height: 34%;
		top: 70%;
		background: linear-gradient(
			180deg,
			transparent,
			color-mix(in srgb, var(--color-accent) 26%, transparent) 45%,
			color-mix(in srgb, var(--color-accent) 60%, transparent) 52%,
			color-mix(in srgb, var(--color-accent) 26%, transparent) 60%,
			transparent
		);
		filter: blur(14px);
		opacity: 0;
	}

	.river-outro-revealed .river-sweep {
		animation: river-sweep-up 1250ms cubic-bezier(0.22, 1, 0.3, 1) both;
		animation-delay: 120ms;
	}

	@keyframes river-stage {
		0%,
		100% {
			opacity: 0;
		}
		18%,
		62% {
			opacity: 1;
		}
	}

	@keyframes river-ghost-rise {
		0% {
			opacity: 0;
			transform: translateY(40px) scaleX(0.94);
		}
		30% {
			opacity: 0.85;
		}
		100% {
			opacity: 0;
			transform: translateY(-190px) scaleX(1.02);
		}
	}

	@keyframes river-sweep-up {
		0% {
			opacity: 0;
			transform: translateY(30%);
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-150%);
		}
	}

	/* Motion is the whole point here, so when it is unwelcome the ending simply
	   is there, fully legible, with nothing withheld. */
	@media (prefers-reduced-motion: reduce) {
		.river-outro {
			transform: none;
		}

		.river-outro-stage {
			display: none;
		}
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
