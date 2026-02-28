<!--
  Social Share Buttons

  Generates share links for Bluesky, Facebook, LinkedIn, Reddit, and X.
  Ported from the Fresh site's Share component.
-->
<script lang="ts">
	export let url: string;
	export let title: string;
</script>

<div class="share-buttons" aria-label="Share this post">
	<span class="share-label">Share</span>
	<a
		href="https://bsky.app/intent/compose?&text={encodeURIComponent(title + ': ' + url)}"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Share {title} on Bluesky"
		class="share-link"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .331 4.97 .525 5.681c.675 2.467 3.135 3.095 5.349 2.716c-3.745 .642 -4.694 2.768 -2.639 4.893c3.906 4.036 5.927 .258 6.765 -1.26c.837 1.518 2.858 5.296 6.765 1.26c2.055 -2.125 1.106 -4.25 -2.639 -4.893c2.215 .379 4.674 -.249 5.349 -2.716c.194 -.711 .525 -5.09 .525 -5.681c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.476 5.048 -4.665 5.856c-.189 -.808 -2.372 -4.194 -4.665 -5.856" />
		</svg>
	</a>
	<a
		href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(url)}"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Share {title} on Facebook"
		class="share-link"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
		</svg>
	</a>
	<a
		href="https://www.linkedin.com/shareArticle?url={encodeURIComponent(url)}&title={encodeURIComponent(title)}"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Share {title} on LinkedIn"
		class="share-link"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
			<rect x="2" y="9" width="4" height="12" />
			<circle cx="4" cy="4" r="2" />
		</svg>
	</a>
	<a
		href="https://reddit.com/submit?url={encodeURIComponent(url)}&title={encodeURIComponent(title)}"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Share {title} on Reddit"
		class="share-link"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="14" r="8" />
			<circle cx="9" cy="13" r="1" fill="currentColor" />
			<circle cx="15" cy="13" r="1" fill="currentColor" />
			<path d="M10 17c.667.333 1.333.5 2 .5s1.333-.167 2-.5" />
			<path d="M20 6c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
			<path d="M17.5 7.5L14 10" />
			<path d="M12 2v6" />
		</svg>
	</a>
	<a
		href="https://x.com/share?url={encodeURIComponent(url)}&text={encodeURIComponent(title)}"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Share {title} on X"
		class="share-link"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 4l11.733 16h4.267l-11.733 -16z" />
			<path d="M4 20l6.768 -6.768m2.46 -2.46L20 4" />
		</svg>
	</a>
</div>

<style>
	.share-buttons {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) 0;
		margin: var(--spacing-md) 0;
	}

	.share-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.share-link {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
		transition: color 0.2s ease;
		padding: var(--spacing-xs);
		border-radius: var(--radius-sm);
	}

	.share-link:hover {
		color: var(--color-primary);
	}
</style>
