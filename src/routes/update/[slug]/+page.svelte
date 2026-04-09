<!--
  Blog Post Detail Page

  Renders a single blog post with markdown content, social share buttons,
  and navigation back to the updates list. Matches live davis9001.dev styling.
-->
<script lang="ts">
	import { page } from '$app/stores';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
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
	path="/update/{post.slug}"
	type="article"
	publishedAt={post.publishedAt || ''}
/>

<div class="px-6 sm:px-8 py-2 bg-background text-foreground min-h-screen overflow-x-hidden">
	<!-- Simple Header -->
	<header class="flex justify-between items-center p-2 sm:p-4 mx-auto z-50 relative gap-2">
		<nav class="flex-shrink-0">
			<a href="/" class="internal-button text-sm px-3 py-2">« davis9001.dev</a>
		</nav>
		<div class="flex items-center gap-4">
			<ThemeSwitcher variant="inline" simpleToggle={true} />
		</div>
	</header>

	<main class="px-2 py-1 md:p-9 flex-1 relative max-w-2xl mx-auto">
		<!-- Background image (logo) -->
		<div
			class="fixed inset-0 bg-cover bg-center bg-no-repeat z-10 opacity-10 blur-xl"
			style="background-image:url('/logo-green-Icon-250.webp');background-size:contain;background-position:-9ch -9em;"
		></div>

		<div class="relative z-50">
			<div class="mb-9">
				<a href="/updates" class="internal-button">« Back to /updates</a>
			</div>

			<h1 class="text-2xl sm:text-4xl font-bold">{post.title}</h1>

			<div class="post-meta">
				{#if post.publishedAt}
					<time datetime={post.publishedAt} class="text-foreground/60">
						{formatBlogDate(post.publishedAt)}
					</time>
				{/if}
				<span class="text-foreground/60">{readingTime} min read</span>
			</div>

			{#if post.tags && post.tags.length > 0}
				<div class="post-tags">
					{#each post.tags as tag}
						<span class="post-tag">{tag}</span>
					{/each}
				</div>
			{/if}

			<ShareButtons url={$page.url.href} title={post.title} />

			{#if post.summary}
				<div class="mt-4 text-foreground">
					<p>{post.summary}</p>
				</div>
			{/if}

			<div class="markdown-body p-2 md:p-9">
				{@html post.content}
			</div>

			<ShareButtons url={$page.url.href} title={post.title} />
		</div>
	</main>

	<SocialLinks />
	<Footer />
</div>

<style>
	.post-meta {
		display: flex;
		gap: var(--spacing-md);
		font-size: 0.875rem;
		margin-top: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-md);
	}

	.post-tag {
		display: inline-block;
		padding: 0.125rem var(--spacing-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: hsla(var(--accent));
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
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
</style>