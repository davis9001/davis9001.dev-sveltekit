<script lang="ts">
	import type { PageData } from './$types';
	import { safeFilename } from '$lib/utils/portfolio';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	export let data: PageData;

	$: projects = data.projects;

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<SEO
	title="Portfolio Projects"
	description="Portfolio of projects by David Monaghan — web apps, games, and developer tools."
	path="/portfolio"
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

	<main class="p-1 sm:p-9 flex-1">
		<!-- Title section with background image -->
		<div class="flex relative">
			<div
				class="fixed inset-0 bg-cover bg-center bg-no-repeat blur-sm opacity-20 z-10"
				style="background-image:url('/davis9001-2.webp');background-size:contain;background-position:-9ch 18em;"
			></div>
			<div class="flex content-center justify-center relative z-50">
				<h1 class="text-4xl font-bold flex space-x-3 heading-title">
					<img
						src="/logo-green-Icon-250.webp"
						alt="davis9001 logo"
						class="w-12 h-12 md:w-24 md:h-24"
					/>
					Portfolio Projects
				</h1>
			</div>
		</div>

		<!-- Projects grid -->
		<div class="md:p-5 grid md:grid-cols-2 lg:grid-cols-3 gap-20 relative z-50">
			{#each projects as project}
				<div class="md:p-3 m-1 sm:p-9 sm:m-3">
					<div class="rounded-2xl">
						{#if project.meta.url}
							<a class="text-accent" href="/portfolio/project/{project.slug}">
								<img
									src={safeFilename(project.meta.url)}
									alt="Screenshot of {project.meta.title}"
									loading="lazy"
								/>
								<h2 class="text-2xl font-bold">{project.meta.title}</h2>
							</a>
							<p class="text-foreground/60">
								<a class="font-bold" href={project.meta.url} target="_blank" rel="noopener noreferrer">
									{project.meta.url}
								</a>
							</p>
						{:else}
							<h2 class="text-2xl font-bold">{project.meta.title}</h2>
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
