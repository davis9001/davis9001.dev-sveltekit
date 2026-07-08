/**
 * Smoke tests for RichTextEditor.svelte with TipTap fully mocked
 * (ProseMirror cannot run under happy-dom).
 */
import { fireEvent, render, screen } from '@testing-library/svelte/svelte5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const editorState = vi.hoisted(() => {
	const state: {
		instances: any[];
		lastOptions: any;
	} = { instances: [], lastOptions: null };
	return state;
});

vi.mock('@tiptap/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tiptap/core')>();
	class MockEditor {
		options: any;
		destroyed = false;
		html: string;
		commands = {
			setContent: vi.fn((content: string) => {
				this.html = content;
			})
		};
		constructor(options: any) {
			this.options = options;
			this.html = options.content ?? '';
			editorState.lastOptions = options;
			editorState.instances.push(this);
		}
		getHTML() {
			return this.html;
		}
		isActive() {
			return false;
		}
		getAttributes() {
			return {};
		}
		chain() {
			const chain: any = new Proxy(
				{},
				{
					get: (_t, prop) => {
						if (prop === 'run') return () => true;
						return () => chain;
					}
				}
			);
			return chain;
		}
		destroy() {
			this.destroyed = true;
		}
		setEditable(editable: boolean) {
			this.options.editable = editable;
		}
	}
	return { ...actual, Editor: MockEditor };
});

vi.mock('@tiptap/starter-kit', () => ({
	default: { configure: vi.fn(() => ({ name: 'starter-kit' })) }
}));
vi.mock('@tiptap/extension-link', () => ({
	default: { configure: vi.fn(() => ({ name: 'link' })) }
}));
vi.mock('@tiptap/extension-image', () => ({ default: { name: 'image' } }));
vi.mock('@tiptap/extension-placeholder', () => ({
	default: { configure: vi.fn(() => ({ name: 'placeholder' })) }
}));

import RichTextEditor from '../../src/lib/components/RichTextEditor.svelte';

describe('RichTextEditor', () => {
	beforeEach(() => {
		editorState.instances = [];
		editorState.lastOptions = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('constructs a TipTap editor on mount with the bound value', () => {
		render(RichTextEditor, { props: { value: '<p>hello</p>' } });

		expect(editorState.instances).toHaveLength(1);
		expect(editorState.lastOptions.content).toBe('<p>hello</p>');
		expect(editorState.lastOptions.element).toBeTruthy();
	});

	it('destroys the editor on unmount', () => {
		const { unmount } = render(RichTextEditor, { props: { value: '' } });
		unmount();

		expect(editorState.instances[0].destroyed).toBe(true);
	});

	it('renders the full formatting toolbar', () => {
		render(RichTextEditor, { props: { value: '' } });

		for (const label of [
			'Paragraph',
			'Heading 2',
			'Heading 3',
			'Bold',
			'Italic',
			'Strikethrough',
			'Inline code',
			'Link',
			'Bullet list',
			'Numbered list',
			'Blockquote',
			'Code block',
			'Horizontal rule',
			'Undo',
			'Redo',
			'Edit HTML source'
		]) {
			expect(screen.getByLabelText(label)).toBeTruthy();
		}
	});

	it('propagates editor updates to the bound value', async () => {
		render(RichTextEditor, { props: { value: '<p>a</p>' } });

		const editor = editorState.instances[0];
		editor.html = '<p>edited</p>';
		editor.options.onUpdate({ editor });
		await Promise.resolve();

		// The updated value is observable through the HTML source view
		await fireEvent.click(screen.getByLabelText('Edit HTML source'));
		expect((screen.getByLabelText('HTML source') as HTMLTextAreaElement).value).toBe(
			'<p>edited</p>'
		);
	});

	it('toggles HTML source view and pushes edits back into the editor', async () => {
		render(RichTextEditor, { props: { value: '<p>start</p>' } });
		const editor = editorState.instances[0];

		await fireEvent.click(screen.getByLabelText('Edit HTML source'));
		const textarea = screen.getByLabelText('HTML source') as HTMLTextAreaElement;
		expect(textarea.value).toBe('<p>start</p>');

		await fireEvent.input(textarea, { target: { value: '<p>rewritten</p>' } });
		await fireEvent.click(screen.getByLabelText('Edit HTML source'));

		expect(screen.queryByLabelText('HTML source')).toBeNull();
		expect(editor.commands.setContent).toHaveBeenCalledWith('<p>rewritten</p>', false);
	});

	it('disables formatting buttons in source mode', async () => {
		render(RichTextEditor, { props: { value: '' } });

		await fireEvent.click(screen.getByLabelText('Edit HTML source'));

		expect((screen.getByLabelText('Bold') as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByLabelText('Edit HTML source') as HTMLButtonElement).disabled).toBe(false);
	});

	it('opens the link bar and applies a link', async () => {
		render(RichTextEditor, { props: { value: '' } });

		await fireEvent.click(screen.getByLabelText('Link'));
		const input = screen.getByLabelText('Link URL') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'https://example.com' } });
		await fireEvent.click(screen.getByText('Apply'));

		expect(screen.queryByLabelText('Link URL')).toBeNull();
	});

	it('constructs the editor as non-editable and disables all controls when disabled', () => {
		render(RichTextEditor, { props: { value: '<p>locked</p>', disabled: true } });

		expect(editorState.lastOptions.editable).toBe(false);
		expect((screen.getByLabelText('Bold') as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByLabelText('Edit HTML source') as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByLabelText('Upload image file') as HTMLInputElement).disabled).toBe(true);
	});

	it('calls setEditable when disabled changes reactively', async () => {
		const { rerender } = render(RichTextEditor, { props: { value: '', disabled: false } });
		const editor = editorState.instances[0];

		await rerender({ value: '', disabled: true });

		expect(editor.options.editable).toBe(false);
	});
});
