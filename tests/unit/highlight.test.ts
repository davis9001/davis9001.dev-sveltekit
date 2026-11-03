import { describe, expect, it } from 'vitest';
import {
	highlightCode,
	highlightHtmlBlocks,
	resolveLanguage
} from '$lib/utils/highlight';

describe('resolveLanguage', () => {
	it('maps the names authors use', () => {
		expect(resolveLanguage('tsx')).toBe('typescript');
		expect(resolveLanguage('SH')).toBe('bash');
		expect(resolveLanguage('yml')).toBe('yaml');
		expect(resolveLanguage('html')).toBe('xml');
		expect(resolveLanguage('python')).toBe('python');
	});

	it('returns null for a language it does not have', () => {
		expect(resolveLanguage('cobol')).toBeNull();
		expect(resolveLanguage('')).toBeNull();
	});
});

describe('highlightCode', () => {
	it('wraps tokens in hljs spans', () => {
		const out = highlightCode('const a = "x";', 'ts');
		expect(out).toContain('hljs-keyword');
		expect(out).toContain('hljs-string');
	});

	it('escapes markup in the source', () => {
		expect(highlightCode('<script>alert(1)</script>', 'html')).not.toContain('<script>');
	});

	it('returns null for an unknown language', () => {
		expect(highlightCode('x', 'cobol')).toBeNull();
	});
});

describe('highlightHtmlBlocks', () => {
	const block = (lang: string, body: string) =>
		`<pre><code class="language-${lang}">${body}</code></pre>`;

	it('highlights a labelled block and decodes entities first', () => {
		const out = highlightHtmlBlocks(block('ts', 'const a: Array&lt;string&gt; = [];'));
		expect(out).toContain('hljs-keyword');
		expect(out).toContain('class="language-ts hljs"');
		// The `<` is escaped again by the highlighter, never doubled.
		expect(out).not.toContain('&amp;lt;');
	});

	it('leaves an unlabelled block alone', () => {
		const html = '<pre><code>plain output</code></pre>';
		expect(highlightHtmlBlocks(html)).toBe(html);
	});

	it('leaves an unknown language alone', () => {
		const html = block('cobol', 'DISPLAY "HI".');
		expect(highlightHtmlBlocks(html)).toBe(html);
	});

	it('does not highlight twice', () => {
		const html = block('ts', '<span class="hljs-keyword">const</span> a');
		expect(highlightHtmlBlocks(html)).toBe(html);
	});

	it('returns html without a pre untouched', () => {
		expect(highlightHtmlBlocks('<p>hi</p>')).toBe('<p>hi</p>');
	});

	it('handles several blocks in one body', () => {
		const out = highlightHtmlBlocks(block('json', '{"a": 1}') + '<p>x</p>' + block('sh', 'ls -la'));
		expect(out.match(/hljs"/g)).toHaveLength(2);
	});
});
