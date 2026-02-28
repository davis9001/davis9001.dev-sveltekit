<!--
  Blog Post Detail Page

  Renders a single blog post with markdown content, social share buttons,
  and navigation back to the updates list.
-->
<script lang="ts">
	import { page } from '$app/stores';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { formatBlogDate, getReadingTime } from '$lib/utils/blog';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: post = data.post;
	$: readingTime = getReadingTime(post.content);
</script>

<SEO
	title={post.title}
	description={post.summary || 'A blog post by David Monaghan.'}
	path="/updates/{post.slug}"
	type="article"
	publishedAt={post.publishedAt || ''}
/>

<div class="post-page">
	<div class="post-nav">
		<a href="/updates" class="back-link">&laquo; Back to /updates</a>
	</div>

	<article class="post-article">
		<header class="post-header">
			<h1>{post.title}</h1>
			<div class="post-meta">
				{#if post.publishedAt}
					<time datetime={post.publishedAt}>
						{formatBlogDate(post.publishedAt)}
					</time>
				{/if}
				<span class="post-read-time">{readingTime} min read</span>
			</div>
			{#if post.tags && post.tags.length > 0}
				<div class="post-tags">
					{#each post.tags as tag}
						<span class="post-tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</header>

		<ShareButtons url={$page.url.href} title={post.title} />

		{#if post.summary}
			<div class="post-summary">
				<p>{post.summary}</p>
			</div>
		{/if}

		<div class="post-body markdown-body">
			{@html post.content}
		</div>

		<ShareButtons url={$page.url.href} title={post.title} />
	</article>
</div>

<style>
	.post-page {
		max-width: 780px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	.post-nav {
		margin-bottom: var(--spacing-xl);
	}

	.back-link {
		display: inline-block;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		transition: color 0.2s ease, background-color 0.2s ease;
	}

	.back-link:hover {
		color: var(--color-primary);
		background-color: var(--color-surface);
	}

	.post-header {
		margin-bottom: var(--spacing-xl);
	}

	.post-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.2;
		margin-bottom: var(--spacing-md);
	}

	@media (min-width: 768px) {
		.post-header h1 {
			font-size: 2.5rem;
		}
	}

	.post-meta {
		display: flex;
		gap: var(--spacing-md);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-md);
	}

	.post-read-time::before {
		content: '·';
		margin-right: var(--spacing-sm);
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.post-tag {
		display: inline-block;
		padding: 0.125rem var(--spacing-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.post-summary {
		font-size: 1.125rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xl);
		padding-bottom: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	/* Markdown content styles */
	.markdown-body {
		font-size: 1.0625rem;
		line-height: 1.8;
		color: var(--color-text);
	}

	.markdown-body :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: var(--spacing-2xl);
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	.markdown-body :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: var(--spacing-xl);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.markdown-body :global(h4) {
		font-size: 1.125rem;
		font-weight: 600;
		margin-top: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.markdown-body :global(p) {
		margin-bottom: var(--spacing-md);
	}

	.markdown-body :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.markdown-body :global(a:hover) {
		opacity: 0.8;
	}

	.markdown-body :global(strong) {
		font-weight: 600;
		color: var(--color-text);
	}

	.markdown-body :global(em) {
		font-style: italic;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		margin-bottom: var(--spacing-md);
		padding-left: var(--spacing-xl);
	}

	.markdown-body :global(li) {
		margin-bottom: var(--spacing-xs);
	}

	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--color-primary);
		padding-left: var(--spacing-lg);
		margin: var(--spacing-lg) 0;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.markdown-body :global(code) {
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.875em;
		background-color: var(--color-surface);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
	}

	.markdown-body :global(pre) {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		overflow-x: auto;
		margin-bottom: var(--spacing-md);
	}

	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
		font-size: 0.875rem;
	}

	.markdown-body :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		margin: var(--spacing-md) 0;
	}

	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--spacing-xl) 0;
	}

	.markdown-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: var(--spacing-md);
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--color-border);
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
	}

	.markdown-body :global(th) {
		background-color: var(--color-surface);
		font-weight: 600;
	}
</style>
