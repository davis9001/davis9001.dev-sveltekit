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

	$: shareText = title ? `${title} — ${url}` : url;
	$: encoded = { text: encodeURIComponent(shareText), url: encodeURIComponent(url) };

	$: shareLinks = [
		{ label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${encoded.text}` },
		{ label: 'Mastodon', href: `https://tootpick.org/#text=${encoded.text}` },
		{ label: 'X', href: `https://twitter.com/intent/tweet?text=${encoded.text}` },
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

<section class="outro" aria-label="End of post">
	<p class="outro-mark"><span>The end</span></p>

	<div class="outro-share">
		<h2>Pass it on</h2>
		<ul>
			{#each shareLinks as link}
				<li>
					<a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
				</li>
			{/each}
			<li>
				<button type="button" on:click={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
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
								{mention.count} replies{/if}
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
		display: inline-block;
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
