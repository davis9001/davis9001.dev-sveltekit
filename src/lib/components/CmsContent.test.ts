import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import CmsContent from './CmsContent.svelte';

const CHART = '<figure><svg class="cms-chart"><rect class="cg s0"></rect></svg></figure>';

/** Captured instances of the faked IntersectionObserver, newest last. */
interface FakeObserver {
	callback: IntersectionObserverCallback;
	observed: Element[];
	unobserved: Element[];
	disconnected: boolean;
}

let observers: FakeObserver[] = [];

function installObserver(): void {
	observers = [];
	class Fake {
		observed: Element[] = [];
		unobserved: Element[] = [];
		disconnected = false;
		constructor(public callback: IntersectionObserverCallback) {
			observers.push(this as unknown as FakeObserver);
		}
		observe(el: Element) {
			this.observed.push(el);
		}
		unobserve(el: Element) {
			this.unobserved.push(el);
		}
		disconnect() {
			this.disconnected = true;
		}
		takeRecords() {
			return [];
		}
	}
	vi.stubGlobal('IntersectionObserver', Fake);
}

/** Drive the observer callback for a set of elements. */
function intersect(elements: Element[], isIntersecting = true): void {
	const observer = observers[observers.length - 1];
	observer.callback(
		elements.map((target) => ({ target, isIntersecting })) as IntersectionObserverEntry[],
		observer as unknown as IntersectionObserver
	);
}

describe('CmsContent', () => {
	beforeEach(installObserver);
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders sanitized html', () => {
		render(CmsContent, { html: '<p>hello</p>' });
		expect(document.querySelector('p')?.textContent).toBe('hello');
	});

	it('arms charts for animation once mounted', () => {
		render(CmsContent, { html: CHART });
		const chart = document.querySelector('svg.cms-chart');
		expect(chart).toHaveClass('chart-anim');
		expect(observers[0].observed).toContain(chart);
	});

	it('plays a chart only when it scrolls into view', () => {
		render(CmsContent, { html: CHART });
		const chart = document.querySelector('svg.cms-chart') as Element;

		intersect([chart], false);
		expect(chart).not.toHaveClass('in-view');

		intersect([chart]);
		expect(chart).toHaveClass('in-view');
		// Played once: it must not be re-triggered on the way back up.
		expect(observers[0].unobserved).toContain(chart);
	});

	it('arms each chart exactly once, and arms charts that arrive later', async () => {
		const { rerender } = render(CmsContent, { html: CHART });

		// {@html} swaps in fresh nodes, so navigating to another post brings a new
		// chart element — it must be armed too, and only once.
		await rerender({ html: CHART + '<p>more</p>' });
		await tick();

		const chart = document.querySelector('svg.cms-chart') as Element;
		expect(chart).toHaveClass('chart-anim');
		expect(observers[0].observed.filter((el) => el === chart)).toHaveLength(1);
	});

	it('leaves content alone when IntersectionObserver is unavailable', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		render(CmsContent, { html: CHART });
		expect(document.querySelector('svg.cms-chart')).not.toHaveClass('chart-anim');
	});

	it('renders nothing for empty html', () => {
		const { container } = render(CmsContent, { html: '' });
		expect(container.textContent).toBe('');
	});
});
