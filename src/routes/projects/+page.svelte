<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import {
		BOARD_STATUSES,
		PROJECT_STATUS_COLORS,
		PROJECT_STATUS_LABELS,
		type ProjectStatus
	} from '$lib/projects/types';
	import type { PageData } from './$types';

	export let data: PageData;

	const githubIconPath =
		'M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5';

	function statusColor(s: string): string {
		return PROJECT_STATUS_COLORS[s as ProjectStatus] ?? PROJECT_STATUS_COLORS.active;
	}
	function statusLabel(s: string): string {
		return PROJECT_STATUS_LABELS[s as ProjectStatus] ?? s;
	}

	// Group filter for the task board (client-side)
	let groupFilter = '';
	$: groupNames = data.groups.map((g) => g.name);
	$: boardTasks = groupFilter
		? data.boardTasks.filter((t) => t.group === groupFilter)
		: data.boardTasks;
	$: columns = BOARD_STATUSES.map((status) => ({
		status,
		tasks: boardTasks.filter((t) => t.status === status)
	}));
</script>

<SEO
	title="Open Projects"
	description="A live board of current active projects and their tasks."
	path="/projects"
/>

<main class="projects-page" aria-label="Open projects page">
	<div class="projects-container">
		<header class="projects-header">
			<h1>Open Projects</h1>
			<p>A live board of what I'm actively working on right now.</p>
		</header>

		<!-- Task board -->
		<section class="board-section" aria-label="Task board">
			<div class="board-header">
				<h2>Task Board</h2>
				{#if groupNames.length > 1}
					<div class="group-chips" role="group" aria-label="Filter tasks by group">
						<button
							class="group-chip"
							class:group-chip-active={groupFilter === ''}
							on:click={() => (groupFilter = '')}
						>
							All
						</button>
						{#each groupNames as name}
							<button
								class="group-chip"
								class:group-chip-active={groupFilter === name}
								on:click={() => (groupFilter = groupFilter === name ? '' : name)}
							>
								{name}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="board" role="list" aria-label="Tasks by status">
				{#each columns as column (column.status)}
					<div class="board-col" role="listitem" aria-label="{statusLabel(column.status)} tasks">
						<h3 class="board-col-title" style="--col-color: {statusColor(column.status)}">
							{statusLabel(column.status)}
							<span class="board-col-count">{column.tasks.length}</span>
						</h3>
						<div class="board-col-cards">
							{#each column.tasks as task}
								<article class="task-card" class:task-card-done={task.status === 'complete'}>
									<p class="task-card-text">{task.text}</p>
									<div class="task-card-foot">
										{#if task.projectLink}
											<a
												class="task-card-project"
												href={task.projectLink}
												target="_blank"
												rel="noopener noreferrer"
											>
												{task.projectName}
											</a>
										{:else}
											<span class="task-card-project task-card-project--plain">
												{task.projectName}
											</span>
										{/if}
										<span class="task-card-group">{task.group}</span>
									</div>
								</article>
							{/each}
							{#if column.tasks.length === 0}
								<p class="board-empty">—</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			<p class="board-hint" aria-hidden="true">swipe columns →</p>
		</section>
		<!-- Project strip: one compact card per project -->
		<div class="groups" role="list" aria-label="Current work groups">
			{#each data.groups as group}
				<section class="group" role="listitem" aria-label={group.name}>
					<h2>{group.name}</h2>
					<ul class="project-strip">
						{#each group.projects as item}
							<li class="project-pill">
								<div class="project-pill-head">
									{#if item.primaryLink}
										<a
											class="project-name"
											href={item.primaryLink}
											target="_blank"
											rel="noopener noreferrer"
										>
											{item.name}
										</a>
									{:else}
										<strong class="project-name project-name--plain">{item.name}</strong>
									{/if}
									<span
										class="status-badge"
										style="--badge-color: {statusColor(item.status)}"
										title="Status: {statusLabel(item.status)}"
									>
										{statusLabel(item.status)}
									</span>
								</div>
								{#if item.githubUrl || item.extraLinks?.length}
									<ul class="item-links" aria-label="{item.name} related links">
										{#if item.githubUrl}
											<li>
												<a
													class="link-with-icon"
													href={item.githubUrl}
													target="_blank"
													rel="noopener noreferrer"
												>
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
													<span>GitHub</span>
												</a>
											</li>
										{/if}
										{#each item.extraLinks as link}
											<li>
												<a href={link.href} target="_blank" rel="noopener noreferrer">
													{link.label}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
								{#if item.blockers}
									<p class="blockers-note" title="Blockers">⚠ {item.blockers}</p>
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
			radial-gradient(
				circle at 10% 10%,
				color-mix(in srgb, var(--color-primary) 12%, transparent) 0%,
				transparent 45%
			),
			radial-gradient(
				circle at 90% 85%,
				color-mix(in srgb, var(--color-accent) 10%, transparent) 0%,
				transparent 45%
			),
			var(--color-background);
	}

	.projects-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.projects-header {
		text-align: center;
		margin-bottom: var(--spacing-xl);
	}

	.projects-header h1 {
		font-size: clamp(1.75rem, 6vw, 2.75rem);
		margin-bottom: var(--spacing-xs);
	}

	.projects-header p {
		color: var(--color-text-secondary);
	}

	/* ── Project strip ── */
	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.group h2 {
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.project-strip {
		list-style: none;
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-sm);
		padding: 0;
		margin: 0;
	}

	@media (min-width: 560px) {
		.project-strip {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 900px) {
		.project-strip {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.project-pill {
		background: color-mix(in srgb, var(--color-surface) 80%, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.6rem 0.75rem;
	}

	.project-pill-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
	}

	.project-name {
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--color-primary);
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.project-name:hover {
		text-decoration: underline;
	}

	.project-name--plain {
		color: var(--color-text);
	}

	.status-badge {
		flex-shrink: 0;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--badge-color);
		border: 1px solid var(--badge-color);
		border-radius: var(--radius-sm);
		padding: 0.1rem 0.4rem;
		background: color-mix(in srgb, var(--badge-color) 12%, transparent);
	}

	.item-links {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		padding: 0;
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
	}

	.item-links a {
		color: var(--color-text-secondary);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.item-links a:hover {
		color: var(--color-primary);
	}

	.github-icon {
		width: 0.85rem;
		height: 0.85rem;
	}

	.blockers-note {
		margin: 0.4rem 0 0;
		font-size: 0.75rem;
		color: var(--color-warning, #f59e0b);
	}

	/* ── Task board ── */
	.board-section {
		margin-bottom: var(--spacing-2xl, 3rem);
	}

	.board-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	.board-header h2 {
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.group-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.group-chip {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		padding: 0.25rem 0.75rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.group-chip:hover {
		border-color: var(--color-primary);
		color: var(--color-text);
	}

	.group-chip-active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #fff;
	}

	/* Mobile-first: swipeable snap columns; grid on wide screens */
	.board {
		display: flex;
		gap: var(--spacing-sm);
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		padding-bottom: var(--spacing-sm);
		margin: 0 calc(-1 * var(--spacing-md));
		padding-left: var(--spacing-md);
		padding-right: var(--spacing-md);
	}

	.board-col {
		flex: 0 0 82vw;
		max-width: 20rem;
		scroll-snap-align: center;
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-sm);
	}

	.board-hint {
		text-align: center;
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
		opacity: 0.7;
		margin-top: 0.25rem;
	}

	@media (min-width: 900px) {
		.board {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			overflow-x: visible;
			margin: 0;
			padding-left: 0;
			padding-right: 0;
		}

		.board-col {
			flex: none;
			max-width: none;
		}

		.board-hint {
			display: none;
		}
	}

	.board-col-title {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--col-color, var(--color-text));
		padding-bottom: 0.4rem;
		margin-bottom: var(--spacing-sm);
		border-bottom: 2px solid var(--col-color, var(--color-border));
	}

	.board-col-count {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		padding: 0 0.45rem;
	}

	.board-col-cards {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.task-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.55rem 0.65rem;
	}

	.task-card-text {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--color-text);
		overflow-wrap: anywhere;
	}

	.task-card-done .task-card-text {
		text-decoration: line-through;
		color: var(--color-text-secondary);
	}

	.task-card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-xs);
		margin-top: 0.35rem;
	}

	.task-card-project {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.task-card-project:hover {
		text-decoration: underline;
	}

	.task-card-project--plain {
		color: var(--color-text-secondary);
	}

	.task-card-group {
		flex-shrink: 0;
		font-size: 0.625rem;
		color: var(--color-text-secondary);
	}

	.board-empty {
		text-align: center;
		color: var(--color-text-secondary);
		opacity: 0.6;
		padding: var(--spacing-md) 0;
		margin: 0;
	}
</style>
