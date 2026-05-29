import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte/svelte5';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Setup global test utilities
globalThis.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
	constructor() {}
	observe() {}
	unobserve() {}
	disconnect() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true
	})
});

// Mock Web Animations API used by Svelte transitions in happy-dom.
if (!Element.prototype.animate) {
	Element.prototype.animate = function () {
		return {
			cancel: () => {},
			finish: () => {},
			pause: () => {},
			play: () => {},
			reverse: () => {},
			updatePlaybackRate: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => true,
			onfinish: null,
			currentTime: 0,
			playState: 'finished'
		} as unknown as Animation;
	};
}
