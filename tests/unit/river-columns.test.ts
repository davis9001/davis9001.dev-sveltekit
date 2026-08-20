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
		await waitFor(() => {
			expect(flows[1].innerHTML).toBe(flows[0].innerHTML);
		});
		expect(flows[2].innerHTML).toBe(flows[0].innerHTML);
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

	it('keeps the clone columns out of the accessibility tree and unfocusable', async () => {
		setViewportMatches(true);
		const { container } = render(RiverHost);

		const cols = [...container.querySelectorAll('.river-col')];
		expect(cols[0].hasAttribute('aria-hidden')).toBe(false);
		for (const clone of cols.slice(1)) {
			expect(clone.getAttribute('aria-hidden')).toBe('true');
			expect(clone.hasAttribute('inert')).toBe(true);
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
});
