<!--
  Dynamic CMS Content Item Page

  Renders a single published content item.
  Uses the content type's itemTemplate setting for layout selection.
-->
<script lang="ts">
	import CmsContent from '$lib/components/CmsContent.svelte';
	import PredictionProof from '$lib/components/PredictionProof.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { formatDateWindow } from '$lib/predictions/format';
	import { DEFAULT_OG_IMAGE } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	$: contentType = data.contentType;
	$: item = data.item;
	$: tags = data.tags || [];

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getRoutePrefix(): string {
		return contentType.settings.routePrefix || `/${contentType.slug}`;
	}
</script>

<SEO
	title={item.seoTitle || item.title}
	description={item.seoDescription || `${item.title} on davis9001.dev.`}
	path="{getRoutePrefix()}/{item.slug}"
	type="article"
	imageUrl={item.seoImage || DEFAULT_OG_IMAGE}
	publishedAt={item.publishedAt || ''}
/>

<div class="cms-item-page">
	<!-- Back link -->
	<a href={getRoutePrefix()} class="cms-back-link">
		&larr; Back to {contentType.name}
	</a>

	{#if item.status === 'archived'}
		<p class="cms-archived-notice">This item has been archived.</p>
	{/if}

	<!-- Predictions item template -->
	{#if contentType.settings.itemTemplate === 'predictions-item'}
		<article class="cms-default-article">
			<header>
				<h1>{item.title}</h1>
				{#if item.fields.date_window_start || item.fields.date_window_end}
					<p class="cms-prediction-window">
						{formatDateWindow(
							String(item.fields.date_window_start || ''),
							String(item.fields.date_window_end || '')
						)}
					</p>
				{/if}
				<span
					class="cms-prediction-status cms-prediction-status--{item.fields.resolution_status ||
						'pending'}"
				>
					{item.fields.resolution_status || 'pending'}
				</span>
				{#if item.publishedAt}
					<time datetime={item.publishedAt}>Posted {formatDate(item.publishedAt)}</time>
				{/if}
			</header>

			<div class="cms-default-article-fields cms-content">
				<CmsContent html={String(item.fields.body || '')} />
			</div>

			{#if item.fields.resolution_note}
				<div class="cms-prediction-resolution">
					<h2 class="cms-section-heading">Resolution</h2>
					<p>{item.fields.resolution_note}</p>
				</div>
			{/if}
		</article>

		<PredictionProof {item} />
	{:else if contentType.settings.itemTemplate === 'blog-item'}
		<article class="cms-blog-article">
			<header class="cms-blog-article-header">
				{#if item.fields.category}
					<span class="cms-blog-article-category">{item.fields.category}</span>
				{/if}
				<h1>{item.title}</h1>
				<div class="cms-blog-article-meta">
					{#if item.publishedAt}
						<time datetime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
					{/if}
					{#if item.fields.read_time}
						<span class="cms-read-time">{item.fields.read_time} min read</span>
					{/if}
				</div>
				{#if tags.length > 0}
					<div class="cms-blog-article-tags">
						{#each tags as tag}
							<a href="{getRoutePrefix()}?tag={tag.slug}" class="cms-tag">{tag.name}</a>
						{/each}
					</div>
				{/if}
			</header>

			{#if item.fields.featured_image}
				<div class="cms-blog-article-hero">
					<img src={String(item.fields.featured_image)} alt={item.title} />
				</div>
			{/if}

			{#if item.fields.excerpt}
				<div class="cms-blog-article-excerpt">
					<p>{item.fields.excerpt}</p>
				</div>
			{/if}

			<div class="cms-blog-article-body cms-content">
				<CmsContent html={String(item.fields.body || '')} />
			</div>
		</article>
	{:else}
		<!-- Default item template -->
		<article class="cms-default-article">
			<header>
				<h1>{item.title}</h1>
				{#if item.publishedAt}
					<time datetime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
				{/if}
			</header>

			{#if tags.length > 0}
				<div class="cms-article-tags">
					{#each tags as tag}
						<a href="{getRoutePrefix()}?tag={tag.slug}" class="cms-tag">{tag.name}</a>
					{/each}
				</div>
			{/if}

			<!-- Render all custom fields -->
			<div class="cms-default-article-fields">
				{#each contentType.fields as fieldDef}
					{#if item.fields[fieldDef.name] !== undefined && item.fields[fieldDef.name] !== null && item.fields[fieldDef.name] !== ''}
						<div class="cms-field-block">
							{#if fieldDef.type === 'richtext'}
								<div class="cms-content">
									<CmsContent html={String(item.fields[fieldDef.name] || '')} />
								</div>
							{:else if fieldDef.type === 'image' || fieldDef.type === 'url'}
								{#if fieldDef.type === 'image'}
									<img src={String(item.fields[fieldDef.name])} alt={fieldDef.label} />
								{:else}
									<a href={String(item.fields[fieldDef.name])} target="_blank" rel="noopener">
										{item.fields[fieldDef.name]}
									</a>
								{/if}
							{:else if fieldDef.type === 'boolean'}
								<p>
									<strong>{fieldDef.label}:</strong>
									{item.fields[fieldDef.name] ? 'Yes' : 'No'}
								</p>
							{:else}
								<p>{item.fields[fieldDef.name]}</p>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</article>
	{/if}
</div>

<style>
	.cms-item-page {
		max-width: 780px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	.cms-back-link {
		display: inline-block;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: var(--spacing-lg);
		transition: color 0.2s ease;
	}

	.cms-back-link:hover {
		color: var(--color-primary);
	}

	/* Blog article template */
	.cms-blog-article-header {
		margin-bottom: var(--spacing-xl);
	}

	.cms-blog-article-category {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.cms-blog-article-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.2;
		margin-bottom: var(--spacing-md);
	}

	.cms-blog-article-meta {
		display: flex;
		gap: var(--spacing-md);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-md);
	}

	.cms-read-time::before {
		content: '·';
		margin-right: var(--spacing-sm);
	}

	.cms-blog-article-tags,
	.cms-article-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.cms-tag {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: background-color 0.2s ease;
	}

	.cms-tag:hover {
		background-color: var(--color-surface-hover);
	}

	.cms-blog-article-hero {
		margin-bottom: var(--spacing-xl);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.cms-blog-article-hero img {
		width: 100%;
		height: auto;
		display: block;
	}

	.cms-blog-article-excerpt {
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xl);
		padding-bottom: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	/* Rich text content styles */
	.cms-content {
		font-size: 1.0625rem;
		line-height: 1.8;
		color: var(--color-text);
	}

	.cms-content :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: var(--spacing-2xl);
		margin-bottom: var(--spacing-md);
	}

	.cms-content :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: var(--spacing-xl);
		margin-bottom: var(--spacing-sm);
	}

	.cms-content :global(p) {
		margin-bottom: var(--spacing-md);
	}

	.cms-content :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.cms-content :global(ul),
	.cms-content :global(ol) {
		margin-bottom: var(--spacing-md);
		padding-left: var(--spacing-xl);
	}

	.cms-content :global(li) {
		margin-bottom: var(--spacing-xs);
	}

	.cms-content :global(blockquote) {
		border-left: 3px solid var(--color-primary);
		padding-left: var(--spacing-lg);
		margin: var(--spacing-lg) 0;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.cms-content :global(code) {
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.875em;
		background-color: var(--color-surface);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
	}

	.cms-content :global(pre) {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		overflow-x: auto;
		margin-bottom: var(--spacing-md);
	}

	.cms-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.cms-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		margin: var(--spacing-md) 0;
	}

	/* Captioned figures. The sanitizer already allows <figure>/<figcaption>, but
	   without these the caption renders as body copy welded to the next
	   paragraph. */
	.cms-content :global(figure) {
		margin: var(--spacing-lg) 0;
	}

	.cms-content :global(figure img) {
		display: block;
		margin: 0 auto;
	}

	.cms-content :global(figcaption) {
		margin-top: var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.6;
		text-align: center;
	}

	/* Byline inside body content, for posts with a co-author worth naming. The
	   wrapper <p> carries the class (the sanitizer allows class on p). */
	.cms-content :global(.byline) {
		margin: 0 0 var(--spacing-md);
		padding-bottom: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: 0.95rem;
		letter-spacing: 0.01em;
	}

	/* Float utilities: let body text wrap around a figure. The wrapper carries
	   the class (the sanitizer strips class off <img> but allows it on div/p). */
	.cms-content :global(.cms-float-right),
	.cms-content :global(.cms-float-left) {
		max-width: 45%;
		margin-top: 0;
	}
	.cms-content :global(.cms-float-right) {
		float: right;
		margin-left: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
	}
	.cms-content :global(.cms-float-left) {
		float: left;
		margin-right: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
	}
	.cms-content :global(.cms-float-right img),
	.cms-content :global(.cms-float-left img) {
		margin: 0;
		width: 100%;
	}
	/* Headings after a float start a fresh block below it. */
	.cms-content :global(h2) {
		clear: both;
	}
	/* On narrow screens, don't wrap — stack full width. */
	@media (max-width: 640px) {
		.cms-content :global(.cms-float-right),
		.cms-content :global(.cms-float-left) {
			float: none;
			max-width: 100%;
			margin-left: 0;
			margin-right: 0;
		}
	}

	/* Editorial alert inside body content — e.g. a stale-post notice pointing at
	   a newer follow-up. The wrapper div carries the class; nested <p> keeps the
	   markup sanitizer-safe (class is allowed on div/p). */
	.cms-content :global(.cms-alert) {
		/* Tinted with the warning colour rather than --color-surface, which sits
		   too close to --color-background to read as a distinct box. The plain
		   declarations are fallbacks for engines without color-mix(). */
		background: var(--color-surface);
		background: color-mix(in srgb, var(--color-warning) 18%, var(--color-background));
		border: 1px solid var(--color-border);
		border-color: color-mix(in srgb, var(--color-warning) 38%, var(--color-border));
		border-left: 5px solid var(--color-warning);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin: 0 0 var(--spacing-xl);
		font-size: 0.9375rem;
		line-height: 1.65;
		color: var(--color-text-secondary);
	}
	/* Eyebrow label, supplied per-alert by the body content so the class stays
	   generic: <span class="cms-alert-label">Outdated post</span> */
	.cms-content :global(.cms-alert-label) {
		display: block;
		margin-bottom: var(--spacing-xs);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-warning);
		filter: brightness(0.88);
	}
	.cms-content :global(.cms-alert p) {
		margin: 0;
	}
	.cms-content :global(.cms-alert p + p) {
		margin-top: var(--spacing-sm);
	}
	.cms-content :global(.cms-alert strong) {
		color: var(--color-text);
	}
	.cms-content :global(.cms-alert a) {
		font-weight: 600;
	}

	/* Default article template */
	.cms-default-article header {
		margin-bottom: var(--spacing-xl);
	}

	.cms-default-article h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.cms-default-article time {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.cms-default-article-fields {
		margin-top: var(--spacing-xl);
	}

	.cms-field-block {
		margin-bottom: var(--spacing-lg);
	}

	.cms-field-block img {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}

	/* Predictions item template */
	.cms-archived-notice {
		display: inline-block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-surface-hover);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-lg);
	}

	.cms-prediction-window {
		color: var(--color-text-secondary);
		font-size: 1rem;
		margin-bottom: var(--spacing-sm);
	}

	.cms-prediction-status {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125em 0.5em;
		border-radius: var(--radius-sm);
		background: var(--color-surface-hover);
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.cms-prediction-status--correct {
		color: #2e7d32;
	}

	.cms-prediction-status--incorrect {
		color: #c62828;
	}

	.cms-prediction-status--partial {
		color: #ef6c00;
	}

	.cms-prediction-resolution {
		margin-top: var(--spacing-xl);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.cms-section-heading {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: var(--spacing-sm);
	}
</style>
