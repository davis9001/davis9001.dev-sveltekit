<script lang="ts">
	import { base } from '$app/paths';
	import type { PageData } from './$types';
	import { screenshotPath, SCREENSHOT_THEMES } from '$lib/utils/portfolio';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	export let data: PageData;

	$: projects = data.projects;
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
	title="Portfolio Projects"
	description="Portfolio of projects by David Monaghan — web apps, games, and developer tools."
	path="/portfolio"
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

	<main class="px-2 sm:p-9 flex-1">
		<!-- Title section with background image -->
		<div class="flex relative">
			<div
				class="fixed inset-0 bg-cover bg-center bg-no-repeat blur-sm opacity-20 z-10"
				style="background-image:url('/davis9001-2.webp');background-size:contain;background-position:-9ch 18em;"
			></div>
			<div class="flex content-center justify-center relative z-50 mx-auto max-w-5xl">
				<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold flex flex-wrap items-center gap-3 heading-title">
					<img
						src="/logo-green-Icon-250.webp"
						alt="davis9001 logo"
						class="w-10 h-10 shrink-0 sm:w-14 sm:h-14 lg:w-20 lg:h-20"
					/>
					Portfolio Projects
				</h1>
			</div>
		</div>

		<!-- Projects grid -->
		<div class="relative z-50 mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 md:p-5 xl:gap-12">
			{#each projects as project}
				<div class="w-full max-w-lg mx-auto">
					<div class="rounded-2xl">
						{#if project.meta.url}
							<a class="text-accent block" href="/portfolio/project/{project.slug}">
								{#each SCREENSHOT_THEMES as theme (theme)}
									<img
										src={screenshotPath(project.meta.url, theme)}
										alt="Screenshot of {project.meta.title}"
										loading="lazy"
										class="theme-img theme-img--{theme} mb-4 aspect-[16/9] w-full rounded-2xl object-cover object-center"
									/>
								{/each}
								<h2 class="text-xl sm:text-2xl font-bold leading-tight">{project.meta.title}</h2>
							</a>
							<p class="text-foreground/60">
								<a class="font-bold" href={project.meta.url} target="_blank" rel="noopener noreferrer">
									{project.meta.url}
								</a>
							</p>
						{:else}
							<h2 class="text-xl sm:text-2xl font-bold leading-tight">{project.meta.title}</h2>
						{/if}

						{#if project.meta.latestContribution}
							<p class="italic text-foreground/60">
								Updated: <time datetime={project.meta.latestContribution} class="text-foreground/60">
									{formatDate(project.meta.latestContribution)}
								</time>
							</p>
						{/if}

						<div class="mt-4 text-foreground">{project.meta.summary}</div>
					</div>
				</div>
			{/each}
		</div>

		{#if projects.length === 0}
			<div class="empty-state">
				<p>No projects found.</p>
			</div>
		{/if}
	</main>

	<SocialLinks />
	<Footer />
</div>

<style>
	.heading-title {
		margin: 2rem 0;
		align-items: center;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 0;
		color: var(--color-text-secondary);
		font-size: 1.25rem;
	}
</style>
