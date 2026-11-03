/**
 * Syntax highlighting for code the site shows: CMS bodies, project pages and
 * <CodeBlock>. It runs on the server and in the browser with the same output,
 * so there is no flash of plain code and no-JS readers get colour too.
 *
 * Only a block that names its language is touched. Unlabelled blocks are
 * terminal output, config pasted as-is, or prose, and guessing a language for
 * them paints random words.
 */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import lean from './highlight-lean';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('lean', lean);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

/** Names authors write in a fence, mapped to a registered grammar. */
const ALIASES: Record<string, string> = {
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	console: 'bash',
	js: 'javascript',
	jsx: 'javascript',
	mjs: 'javascript',
	ts: 'typescript',
	tsx: 'typescript',
	html: 'xml',
	svg: 'xml',
	svelte: 'xml',
	yml: 'yaml',
	md: 'markdown',
	py: 'python'
};

/** The grammar for a fence language, or null when we have none. */
export function resolveLanguage(name: string): string | null {
	const key = name.trim().toLowerCase();
	const grammar = ALIASES[key] ?? key;
	return hljs.getLanguage(grammar) ? grammar : null;
}

/** Highlighted HTML for `code`, or null for a language we do not know. */
export function highlightCode(code: string, language: string): string | null {
	const grammar = resolveLanguage(language);
	if (!grammar) return null;
	return hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value;
}

const ENTITIES: Record<string, string> = {
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&#x27;': "'",
	'&amp;': '&'
};

function decodeEntities(text: string): string {
	return text.replace(/&(?:lt|gt|quot|amp|#39|#x27);/g, (m) => ENTITIES[m]);
}

const BLOCK = /<pre([^>]*)><code class="([^"]*)">([\s\S]*?)<\/code><\/pre>/g;

/**
 * Highlight every `<pre><code class="language-x">` in stored HTML. A block
 * that already holds markup, or names a language we do not have, is left as
 * it was.
 */
export function highlightHtmlBlocks(html: string): string {
	if (!html.includes('<pre')) return html;
	return html.replace(BLOCK, (whole, preAttrs: string, classes: string, inner: string) => {
		const lang = /(?:^|\s)language-([\w+-]+)/.exec(classes)?.[1];
		if (!lang || inner.includes('<span')) return whole;
		const out = highlightCode(decodeEntities(inner), lang);
		if (out === null) return whole;
		return `<pre${preAttrs}><code class="${classes} hljs">${out}</code></pre>`;
	});
}
