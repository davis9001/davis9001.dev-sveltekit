<!--
  PostOutro — what you get when you reach the end of a post.

  In the three-column reading mode this is revealed as the text drains out of
  the right-hand columns, so arriving at the end is an event rather than a
  paragraph that stops. In one-column mode it is simply the end of the article.

  Mentions come from /api/mentions, which asks Hacker News and Bluesky whether
  anyone has linked here. They are fetched only once the outro is actually
  shown, so a reader who never finishes never pays for the request.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let title = '';
	export let url = '';
	/** The river sets this when the outro is on screen; one-column mode passes true. */
	export let visible = false;

	type Mention = {
		source: string;
		title: string;
		url: string;
		author?: string;
		count?: number;
	};

	let mentions: Mention[] = [];
	let state: 'idle' | 'loading' | 'done' | 'failed' = 'idle';
	let copied = false;
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(copyTimer));

	/**
	 * Brand marks and glyphs, inline: no icon font, no CDN, nothing for a strict
	 * CSP to block, and they take the button's colour on hover for free. Drawn
	 * on a 24x24 grid and filled, so they sit on the same optical weight as the
	 * label beside them.
	 */
	const ICONS: Record<string, string> = {
		Bluesky:
			'<path d="M12 10.8C10.91 8.69 7.95 4.75 5.2 2.8 2.57.94 1.56 1.27.9 1.57.14 1.91 0 3.08 0 3.77c0 .69.38 5.65.63 6.48.81 2.73 3.71 3.66 6.38 3.36.13-.02.27-.04.41-.06-.14.02-.28.04-.41.06-3.92.58-7.39 2-2.83 7.08 5.01 5.19 6.87-1.12 7.82-4.31.95 3.19 2.05 9.27 7.73 4.31 4.27-4.31 1.17-6.5-2.74-7.08a8.7 8.7 0 0 1-.41-.06c.14.02.28.04.41.06 2.67.3 5.57-.63 6.38-3.36.25-.83.63-5.79.63-6.48 0-.69-.14-1.86-.9-2.2-.66-.3-1.67-.63-4.3 1.23C16.05 4.75 13.09 8.69 12 10.8Z"/>',
		Mastodon:
			'<path d="M23.27 5.31C22.92 2.74 20.65.7 17.96.31 17.51.24 15.79 0 11.81 0h-.03c-3.98 0-4.83.24-5.29.31C3.88.69 1.5 2.52.92 5.13.64 6.41.61 7.84.66 9.14c.07 1.87.09 3.75.26 5.61.12 1.24.32 2.47.62 3.68.55 2.24 2.78 4.1 4.96 4.86 2.34.79 4.85.92 7.26.38.26-.6.53-.13.79-.21.58-.18 1.27-.39 1.77-.75a.06.06 0 0 0 .02-.04v-1.81a.05.05 0 0 0-.06-.05c-1.54.37-3.11.55-4.71.55-2.73 0-3.46-1.29-3.67-1.82a5.6 5.6 0 0 1-.32-1.44.05.05 0 0 1 .07-.05c1.52.36 3.07.55 4.63.55.38 0 .75 0 1.13-.01 1.57-.04 3.22-.12 4.77-.42l.11-.02c2.43-.46 4.75-1.92 4.99-5.6.01-.15.03-1.52.03-1.67 0-.51.17-3.63-.02-5.55Zm-3.75 9.2h-2.56V8.29c0-1.31-.55-1.98-1.67-1.98-1.23 0-1.85.79-1.85 2.35v3.4H10.9V8.66c0-1.56-.62-2.35-1.85-2.35-1.11 0-1.67.67-1.67 1.98v6.22H4.82V8.1c0-1.31.34-2.35 1.01-3.12.7-.77 1.61-1.16 2.74-1.16 1.31 0 2.3.5 2.96 1.5l.64 1.06.64-1.06c.66-1 1.65-1.5 2.96-1.5 1.13 0 2.04.39 2.74 1.16.68.77 1.01 1.81 1.01 3.12v6.41Z"/>',
		X: '<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.63 7.58H.47l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93Zm-1.29 19.49h2.04L6.49 3.24H4.3l13.31 17.4Z"/>',
		LinkedIn:
			'<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>',
		Email:
			'<path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.93 5.49a3 3 0 0 1-3.14 0L1.5 8.67Z"/><path d="M22.5 6.91v-.16a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.16l9.71 5.98a1.5 1.5 0 0 0 1.58 0L22.5 6.91Z"/>',
		link: '<path d="M13.06 8.11a4.5 4.5 0 0 1 0 6.36l-3.18 3.18a4.5 4.5 0 0 1-6.36-6.36l1.06-1.06a.75.75 0 1 1 1.06 1.06l-1.06 1.06a3 3 0 1 0 4.24 4.25l3.18-3.19a3 3 0 0 0 0-4.24.75.75 0 0 1 1.06-1.06Z"/><path d="M10.94 15.89a4.5 4.5 0 0 1 0-6.36l3.18-3.18a4.5 4.5 0 0 1 6.36 6.36l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a3 3 0 1 0-4.24-4.25l-3.18 3.19a3 3 0 0 0 0 4.24.75.75 0 1 1-1.06 1.06Z"/>',
		check: '<path d="M9.55 18.2 3.4 12.05l1.6-1.6 4.55 4.55L19.4 5.15 21 6.75 9.55 18.2Z"/>',
		// Solid square with the Y knocked out of it, the way the mark is drawn.
		'Hacker News':
			'<path fill-rule="evenodd" d="M3 3h18v18H3V3Zm3.95 2.9 4.11 7.7V19h1.59v-5.4l4.15-7.8h-1.75l-2.46 4.87c-.37.75-.69 1.44-.69 1.44s-.3-.71-.65-1.44L8.83 5.9H6.95Z"/>'
	};

	$: shareText = title ? `${title} — ${url}` : url;
	$: encoded = { text: encodeURIComponent(shareText), url: encodeURIComponent(url) };

	$: shareLinks = [
		{ label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${encoded.text}` },
		{ label: 'Mastodon', href: `https://tootpick.org/#text=${encoded.text}` },
		{ label: 'X', href: `https://twitter.com/intent/tweet?text=${encoded.text}` },
		{
			label: 'Hacker News',
			href: `https://news.ycombinator.com/submitlink?u=${encoded.url}&t=${encodeURIComponent(title)}`
		},
		{
			label: 'LinkedIn',
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`
		},
		{
			label: 'Email',
			href: `mailto:?subject=${encodeURIComponent(title)}&body=${encoded.url}`
		}
	];

	// Fetch once, and only after the reader has actually got here.
	$: if (browser && visible && state === 'idle' && url) {
		loadMentions();
	}

	async function loadMentions() {
		state = 'loading';
		try {
			const res = await fetch(`/api/mentions?url=${encodeURIComponent(url)}`);
			if (!res.ok) throw new Error(String(res.status));
			const data = await res.json();
			mentions = Array.isArray(data.mentions) ? data.mentions : [];
			state = 'done';
		} catch {
			// A missing answer is not worth an error message in a reader's face.
			state = 'failed';
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<section class="outro" class:outro-arrived={visible} aria-label="End of post">
	<p class="outro-mark"><span>The end</span></p>

	<div class="outro-share">
		<h2>Pass it on</h2>
		<ul>
			{#each shareLinks as link}
				<li>
					<a href={link.href} target="_blank" rel="noopener noreferrer">
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							{@html ICONS[link.label]}
						</svg>
						<span>{link.label}</span>
					</a>
				</li>
			{/each}
			<li>
				<button type="button" on:click={copyLink}>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class:tick={copied}>
						{@html copied ? ICONS.check : ICONS.link}
					</svg>
					<span>{copied ? 'Copied' : 'Copy link'}</span>
				</button>
			</li>
		</ul>
	</div>

	<div class="outro-mentions">
		<h2>Linked from elsewhere</h2>
		{#if state === 'loading'}
			<p class="outro-note">Checking Hacker News and Bluesky…</p>
		{:else if state === 'done' && mentions.length > 0}
			<ul>
				{#each mentions.slice(0, 6) as mention}
					<li>
						<a href={mention.url} target="_blank" rel="noopener noreferrer">{mention.title}</a>
						<span class="outro-meta">
							{mention.source}{#if mention.author}&nbsp;· {mention.author}{/if}{#if mention.count}&nbsp;·
								{mention.count}
								{mention.count === 1 ? 'reply' : 'replies'}{/if}
						</span>
					</li>
				{/each}
			</ul>
		{:else if state === 'done'}
			<p class="outro-note">
				Nothing yet — I check Hacker News and Bluesky, which is what can be done without asking you
				to carry a tracker.
			</p>
		{:else if state === 'failed'}
			<p class="outro-note">Couldn't reach the search APIs just now.</p>
		{/if}
	</div>
</section>

<style>
	.outro {
		text-align: center;
		color: var(--color-text);
	}

	/* The ending assembles in the wake of the sweep: each part rises out of
	   blur in turn, and the rules either side of the words draw outward from
	   nothing, so it reads as being built rather than switched on. */
	.outro-arrived > * {
		animation: outro-settle 820ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.outro-arrived .outro-mark {
		animation-delay: 120ms;
	}

	.outro-arrived .outro-share {
		animation-delay: 300ms;
	}

	.outro-arrived .outro-mentions {
		animation-delay: 460ms;
	}

	.outro-arrived .outro-mark span::before,
	.outro-arrived .outro-mark span::after {
		animation: outro-rule 900ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
	}

	.outro-arrived .outro-share li {
		animation: outro-settle 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.outro-arrived .outro-share li:nth-child(1) {
		animation-delay: 380ms;
	}
	.outro-arrived .outro-share li:nth-child(2) {
		animation-delay: 440ms;
	}
	.outro-arrived .outro-share li:nth-child(3) {
		animation-delay: 500ms;
	}
	.outro-arrived .outro-share li:nth-child(4) {
		animation-delay: 560ms;
	}
	.outro-arrived .outro-share li:nth-child(5) {
		animation-delay: 620ms;
	}
	.outro-arrived .outro-share li:nth-child(6) {
		animation-delay: 680ms;
	}
	.outro-arrived .outro-share li:nth-child(7) {
		animation-delay: 740ms;
	}

	@keyframes outro-settle {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.97);
			filter: blur(8px);
		}
		to {
			opacity: 1;
			transform: none;
			filter: blur(0);
		}
	}

	@keyframes outro-rule {
		from {
			transform: scaleX(0);
			opacity: 0;
		}
		to {
			transform: scaleX(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.outro-arrived > *,
		.outro-arrived .outro-share li,
		.outro-arrived .outro-mark span::before,
		.outro-arrived .outro-mark span::after {
			animation: none;
		}
	}

	.outro-mark {
		margin: 0 0 var(--spacing-lg);
		font-size: 0.8rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	/* A rule either side of the words, drawn rather than typed. */
	.outro-mark span {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.outro-mark span::before,
	.outro-mark span::after {
		content: '';
		width: clamp(28px, 8vw, 88px);
		height: 1px;
		transform-origin: center;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
	}

	.outro h2 {
		margin: 0 0 var(--spacing-sm);
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-secondary);
	}

	.outro ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.outro-share ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-sm);
	}

	.outro-share a,
	.outro-share button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: 0.9rem;
		text-decoration: none;
		cursor: pointer;
		transition:
			border-color 0.2s ease,
			color 0.2s ease;
	}

	.outro-share a:hover,
	.outro-share button:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	/* The mark takes the label's colour, so hover moves them together. */
	.outro-share svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		fill: currentColor;
	}

	.outro-share svg.tick {
		fill: var(--color-accent);
	}

	.outro-mentions {
		margin-top: var(--spacing-xl);
	}

	.outro-mentions li {
		margin-bottom: var(--spacing-sm);
	}

	.outro-mentions a {
		color: var(--color-primary);
	}

	.outro-meta {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.outro-note {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}
</style>
