/**
 * Tests for RiverColumns — the three-column reading mode.
 *
 * The invariant that matters: columns 2..n are windows onto the same flow as
 * column 1, offset by exactly one column height each. If the clones drift, or
 * a column stops being an inert copy, the reading order silently breaks.
 */
import { render, waitFor } from '@testing-library/svelte/svelte5';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RiverHost from '../fixtures/RiverHost.svelte';

const originalMatchMedia = window.matchMedia;

/** Replace the setup.ts stub with one whose `matches` we control. */
function setViewportMatches(matches: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => true
		})
	});
}

afterEach(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: originalMatchMedia
	});
	vi.restoreAllMocks();
});

describe('RiverColumns', () => {
	it('renders the slot as an ordinary block below the width threshold', async () => {
		setViewportMatches(false);
		const { container } = render(RiverHost);

		const host = container.querySelector('.river') as HTMLElement;
		expect(host).toBeTruthy();
		expect(host.classList.contains('river-active')).toBe(false);
		// The real content is still there — only the columns are dormant.
		expect(container.querySelector('.probe-a')?.textContent).toBe('Alpha paragraph');
		expect(host.style.height).toBe('');

		const flows = container.querySelectorAll('.river-flow');
		expect(flows.length).toBe(3);
		expect((flows[1] as HTMLElement).innerHTML).toBe('');
	});

	it('mirrors column 1 into the other columns once active', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const flows = [...container.querySelectorAll('.river-flow')] as HTMLElement[];
		expect(flows).toHaveLength(3);
		// The clones carry the same reading matter, not the same markup: links
		// are taken out of the tab order and charts are un-armed on the way in.
		await waitFor(() => {
			expect(flows[1].textContent).toBe(flows[0].textContent);
		});
		expect(flows[2].textContent).toBe(flows[0].textContent);
		expect(flows[1].innerHTML).toContain('Alpha paragraph');
	});

	it('offsets each column by exactly one column height', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		await waitFor(() => {
			expect(cols[2].scrollTop).toBeGreaterThan(0);
		});

		// Column 1 sits at the current scroll offset; each subsequent column is
		// one further column-height down the same flow.
		const stride = cols[1].scrollTop - cols[0].scrollTop;
		expect(stride).toBeGreaterThan(0);
		expect(cols[2].scrollTop - cols[1].scrollTop).toBeCloseTo(stride, 5);
	});

	it('keeps the clone columns out of the accessibility tree', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		const cols = [...container.querySelectorAll('.river-col')];
		expect(cols[0].hasAttribute('aria-hidden')).toBe(false);
		for (const clone of cols.slice(1)) {
			expect(clone.getAttribute('aria-hidden')).toBe('true');
			// Not inert: that would take the mouse with it. See the clickable
			// -clones test below for the half that has to keep working.
			expect(clone.hasAttribute('inert')).toBe(false);
		}
	});

	it('tears back down to one column when the reader opts out', async () => {
		setViewportMatches(true);
		const { container, rerender } = render(RiverHost, { props: { enabled: true } });

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		await rerender({ enabled: false });

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(false);
		});

		const host = container.querySelector('.river') as HTMLElement;
		const flows = [...container.querySelectorAll('.river-flow')] as HTMLElement[];
		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		expect(host.style.height).toBe('');
		expect(cols.every((c) => c.scrollTop === 0)).toBe(true);
		// Clones are emptied so the article exists exactly once in the DOM.
		expect(flows[1].innerHTML).toBe('');
		expect(flows[2].innerHTML).toBe('');
		// The real content survives the round trip.
		expect(container.querySelector('.probe-b')?.textContent).toBe('Beta paragraph');
	});

	it('never activates while the caller has it switched off', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost, { props: { enabled: false } });

		await waitFor(() => {
			expect(container.querySelector('.river')).toBeTruthy();
		});
		expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(false);
		expect((container.querySelectorAll('.river-flow')[1] as HTMLElement).innerHTML).toBe('');
	});

	it('steers every column together on a wheel, and locks the document', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});
		expect(document.documentElement.classList.contains('river-scroll-lock')).toBe(true);

		// happy-dom reports scrollHeight as 0, so the flow would have nowhere to
		// travel and every steer would clamp to the start.
		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		const before = cols.map((c) => c.scrollTop);

		const host = container.querySelector('.river') as HTMLElement;
		host.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true }));

		await waitFor(() => {
			expect(cols[0].scrollTop).toBeGreaterThan(before[0]);
		});

		// All three move by the same amount — they are one flow, not three.
		const moved = cols.map((c, i) => c.scrollTop - before[i]);
		expect(moved[1]).toBeCloseTo(moved[0], 5);
		expect(moved[2]).toBeCloseTo(moved[0], 5);
	});

	it('releases the document scroll lock when it deactivates', async () => {
		setViewportMatches(true);
		const { container, rerender } = render(RiverHost, { props: { enabled: true } });

		await waitFor(() => {
			expect(document.documentElement.classList.contains('river-scroll-lock')).toBe(true);
		});

		await rerender({ enabled: false });

		await waitFor(() => {
			expect(document.documentElement.classList.contains('river-scroll-lock')).toBe(false);
		});
		expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(false);
	});

	it('renders the outro inline, with no river chrome, when inactive', async () => {
		setViewportMatches(false);
		const { container } = render(RiverHost);

		expect(container.querySelector('.river-outro')).toBeNull();
		const outro = container.querySelector('.probe-outro') as HTMLElement;
		expect(outro).toBeTruthy();
		// Nothing to arrive at in one column, so the ending is simply there.
		expect(outro.dataset.atEnd).toBe('true');
	});

	it('travels far enough for the post to drain up through column 1', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		const columnHeight = cols[1].scrollTop - cols[0].scrollTop;
		expect(columnHeight).toBeGreaterThan(0);

		const host = container.querySelector('.river') as HTMLElement;
		host.dispatchEvent(
			new WheelEvent('wheel', { deltaY: 999999, bubbles: true, cancelable: true })
		);

		// The old ceiling stopped once column 3 ran out of text. The last
		// screenful now belongs to column 1.
		await waitFor(
			() => {
				expect(cols[0].scrollTop).toBeGreaterThan(20000 - 3 * columnHeight);
			},
			{ timeout: 4000 }
		);
		await waitFor(
			() => {
				expect(Math.round(cols[0].scrollTop)).toBe(Math.round(20000 - columnHeight));
			},
			{ timeout: 4000 }
		);
	});

	it('drives the flow with a touch drag, so a wide touchscreen is not locked out', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		const before = cols.map((c) => c.scrollTop);

		const host = container.querySelector('.river') as HTMLElement;
		const touch = (type: string, clientY: number) => {
			const event = new Event(type, { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'touches', {
				value: type === 'touchend' ? [] : [{ clientY }]
			});
			host.dispatchEvent(event);
		};

		// A finger lands and drags 300px upward: the text advances 300px.
		touch('touchstart', 500);
		touch('touchmove', 350);
		touch('touchmove', 200);
		touch('touchend', 200);

		await waitFor(() => {
			expect(cols[0].scrollTop).toBe(before[0] + 300);
		});
		// All three columns still move as one flow.
		expect(cols[1].scrollTop - cols[0].scrollTop).toBe(cols[2].scrollTop - cols[1].scrollTop);

		// A stray move with no finger down does nothing.
		touch('touchmove', 100);
		expect(cols[0].scrollTop).toBe(before[0] + 300);
	});

	it('brings the flow to a focused link that is outside the visible window', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		const columnHeight = cols[1].scrollTop - cols[0].scrollTop;
		expect(columnHeight).toBeGreaterThan(0);

		// The link sits 5000px down the article; the column window starts at 0.
		const link = container.querySelector('.probe-link') as HTMLElement;
		const rect = (top: number) => () => ({ top }) as DOMRect;
		cols[0].getBoundingClientRect = rect(0);
		flow.getBoundingClientRect = rect(-cols[0].scrollTop);
		link.getBoundingClientRect = rect(5000 - cols[0].scrollTop);

		link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

		// The flow comes to the link and settles it a third of the way down.
		await waitFor(() => {
			expect(cols[0].scrollTop).toBeCloseTo(5000 - columnHeight / 3, 3);
		});
	});

	it('leaves the flow alone when the focused link is already in view', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		const host = container.querySelector('.river') as HTMLElement;
		host.dispatchEvent(new WheelEvent('wheel', { deltaY: 3000, bubbles: true, cancelable: true }));
		await waitFor(() => {
			expect(cols[0].scrollTop).toBeGreaterThan(0);
		});
		const offset = cols[0].scrollTop;

		// Mid-article, with the link 100px below the top of column 1's window.
		// The flow's own rect moves with scrollTop; measured against it the link
		// would look 100 + offset px away, which is the bug this guards against.
		const link = container.querySelector('.probe-link') as HTMLElement;
		const rect = (top: number) => () => ({ top }) as DOMRect;
		cols[0].getBoundingClientRect = rect(0);
		flow.getBoundingClientRect = rect(-offset);
		link.getBoundingClientRect = rect(100);

		link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(cols[0].scrollTop).toBe(offset);
	});

	it('reveals the outro as the columns drain, and tells the slot it arrived', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river-outro')).toBeTruthy();
		});

		const outroWrap = container.querySelector('.river-outro') as HTMLElement;
		const probe = container.querySelector('.probe-outro') as HTMLElement;
		// At the start it is out of the way, out of the a11y tree, and inert —
		// its share links must not be tabbable while it is still transparent.
		// (Svelte sets inert as the DOM property; happy-dom does not reflect it
		// back to the attribute the way a browser does, so read the property.)
		expect(outroWrap.style.getPropertyValue('--drain').trim()).toBe('0');
		expect(outroWrap.getAttribute('aria-hidden')).toBe('true');
		expect((outroWrap as unknown as { inert: boolean }).inert).toBe(true);
		expect(probe.dataset.atEnd).toBe('false');

		const flow = container.querySelector('.river-flow') as HTMLElement;
		Object.defineProperty(flow, 'scrollHeight', { value: 20000, configurable: true });
		window.dispatchEvent(new Event('resize'));

		const host = container.querySelector('.river') as HTMLElement;
		host.dispatchEvent(
			new WheelEvent('wheel', { deltaY: 999999, bubbles: true, cancelable: true })
		);

		await waitFor(
			() => {
				expect(outroWrap.classList.contains('river-outro-revealed')).toBe(true);
			},
			{ timeout: 4000 }
		);
		expect(probe.dataset.atEnd).toBe('true');
		expect(outroWrap.getAttribute('aria-hidden')).toBe('false');
		expect((outroWrap as unknown as { inert: boolean }).inert).toBe(false);
		expect(Number(outroWrap.style.getPropertyValue('--drain'))).toBeGreaterThan(0.5);
	});

	it('leaves links in the clone columns clickable, but out of the tab order', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river')?.classList.contains('river-active')).toBe(true);
		});

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];

		// Reading runs left to right, so most links a reader can see are in the
		// clones. `inert` would make every one of them dead to the mouse.
		for (const clone of cols.slice(1)) {
			expect(clone.hasAttribute('inert')).toBe(false);
			expect(clone.getAttribute('aria-hidden')).toBe('true');
		}

		await waitFor(() => {
			expect(cols[1].querySelector('.probe-link')).toBeTruthy();
		});

		// The real one stays tabbable; the copies do not, so the article is
		// tabbed through exactly once.
		expect(cols[0].querySelector('.probe-link')?.getAttribute('tabindex')).toBeNull();
		for (const clone of cols.slice(1)) {
			expect(clone.querySelector('.probe-link')?.getAttribute('tabindex')).toBe('-1');
		}
	});

	it('renders cloned charts complete, since nothing will ever arm them', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		const cols = [...container.querySelectorAll('.river-col')] as HTMLElement[];
		await waitFor(() => {
			expect(cols[1].querySelector('svg.cms-chart')).toBeTruthy();
		});

		// chart-anim hides the marks and waits for an observer that only ever
		// watches column 1 — a clone keeping it is a chart that never appears.
		for (const clone of cols.slice(1)) {
			const chart = clone.querySelector('svg.cms-chart') as HTMLElement;
			expect(chart.classList.contains('chart-anim')).toBe(false);
			expect(chart.classList.contains('in-view')).toBe(false);
		}
		expect(cols[0].querySelector('svg.cms-chart')?.classList.contains('chart-anim')).toBe(true);
	});

	it('lets the arrived ending take clicks without swallowing column 1', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		await waitFor(() => {
			expect(container.querySelector('.river-outro')).toBeTruthy();
		});

		// The wrapper spans every column, so it must never be the thing that
		// receives clicks — only the panel inside it may.
		const wrap = container.querySelector('.river-outro') as HTMLElement;
		expect(wrap.className).not.toContain('pointer');
		expect(container.querySelector('.river-outro-inner')).toBeTruthy();
	});
});
