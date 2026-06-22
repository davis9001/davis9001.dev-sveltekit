<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const githubIconPath =
		'M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5';
</script>

<SEO
	title="Open Projects"
	description="A comprehensive list of current active projects and tasks."
	path="/projects"
/>

<main class="projects-page" aria-label="Open projects page">
	<div class="projects-container">
		<header class="projects-header">
			<h1>Open Projects</h1>
			<p>Comprehensive list of what I am actively working on right now.</p>
		</header>

		<div class="groups" role="list" aria-label="Current work groups">
			{#each data.groups as group}
				<section class="group" role="listitem" aria-label={group.name}>
					<h2>{group.name}</h2>
					<ul class="project-list">
						{#each group.projects as item}
							<li>
								{#if item.primaryLink}
									<a class="project-name" href={item.primaryLink} target="_blank" rel="noopener noreferrer">
										{item.name}
									</a>
								{:else}
									<strong class="project-name project-name--plain">{item.name}</strong>
								{/if}
								{#if item.extraLinks?.length}
									<ul class="item-links" aria-label={`${item.name} related links`}>
										{#each item.extraLinks as link}
											<li>
												<a class:link-with-icon={link.label === 'GitHub'} href={link.href} target="_blank" rel="noopener noreferrer">
													{#if link.label === 'GitHub'}
														<svg
															class="github-icon"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															aria-hidden="true"
														>
															<path d={githubIconPath} />
														</svg>
													{/if}
													<span>{link.label}</span>
												</a>
											</li>
										{/each}
									</ul>
								{/if}
								{#if item.tasks?.length}
									<ul class="task-list">
										{#each item.tasks as task}
											<li>{task}</li>
										{/each}
									</ul>
								{/if}
								{#if item.completedTasks?.length}
									<ul class="task-list task-list--done" aria-label="Completed tasks">
										{#each item.completedTasks as task}
											<li>{task}</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</div>
</main>

<style>
	.projects-page {
		min-height: 100vh;
		padding: var(--spacing-xl) var(--spacing-md);
		background:
			radial-gradient(circle at 10% 10%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 45%),
			radial-gradient(circle at 90% 90%, color-mix(in srgb, var(--color-text) 6%, transparent) 0%, transparent 40%),
			var(--color-background);
	}

	.projects-container {
		max-width: 980px;
		margin: 0 auto;
	}

	.projects-header {
		text-align: center;
		margin-bottom: var(--spacing-2xl);
		padding-bottom: var(--spacing-xl);
		border-bottom: 1px solid var(--color-border);
	}

	.projects-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.projects-header p {
		color: var(--color-text-secondary);
		line-height: 1.6;
		max-width: 54ch;
		margin: 0 auto;
	}

	.groups {
		display: grid;
		gap: var(--spacing-xl);
	}

	.group {
		background-color: color-mix(in srgb, var(--color-surface) 85%, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		box-shadow: var(--shadow-sm);
	}

	.group h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
	}

	.project-list,
	.task-list {
		list-style: square;
		padding-left: var(--spacing-xl);
	}

	.project-list {
		display: grid;
		gap: var(--spacing-sm);
		color: var(--color-text);
	}

	.project-name {
		display: inline-block;
		margin-right: var(--spacing-sm);
		color: var(--color-primary);
		text-decoration: none;
	}

	.project-name--plain {
		color: var(--color-text);
	}

	.project-name:hover {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.item-links {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		list-style: none;
		padding: 0;
		margin: var(--spacing-xs) 0 0 0;
	}

	.item-links a {
		color: var(--color-primary);
		text-decoration: none;
	}

	.link-with-icon {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.github-icon {
		width: 1em;
		height: 1em;
		flex: 0 0 auto;
	}

	.item-links a:hover {
		text-decoration: underline;
	}

	.task-list {
		margin-top: var(--spacing-xs);
		display: grid;
		gap: calc(var(--spacing-xs) * 0.8);
		color: var(--color-text-secondary);
	}

	.task-list--done li {
		text-decoration: line-through;
		opacity: 0.55;
	}

	@media (min-width: 768px) {
		.projects-page {
			padding: var(--spacing-2xl);
		}

		.projects-header h1 {
			font-size: 3rem;
		}

		.groups {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: start;
		}
	}
</style>
