<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { marked } from 'marked';
	import { safeFilename } from '$lib/utils/portfolio';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
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

<div class="px-3 sm:px-4 py-2 bg-background text-foreground min-h-screen overflow-x-hidden">
	<!-- Simple Header -->
	<header class="flex justify-between items-center p-2 sm:p-4 mx-auto z-50 relative gap-2">
		<nav class="flex-shrink-0">
			<a href="/" class="internal-button text-sm px-3 py-2">« davis9001.dev</a>
		</nav>
		<div class="flex items-center gap-4">
			<ThemeSwitcher variant="inline" simpleToggle={true} />
		</div>
	</header>

	<main class="p-3 md:p-9 flex-1 max-w-2xl mx-auto relative">
		<!-- Background image (logo) -->
		<div
			class="fixed inset-0 bg-cover bg-center bg-no-repeat z-10 opacity-10 blur-xl"
			style="background-image:url('/logo-green-Icon-250.webp');background-size:contain;background-position:-9ch -9em;"
		></div>

		<div class="relative z-50">
			<div class="mb-9">
				<a href="/portfolio" class="internal-button">« Back to /portfolio</a>
			</div>

			{#if project.meta.url}
				<div>
					<a href={project.meta.url} target="_blank" rel="noopener noreferrer">
						<img
							src={safeFilename(project.meta.url)}
							alt="Screenshot of {project.meta.title}"
						/>
					</a>
				</div>
			{/if}

			<h1 class="text-xl md:text-4xl font-bold mt-7">{project.meta.title}</h1>

			{#if project.meta.url}
				<div>
					<a href={project.meta.url} target="_blank" rel="noopener noreferrer">
						{project.meta.url}
					</a>
				</div>
			{/if}

			{#if project.meta.latestContribution}
				<p class="text-foreground/60 italic">
					Latest Contribution: <time datetime={project.meta.latestContribution}>
						{formatDate(project.meta.latestContribution)}
					</time>
				</p>
			{/if}

			{#if project.content}
				<div class="markdown-body p-3 md:p-9">
					{@html marked(project.content)}
				</div>
			{/if}

			<ShareButtons url={$page.url.href} title={project.meta.title} />
		</div>
	</main>

	<SocialLinks />
	<Footer />
</div>

<style>
	.markdown-body {
		color: var(--color-text);
		line-height: 1.7;
	}

	.markdown-body :global(a) {
		color: var(--color-primary);
	}

	.markdown-body :global(a:hover) {
		text-decoration: underline;
	}

	.markdown-body :global(p) {
		margin-bottom: 1rem;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		margin-bottom: 1rem;
		padding-left: 2rem;
	}

	.markdown-body :global(li) {
		margin-bottom: 0.25rem;
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3) {
		color: var(--color-text);
		margin: 1.5rem 0 0.75rem;
		font-weight: 700;
	}

	.markdown-body :global(code) {
		background-color: var(--color-surface);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.markdown-body :global(pre) {
		background-color: var(--color-surface);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
	}

	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}
</style>
