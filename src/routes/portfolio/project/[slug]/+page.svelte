<script lang="ts">
	import { base } from '$app/paths';
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { renderProjectMarkdown } from '$lib/utils/project-markdown';
	import { screenshotPath, screenshotOgUrl, SCREENSHOT_THEMES } from '$lib/utils/portfolio';
	import { themeSwapClass, themeSwitchLabel } from '$lib/utils/theme-image';

	// Distinct from the body figures, which are numbered from 1 by the renderer.
	const HERO_FIGURE_ID = 'theme-figure-hero';
	import { DEFAULT_OG_IMAGE } from '$lib/utils/seo';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	export let data: PageData;

	$: project = data.project;
	$: homeHref = base || '/';

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		// UTC, not local: a date-only frontmatter value ("2026-08-26") parses as
		// UTC midnight, which formats as the previous day west of Greenwich.
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<SEO
	title={project.meta.title}
	description={project.meta.summary || `${project.meta.title} — a project by David Monaghan.`}
	path="/portfolio/project/{project.slug}"
	imageUrl={project.meta.url ? screenshotOgUrl(project.meta.url) : DEFAULT_OG_IMAGE}
/>

<div class="px-6 sm:px-8 py-2 bg-background text-foreground min-h-screen overflow-x-hidden">
	<!-- Simple Header -->
	<header class="flex justify-between items-center p-2 sm:p-4 mx-auto z-50 relative gap-2">
		<nav class="flex-shrink-0">
			<a href={homeHref} class="internal-button text-sm px-3 py-2">« davis9001.dev</a>
		</nav>
		<div class="flex items-center gap-4">
			<ThemeSwitcher variant="inline" simpleToggle={true} />
		</div>
	</header>

	<main class="px-2 md:p-9 flex-1 max-w-2xl mx-auto relative">
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
				<!-- The switch sits outside the link on purpose: a label and a checkbox
				     inside an anchor would be both invalid and un-clickable. -->
				<div class="theme-figure">
					<input class="theme-figure-flip" type="checkbox" id={HERO_FIGURE_ID} />
					<a href={project.meta.url} target="_blank" rel="noopener noreferrer">
						{#each SCREENSHOT_THEMES as theme (theme)}
							<img
								src={screenshotPath(project.meta.url, theme)}
								alt="Screenshot of {project.meta.title}"
								class={themeSwapClass(theme)}
							/>
						{/each}
					</a>
					<label class="theme-figure-switch" for={HERO_FIGURE_ID}>
						{#each SCREENSHOT_THEMES as theme (theme)}
							<span class={themeSwapClass(theme)}>{themeSwitchLabel(theme)}</span>
						{/each}
					</label>
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
					{@html renderProjectMarkdown(project.content)}
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

	/* The figure takes the image's spacing so its box is exactly the picture —
	   otherwise the switch, positioned against the figure, floats in the margin
	   below the screenshot instead of sitting on it. */
	.markdown-body :global(.theme-figure) {
		margin: 1.5rem 0;
	}

	.markdown-body :global(.theme-figure img) {
		margin: 0;
	}

	.markdown-body :global(img) {
		display: block;
		width: 100%;
		height: auto;
		margin: 1.5rem 0;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3) {
		color: var(--color-text);
		margin: 2rem 0 0.75rem;
		font-weight: 700;
		line-height: 1.3;
	}

	/* Sized below the page's own <h1> title, so a heading inside the body never
	   outranks the project name above it. */
	.markdown-body :global(h1) {
		font-size: 1.5rem;
	}

	.markdown-body :global(h2) {
		font-size: 1.25rem;
	}

	.markdown-body :global(h3) {
		font-size: 1.05rem;
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
