<!--
  Blog List Page (Updates)

  Displays all blog posts sorted by date, matching the Fresh site's /updates page.
-->
<script lang="ts">
	import { formatBlogDate } from '$lib/utils/blog';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: posts = data.posts || [];
</script>

<SEO
	title="Updates"
	description="Blog posts, updates, and articles by David Monaghan."
	path="/updates"
/>

<div class="updates-page">
	<header class="updates-header">
		<div class="updates-title-row">
			<h1>
				<img
					src="/logo-green-Icon-250.webp"
					alt="davis9001 logo"
					class="updates-logo"
				/>
				Updates (the davis9001 blog)
			</h1>
		</div>
	</header>

	<div class="updates-list">
		{#each posts as post}
			<article class="update-card">
				<a href="/updates/{post.slug}" class="update-card-link">
					<h2>{post.title}</h2>
					{#if post.publishedAt}
						<time datetime={post.publishedAt}>
							{formatBlogDate(post.publishedAt)}
						</time>
					{/if}
					<p class="update-summary">{post.summary}</p>
				</a>
				{#if post.tags && post.tags.length > 0}
					<div class="update-tags">
						{#each post.tags as tag}
							<span class="update-tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</article>
		{/each}
	</div>
</div>

<style>
	.updates-page {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	.updates-header {
		margin-bottom: var(--spacing-2xl);
	}

	.updates-title-row {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.updates-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.updates-logo {
		width: 2rem;
		height: 2rem;
	}

	@media (min-width: 768px) {
		.updates-logo {
			width: 3rem;
			height: 3rem;
		}

		.updates-header h1 {
			font-size: 2.5rem;
		}
	}

	.updates-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.update-card {
		padding: var(--spacing-lg);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		transition: box-shadow 0.2s ease;
	}

	.update-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.update-card-link {
		text-decoration: none;
		display: block;
	}

	.update-card-link h2 {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: var(--spacing-xs);
		line-height: 1.3;
	}

	.update-card-link:hover h2 {
		text-decoration: underline;
	}

	.update-card-link time {
		display: block;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.update-summary {
		color: var(--color-text);
		font-size: 0.9375rem;
		line-height: 1.6;
	}

	.update-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
	}

	.update-tag {
		display: inline-block;
		padding: 0.125rem var(--spacing-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		background-color: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}
</style>
