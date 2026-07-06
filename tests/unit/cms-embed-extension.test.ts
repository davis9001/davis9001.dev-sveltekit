/**
 * Tests for the TipTap SvelteEmbed extension spec and the Dirac canvas utils.
 * The extension's config functions are invoked directly — no Editor instance
 * (ProseMirror cannot run under happy-dom).
 */
import { describe, expect, it, vi } from 'vitest';

import { embedNodeToHtml, SvelteEmbed } from '../../src/lib/cms/richtext-embed-extension';
import { embedManifest, getEmbedDefinition } from '../../src/lib/cms/embeds/manifest';
import {
	getVar,
	observeCanvasResize,
	setupCanvas,
	startLoop
} from '../../src/lib/cms/embeds/dirac/canvas-utils';

describe('SvelteEmbed extension spec', () => {
	it('is a block atom named svelteEmbed', () => {
		expect(SvelteEmbed.name).toBe('svelteEmbed');
		expect(SvelteEmbed.config.group).toBe('block');
		expect(SvelteEmbed.config.atom).toBe(true);
	});

	it('parses placeholder divs', () => {
		const rules = (SvelteEmbed.config.parseHTML as () => { tag: string }[]).call({});
		expect(rules[0].tag).toBe('div[data-svelte-embed]');
	});

	it('reads attributes from a placeholder element', () => {
		const attrs = (SvelteEmbed.config.addAttributes as () => any).call({ options: {} });

		const el = document.createElement('div');
		el.setAttribute('data-svelte-embed', 'dirac-sea');
		el.setAttribute('data-props', '{"height":300}');

		expect(attrs.embedName.parseHTML(el)).toBe('dirac-sea');
		expect(attrs.props.parseHTML(el)).toEqual({ height: 300 });
	});

	it('renders attributes back to placeholder form', () => {
		const attrs = (SvelteEmbed.config.addAttributes as () => any).call({ options: {} });

		expect(attrs.embedName.renderHTML({ embedName: 'dirac-sea' })).toEqual({
			'data-svelte-embed': 'dirac-sea'
		});
		expect(attrs.props.renderHTML({ props: { a: 1 } })).toEqual({
			'data-props': '{"a":1}'
		});
		expect(attrs.props.renderHTML({ props: {} })).toEqual({});
	});

	it('embedNodeToHtml round-trips with the codec form', () => {
		expect(embedNodeToHtml('dirac-sea', {})).toBe('<div data-svelte-embed="dirac-sea"></div>');
		expect(embedNodeToHtml('dirac-sea', { h: 1 })).toBe(
			'<div data-svelte-embed="dirac-sea" data-props="{&quot;h&quot;:1}"></div>'
		);
	});
});

describe('embed manifest', () => {
	it('lists the six Dirac embeds with valid names', () => {
		expect(embedManifest).toHaveLength(6);
		for (const embed of embedManifest) {
			expect(embed.name).toMatch(/^[a-z0-9-]+$/);
			expect(embed.label.length).toBeGreaterThan(0);
		}
	});

	it('looks up definitions by name', () => {
		expect(getEmbedDefinition('dirac-sea')?.label).toContain('Sea');
		expect(getEmbedDefinition('nope')).toBeUndefined();
	});
});

describe('canvas-utils', () => {
	it('getVar reads a CSS custom property from the root', () => {
		const fakeDoc = { documentElement: {} } as unknown as Document;
		vi.stubGlobal(
			'getComputedStyle',
			vi.fn(() => ({ getPropertyValue: () => '  #fff  ' }))
		);
		expect(getVar('--color-text', fakeDoc)).toBe('#fff');
		vi.unstubAllGlobals();
	});

	it('setupCanvas sizes for the device pixel ratio', () => {
		const ctx = { scale: vi.fn() };
		const canvas = {
			getAttribute: () => '200',
			getBoundingClientRect: () => ({ width: 400 }),
			getContext: () => ctx,
			style: {} as Record<string, string>,
			parentElement: null
		} as unknown as HTMLCanvasElement;

		const result = setupCanvas(canvas, { devicePixelRatio: 2 });

		expect(result).toEqual({ ctx, w: 400, h: 200 });
		expect((canvas as any).width).toBe(800);
		expect((canvas as any).height).toBe(400);
		expect(ctx.scale).toHaveBeenCalledWith(2, 2);
	});

	it('setupCanvas falls back to parent width and returns null without a context', () => {
		const canvas = {
			getAttribute: () => null,
			getBoundingClientRect: () => ({ width: 0 }),
			getContext: () => null,
			style: {} as Record<string, string>,
			parentElement: { clientWidth: 250 }
		} as unknown as HTMLCanvasElement;

		expect(setupCanvas(canvas, { devicePixelRatio: 1 })).toBeNull();
		expect((canvas as any).width).toBe(250);
	});

	it('startLoop draws each frame and stops cleanly', () => {
		const callbacks: FrameRequestCallback[] = [];
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn((cb: FrameRequestCallback) => {
				callbacks.push(cb);
				return callbacks.length;
			})
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());

		const draw = vi.fn();
		const stop = startLoop(draw);

		// run two frames
		callbacks[0](0);
		callbacks[1](0);
		expect(draw).toHaveBeenCalledTimes(2);

		stop();
		expect(cancelAnimationFrame).toHaveBeenCalled();
		// a queued frame after stop must not draw
		callbacks[callbacks.length - 1](0);
		expect(draw).toHaveBeenCalledTimes(2);

		vi.unstubAllGlobals();
	});

	it('observeCanvasResize rescales on width changes and disconnects', () => {
		let observerCallback: (entries: unknown[]) => void = () => {};
		const disconnect = vi.fn();
		vi.stubGlobal(
			'ResizeObserver',
			vi.fn(function (cb: (entries: unknown[]) => void) {
				observerCallback = cb;
				return { observe: vi.fn(), disconnect };
			})
		);

		const ctx = { scale: vi.fn() };
		const canvas = {
			getAttribute: () => '300',
			getContext: () => ctx,
			style: {} as Record<string, string>
		} as unknown as HTMLCanvasElement;

		const onResize = vi.fn();
		const handle = observeCanvasResize(
			canvas,
			onResize,
			{ mobileHeight: 540 },
			{
				devicePixelRatio: 1
			}
		);

		// desktop width
		observerCallback([{ contentRect: { width: 800 } }]);
		expect(onResize).toHaveBeenLastCalledWith(expect.objectContaining({ w: 800, h: 300 }));

		// mobile width uses mobileHeight
		observerCallback([{ contentRect: { width: 320 } }]);
		expect(onResize).toHaveBeenLastCalledWith(expect.objectContaining({ w: 320, h: 540 }));

		// zero-width entries ignored
		onResize.mockClear();
		observerCallback([{ contentRect: { width: 0 } }]);
		expect(onResize).not.toHaveBeenCalled();

		handle.disconnect();
		expect(disconnect).toHaveBeenCalled();

		vi.unstubAllGlobals();
	});
});
