<script lang="ts">
	import type { PageData } from './$types';
	import { safeFilename } from '$lib/utils/portfolio';

	export let data: PageData;

	$: projects = data.projects;

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Portfolio Projects - davis9001</title>
	<meta name="description" content="Portfolio of projects by Davis Monaghan" />
</svelte:head>

<div class="portfolio-page">
	<div class="portfolio-container">
		<header class="portfolio-header">
			<h1 class="portfolio-title">Portfolio Projects</h1>
			<a href="/" class="back-link">← Back to home</a>
		</header>

		<div class="projects-grid">
			{#each projects as project}
				<article class="project-card">
					{#if project.meta.url}
						<a href="/portfolio/project/{project.slug}" class="screenshot-link">
							<img
								src={safeFilename(project.meta.url)}
								alt="Screenshot of {project.meta.title}"
								class="screenshot-img"
								loading="lazy"
							/>
							<h2 class="project-title">{project.meta.title}</h2>
						</a>
					{:else}
						<h2 class="project-title">{project.meta.title}</h2>
					{/if}

					{#if project.meta.url}
						<a
							href={project.meta.url}
							target="_blank"
							rel="noopener noreferrer"
							class="project-url"
						>
							{project.meta.url}
						</a>
					{/if}

					{#if project.meta.latestContribution}
						<p class="project-date">
							Updated: {formatDate(project.meta.latestContribution)}
						</p>
					{/if}

					<p class="project-summary">{project.meta.summary}</p>
				</article>
			{/each}
		</div>

		{#if projects.length === 0}
			<div class="empty-state">
				<p>No projects found.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.portfolio-page {
		min-height: 100vh;
		background-color: var(--color-background);
		padding: 3rem 1rem;
	}

	.portfolio-container {
		max-width: 80rem;
		margin: 0 auto;
	}

	.portfolio-header {
		margin-bottom: 3rem;
	}

	.portfolio-title {
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--color-text);
		margin-bottom: 1rem;
	}

	.back-link {
		display: inline-block;
		color: var(--color-primary);
		text-decoration: none;
		transition: opacity 150ms;
	}

	.back-link:hover {
		opacity: 0.8;
	}

	.projects-grid {
		display: grid;
		gap: 2.5rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 640px) {
		.projects-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.projects-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.project-card {
		display: flex;
		flex-direction: column;
	}

	.screenshot-link {
		display: block;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 0.75rem;
		transition: opacity 150ms;
	}

	.screenshot-link:hover {
		opacity: 0.85;
	}

	.screenshot-img {
		width: 100%;
		height: auto;
		display: block;
		aspect-ratio: 16 / 10;
		object-fit: cover;
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.project-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	.project-title-link {
		color: var(--color-primary);
		text-decoration: none;
		transition: opacity 150ms;
	}

	.project-title-link:hover {
		opacity: 0.8;
	}

	.project-url {
		font-size: 0.875rem;
		color: var(--color-primary);
		text-decoration: none;
		opacity: 0.8;
	}

	.project-url:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.project-date {
		font-size: 0.875rem;
		font-style: italic;
		color: var(--color-text-secondary);
		margin: 0.25rem 0;
	}

	.project-summary {
		font-size: 0.95rem;
		color: var(--color-text);
		line-height: 1.6;
		margin: 0.25rem 0 0;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 0;
		color: var(--color-text-secondary);
		font-size: 1.25rem;
	}
</style>
