<script lang="ts">
	import type { PageData } from './$types';
	import { marked } from 'marked';

	export let data: PageData;

	$: projects = data.projects;

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Portfolio - davis9001</title>
	<meta name="description" content="Portfolio of projects by Davis Monaghan" />
</svelte:head>

<div class="min-h-screen bg-background py-12 px-4">
	<div class="max-w-6xl mx-auto">
		<header class="mb-12">
			<h1 class="text-4xl sm:text-5xl font-black text-foreground mb-4">Portfolio</h1>
			<p class="text-xl text-foreground/70">A collection of projects I've built</p>
			<a href="/" class="inline-block mt-4 text-accent hover:text-accent/80 transition-colors">
				← Back to home
			</a>
		</header>

		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project}
				<article class="bg-gradient-to-br from-primary/5 via-background/50 to-accent/5 dark:from-primary/10 dark:via-background/70 dark:to-accent/10 rounded-2xl p-6 backdrop-blur-sm border border-foreground/5 shadow-lg hover:shadow-xl transition-shadow">
					<div class="mb-4">
						{#if project.meta.url}
							<h2 class="text-2xl font-bold mb-2">
								<a 
									href={project.meta.url} 
									target="_blank" 
									rel="noopener noreferrer"
									class="text-accent hover:text-accent/80 transition-colors"
								>
									{project.meta.title}
									<svg class="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</a>
							</h2>
						{:else}
							<h2 class="text-2xl font-bold mb-2 text-foreground">{project.meta.title}</h2>
						{/if}

						{#if project.meta.latestContribution}
							<p class="text-xs text-foreground/50 mb-3">
								Last updated: {formatDate(project.meta.latestContribution)}
							</p>
						{/if}

						<p class="text-foreground/80 mb-4">{project.meta.summary}</p>
					</div>

					{#if project.meta.technologies && project.meta.technologies.length > 0}
						<div class="flex flex-wrap gap-2 mb-4">
							{#each project.meta.technologies as tech}
								<span class="inline-block px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
									{tech}
								</span>
							{/each}
						</div>
					{/if}

					{#if project.content}
						<div class="prose prose-sm dark:prose-invert max-w-none text-foreground/70">
							{@html marked(project.content)}
						</div>
					{/if}
				</article>
			{/each}
		</div>

		{#if projects.length === 0}
			<div class="text-center py-12">
				<p class="text-xl text-foreground/50">No projects found.</p>
			</div>
		{/if}
	</div>
</div>
