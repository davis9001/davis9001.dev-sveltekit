<script lang="ts">
	import type { PageData } from './$types';
	import { marked } from 'marked';
	import { safeFilename } from '$lib/utils/portfolio';
	import SEO from '$lib/components/SEO.svelte';

	export let data: PageData;

	$: project = data.project;

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<SEO
	title={project.meta.title}
	description={project.meta.summary || `${project.meta.title} — a project by David Monaghan.`}
	path="/portfolio/project/{project.slug}"
	imageUrl={project.meta.url ? `https://davis9001.dev/portfolio-screenshot/${safeFilename(project.meta.url)}` : 'https://davis9001.dev/cover.png'}
/>

<div class="project-page">
	<div class="project-container">
		<div class="back-nav">
			<a href="/portfolio" class="back-link">« Back to /portfolio</a>
		</div>

		{#if project.meta.url}
			<a href={project.meta.url} target="_blank" rel="noopener noreferrer" class="screenshot-link">
				<img
					src={safeFilename(project.meta.url)}
					alt="Screenshot of {project.meta.title}"
					class="screenshot-img"
				/>
			</a>
		{/if}

		<h1 class="project-title">{project.meta.title}</h1>

		{#if project.meta.url}
			<div class="project-url-row">
				<a
					href={project.meta.url}
					target="_blank"
					rel="noopener noreferrer"
					class="project-url"
				>
					{project.meta.url}
				</a>
			</div>
		{/if}

		{#if project.meta.latestContribution}
			<p class="project-date">
				Latest Contribution: {formatDate(project.meta.latestContribution)}
			</p>
		{/if}

		{#if project.content}
			<div class="project-content">
				{@html marked(project.content)}
			</div>
		{/if}
	</div>
</div>

<style>
	.project-page {
		min-height: 100vh;
		background-color: var(--color-background);
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.project-page {
			padding: 2.5rem;
		}
	}

	.project-container {
		max-width: 42rem;
		margin: 0 auto;
	}

	.back-nav {
		margin-bottom: 2.25rem;
	}

	.back-link {
		display: inline-block;
		color: var(--color-primary);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		transition: background-color 150ms, color 150ms;
	}

	.back-link:hover {
		background-color: var(--color-surface);
	}

	.screenshot-link {
		display: block;
		margin-bottom: 1.75rem;
	}

	.screenshot-img {
		width: 100%;
		height: auto;
		border-radius: 0.5rem;
	}

	.project-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 0.5rem;
	}

	@media (min-width: 768px) {
		.project-title {
			font-size: 2.25rem;
		}
	}

	.project-url-row {
		margin-bottom: 0.25rem;
	}

	.project-url {
		color: var(--color-primary);
		text-decoration: none;
	}

	.project-url:hover {
		text-decoration: underline;
	}

	.project-date {
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0.25rem 0 1rem;
	}

	.project-content {
		padding: 0.75rem;
		color: var(--color-text);
		line-height: 1.7;
	}

	@media (min-width: 768px) {
		.project-content {
			padding: 2.25rem;
		}
	}

	.project-content :global(a) {
		color: var(--color-primary);
	}

	.project-content :global(a:hover) {
		text-decoration: underline;
	}

	.project-content :global(p) {
		margin-bottom: 1rem;
	}

	.project-content :global(ul),
	.project-content :global(ol) {
		margin-bottom: 1rem;
		padding-left: 2rem;
	}

	.project-content :global(li) {
		margin-bottom: 0.25rem;
	}

	.project-content :global(h1),
	.project-content :global(h2),
	.project-content :global(h3) {
		color: var(--color-text);
		margin: 1.5rem 0 0.75rem;
		font-weight: 700;
	}

	.project-content :global(code) {
		background-color: var(--color-surface);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.project-content :global(pre) {
		background-color: var(--color-surface);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
	}

	.project-content :global(pre code) {
		background: none;
		padding: 0;
	}
</style>
