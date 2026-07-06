<!--
  Admin Projects Dashboard ("mission control")

  Purpose-built admin view for the open-projects content type. Everything is
  visible and editable inline: status, priority, tasks, blockers, ordering.
  Falls back to the generic CMS editor for full-field edits.
-->
<script lang="ts">
	import type {
		AdminProject,
		AdminTask,
		ProjectPriority,
		ProjectStatus
	} from '$lib/admin/projects-dashboard';
	import {
		buildFieldsUpdate,
		computeStats,
		filterProjects,
		groupProjects,
		listGroups,
		moveProject,
		PROJECT_PRIORITIES,
		PROJECT_STATUSES,
		taskProgress
	} from '$lib/admin/projects-dashboard';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let projects: AdminProject[] = data.projects || [];

	// ── UI state ──────────────────────────────────────────────────────────
	let view: 'groups' | 'board' = 'groups';
	let search = '';
	let statusFilter = '';
	let priorityFilter = '';
	let groupFilter = '';
	let hideComplete = false;
	let blockersOnly = false;

	let savingIds = new Set<string>();
	let errorMessage = '';
	let errorTimer: ReturnType<typeof setTimeout> | null = null;

	// per-project inline UI state
	let newTaskText: Record<string, string> = {};
	let editingBlockers: Record<string, boolean> = {};
	let blockersDraft: Record<string, string> = {};

	// quick-create modal
	let showCreate = false;
	let creating = false;
	let createForm = resetCreateForm();

	function resetCreateForm() {
		return {
			group: '*Space',
			name: '',
			status: 'active' as ProjectStatus,
			priority: 'medium' as ProjectPriority,
			description: '',
			primaryLink: '',
			githubUrl: '',
			firstTask: ''
		};
	}

	// ── Derived state ─────────────────────────────────────────────────────
	$: stats = computeStats(projects);
	$: allGroups = listGroups(projects);
	$: filtered = filterProjects(projects, {
		search,
		status: statusFilter,
		priority: priorityFilter,
		group: groupFilter,
		hideComplete,
		blockersOnly
	});
	$: groups = groupProjects(filtered);
	$: hasActiveFilters =
		!!search || !!statusFilter || !!priorityFilter || !!groupFilter || hideComplete || blockersOnly;

	const STATUS_LABELS: Record<ProjectStatus, string> = {
		active: 'Active',
		planning: 'Planning',
		paused: 'Paused',
		blocked: 'Blocked',
		complete: 'Complete'
	};
	const STATUS_COLORS: Record<ProjectStatus, string> = {
		active: 'var(--color-success, #22c55e)',
		planning: 'var(--color-primary)',
		paused: 'var(--color-warning, #f59e0b)',
		blocked: 'var(--color-danger, #ef4444)',
		complete: 'var(--color-text-secondary)'
	};
	const PRIORITY_COLORS: Record<ProjectPriority, string> = {
		high: 'var(--color-danger, #ef4444)',
		medium: 'var(--color-warning, #f59e0b)',
		low: 'var(--color-text-secondary)'
	};

	function showError(msg: string) {
		errorMessage = msg;
		if (errorTimer) clearTimeout(errorTimer);
		errorTimer = setTimeout(() => (errorMessage = ''), 5000);
	}

	function clearFilters() {
		search = '';
		statusFilter = '';
		priorityFilter = '';
		groupFilter = '';
		hideComplete = false;
		blockersOnly = false;
	}

	function toggleStatusFilter(status: string) {
		statusFilter = statusFilter === status ? '' : status;
	}

	// ── Persistence ───────────────────────────────────────────────────────

	/**
	 * Optimistically apply a field patch to a project and persist it.
	 * Rolls back the whole list on failure.
	 */
	async function saveProject(
		project: AdminProject,
		patch: Parameters<typeof buildFieldsUpdate>[1],
		titleOverride?: string
	) {
		const snapshot = projects;
		const fields = buildFieldsUpdate(project, patch);

		// optimistic local update
		projects = projects.map((p) =>
			p.id === project.id
				? {
						...p,
						rawFields: fields,
						group: (fields.group as string) ?? p.group,
						name: (fields.project_name as string) || p.name,
						projectStatus: (fields.status as ProjectStatus) ?? p.projectStatus,
						priority: (fields.priority as ProjectPriority) ?? p.priority,
						description: (fields.description as string) ?? p.description,
						primaryLink: (fields.primary_link as string | null) ?? null,
						githubUrl: (fields.github_url as string | null) ?? null,
						tasks: (fields.tasks as AdminTask[]) ?? p.tasks,
						blockers: (fields.blockers as string) ?? p.blockers,
						sortOrder:
							typeof fields.sort_order === 'number' ? (fields.sort_order as number) : p.sortOrder,
						title: titleOverride ?? p.title
					}
				: p
		);

		savingIds = new Set(savingIds).add(project.id);
		try {
			const body: Record<string, unknown> = { fields };
			if (titleOverride) body.title = titleOverride;

			const res = await fetch(`/api/cms/open-projects/${project.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				projects = snapshot;
				showError(`Failed to save "${project.name}"`);
			}
		} catch {
			projects = snapshot;
			showError(`Failed to save "${project.name}"`);
		} finally {
			const next = new Set(savingIds);
			next.delete(project.id);
			savingIds = next;
		}
	}

	function setStatus(project: AdminProject, status: string) {
		saveProject(project, { status });
	}

	function setPriority(project: AdminProject, priority: string) {
		saveProject(project, { priority });
	}

	function toggleTask(project: AdminProject, index: number) {
		const tasks = project.tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
		saveProject(project, { tasks });
	}

	function removeTask(project: AdminProject, index: number) {
		const tasks = project.tasks.filter((_, i) => i !== index);
		saveProject(project, { tasks });
	}

	function addTask(project: AdminProject) {
		const text = (newTaskText[project.id] || '').trim();
		if (!text) return;
		newTaskText = { ...newTaskText, [project.id]: '' };
		saveProject(project, { tasks: [...project.tasks, { text, done: false }] });
	}

	function startEditBlockers(project: AdminProject) {
		blockersDraft = { ...blockersDraft, [project.id]: project.blockers };
		editingBlockers = { ...editingBlockers, [project.id]: true };
	}

	function saveBlockers(project: AdminProject) {
		editingBlockers = { ...editingBlockers, [project.id]: false };
		const draft = blockersDraft[project.id] ?? '';
		if (draft !== project.blockers) {
			saveProject(project, { blockers: draft });
		}
	}

	async function move(project: AdminProject, direction: 'up' | 'down') {
		const updates = moveProject(projects, project.id, direction);
		if (updates.length === 0) return;

		const snapshot = projects;
		const byId = new Map(updates.map((u) => [u.id, u.sortOrder]));
		projects = projects.map((p) =>
			byId.has(p.id)
				? {
						...p,
						sortOrder: byId.get(p.id)!,
						rawFields: { ...p.rawFields, sort_order: byId.get(p.id)! }
					}
				: p
		);

		try {
			const results = await Promise.all(
				updates.map((u) => {
					const target = snapshot.find((p) => p.id === u.id)!;
					return fetch(`/api/cms/open-projects/${u.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ fields: buildFieldsUpdate(target, { sort_order: u.sortOrder }) })
					});
				})
			);
			if (results.some((r) => !r.ok)) {
				projects = snapshot;
				showError('Failed to reorder projects');
			}
		} catch {
			projects = snapshot;
			showError('Failed to reorder projects');
		}
	}

	// ── Delete ────────────────────────────────────────────────────────────
	let deleteTarget: AdminProject | null = null;
	let deleting = false;

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			const res = await fetch(`/api/cms/open-projects/${deleteTarget.id}`, { method: 'DELETE' });
			if (res.ok) {
				projects = projects.filter((p) => p.id !== deleteTarget!.id);
				deleteTarget = null;
			} else {
				showError(`Failed to delete "${deleteTarget.name}"`);
			}
		} catch {
			showError(`Failed to delete "${deleteTarget?.name}"`);
		} finally {
			deleting = false;
		}
	}

	// ── Quick create ──────────────────────────────────────────────────────
	async function createProject() {
		const name = createForm.name.trim();
		if (!name) return;
		creating = true;

		const groupProjectsList = projects.filter((p) => p.group === createForm.group);
		const nextOrder =
			groupProjectsList.length === 0
				? 0
				: Math.max(...groupProjectsList.map((p) => p.sortOrder)) + 1;

		const fields = {
			group: createForm.group,
			project_name: name,
			status: createForm.status,
			priority: createForm.priority,
			description: createForm.description.trim(),
			primary_link: createForm.primaryLink.trim() || null,
			github_url: createForm.githubUrl.trim() || null,
			extra_links: [],
			tasks: createForm.firstTask.trim()
				? [{ text: createForm.firstTask.trim(), done: false }]
				: [],
			blockers: '',
			sort_order: nextOrder
		};

		try {
			const res = await fetch('/api/cms/open-projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: name, status: 'published', fields })
			});
			if (res.ok) {
				const d = await res.json();
				const item = d.item;
				projects = [
					...projects,
					{
						id: item.id,
						slug: item.slug,
						title: item.title,
						itemStatus: item.status,
						group: fields.group,
						name,
						projectStatus: fields.status,
						priority: fields.priority,
						description: fields.description,
						primaryLink: fields.primary_link,
						githubUrl: fields.github_url,
						extraLinks: [],
						tasks: fields.tasks,
						blockers: '',
						sortOrder: nextOrder,
						createdAt: item.createdAt,
						updatedAt: item.updatedAt,
						rawFields: fields
					}
				];
				showCreate = false;
				createForm = resetCreateForm();
			} else {
				const errData = await res.json().catch(() => ({}));
				showError(errData.message || 'Failed to create project');
			}
		} catch {
			showError('Failed to create project');
		} finally {
			creating = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function boardColumn(status: ProjectStatus): AdminProject[] {
		return filtered
			.filter((p) => p.projectStatus === status)
			.sort((a, b) =>
				a.group === b.group ? a.sortOrder - b.sortOrder : a.group.localeCompare(b.group)
			);
	}
</script>

<SEO
	title="Projects Dashboard - Admin"
	description="Mission control for open projects."
	path="/admin/projects"
/>

<div class="dash">
	<!-- Header -->
	<div class="dash-header">
		<div>
			<h1>Projects</h1>
			<p class="dash-subtitle">
				Mission control for <a href="/projects" target="_blank" rel="noopener noreferrer"
					>/projects</a
				>
				· edits save instantly ·
				<a href="/admin/cms/open-projects">raw CMS view</a>
			</p>
		</div>
		<div class="dash-header-actions">
			<div class="view-toggle" role="group" aria-label="View mode">
				<button class:active={view === 'groups'} on:click={() => (view = 'groups')}>Groups</button>
				<button class:active={view === 'board'} on:click={() => (view = 'board')}>Board</button>
			</div>
			<button class="btn btn-primary" on:click={() => (showCreate = true)}>+ New Project</button>
		</div>
	</div>

	{#if errorMessage}
		<div class="error-toast" role="alert">{errorMessage}</div>
	{/if}

	<!-- Stats -->
	<div class="stats-row" role="group" aria-label="Project statistics">
		<button
			class="stat"
			class:stat-active={statusFilter === ''}
			on:click={() => (statusFilter = '')}
		>
			<span class="stat-value">{stats.total}</span>
			<span class="stat-label">Projects</span>
		</button>
		{#each PROJECT_STATUSES as s}
			<button
				class="stat"
				class:stat-active={statusFilter === s}
				style="--stat-color: {STATUS_COLORS[s]}"
				on:click={() => toggleStatusFilter(s)}
				title="Filter by {STATUS_LABELS[s]}"
			>
				<span class="stat-value stat-colored">{stats.byStatus[s]}</span>
				<span class="stat-label">{STATUS_LABELS[s]}</span>
			</button>
		{/each}
		<div class="stat stat-static">
			<span class="stat-value">{stats.openTasks}</span>
			<span class="stat-label">Open tasks</span>
		</div>
		<div class="stat stat-static">
			<span class="stat-value">{stats.taskPercent}%</span>
			<span class="stat-label">{stats.doneTasks}/{stats.totalTasks} done</span>
		</div>
		<button
			class="stat"
			class:stat-active={blockersOnly}
			style="--stat-color: var(--color-warning, #f59e0b)"
			on:click={() => (blockersOnly = !blockersOnly)}
			title="Show only projects with blockers"
		>
			<span class="stat-value stat-colored">{stats.withBlockers}</span>
			<span class="stat-label">Blockers</span>
		</button>
	</div>

	<!-- Toolbar -->
	<div class="toolbar">
		<input
			type="search"
			class="search-input"
			placeholder="Search projects, tasks, blockers..."
			bind:value={search}
			aria-label="Search projects"
		/>
		<select bind:value={statusFilter} aria-label="Filter by status">
			<option value="">All statuses</option>
			{#each PROJECT_STATUSES as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
		<select bind:value={priorityFilter} aria-label="Filter by priority">
			<option value="">All priorities</option>
			{#each PROJECT_PRIORITIES as p}
				<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={groupFilter} aria-label="Filter by group">
			<option value="">All groups</option>
			{#each allGroups as g}
				<option value={g}>{g}</option>
			{/each}
		</select>
		<label class="toolbar-check">
			<input type="checkbox" bind:checked={hideComplete} />
			Hide complete
		</label>
		{#if hasActiveFilters}
			<button class="btn-link" on:click={clearFilters}>Clear filters</button>
		{/if}
		<span class="toolbar-count">{filtered.length}/{projects.length} shown</span>
	</div>

	{#if projects.length === 0}
		<div class="empty-state">
			<h3>No projects yet</h3>
			<p>Create your first project to get started.</p>
			<button class="btn btn-primary" on:click={() => (showCreate = true)}>+ New Project</button>
		</div>
	{:else if filtered.length === 0}
		<div class="empty-state">
			<h3>Nothing matches your filters</h3>
			<button class="btn-link" on:click={clearFilters}>Clear filters</button>
		</div>
	{:else if view === 'groups'}
		<!-- ── Groups view ── -->
		{#each groups as group}
			<section class="group-section" aria-label={group.name}>
				<h2 class="group-title">
					{group.name}
					<span class="group-count">{group.projects.length}</span>
				</h2>
				<div class="cards">
					{#each group.projects as project, pi (project.id)}
						{@const progress = taskProgress(project.tasks)}
						<article
							class="card"
							class:card-saving={savingIds.has(project.id)}
							class:card-blocked={project.projectStatus === 'blocked'}
						>
							<div class="card-head">
								<div class="card-name-row">
									{#if project.primaryLink}
										<a
											class="card-name"
											href={project.primaryLink}
											target="_blank"
											rel="noopener noreferrer">{project.name}</a
										>
									{:else}
										<span class="card-name">{project.name}</span>
									{/if}
									{#if savingIds.has(project.id)}
										<span class="saving-dot" title="Saving...">●</span>
									{/if}
								</div>
								<div class="card-controls">
									<select
										class="pill-select"
										style="--pill-color: {STATUS_COLORS[project.projectStatus]}"
										value={project.projectStatus}
										on:change={(e) => setStatus(project, e.currentTarget.value)}
										aria-label="{project.name} status"
									>
										{#each PROJECT_STATUSES as s}
											<option value={s}>{STATUS_LABELS[s]}</option>
										{/each}
									</select>
									<select
										class="pill-select"
										style="--pill-color: {PRIORITY_COLORS[project.priority]}"
										value={project.priority}
										on:change={(e) => setPriority(project, e.currentTarget.value)}
										aria-label="{project.name} priority"
									>
										{#each PROJECT_PRIORITIES as p}
											<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
										{/each}
									</select>
								</div>
							</div>

							{#if project.description}
								<p class="card-desc">{project.description}</p>
							{/if}

							{#if project.primaryLink || project.githubUrl || project.extraLinks.length}
								<div class="card-links">
									{#if project.primaryLink}
										<a href={project.primaryLink} target="_blank" rel="noopener noreferrer">Site</a>
									{/if}
									{#if project.githubUrl}
										<a href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
									{/if}
									{#each project.extraLinks as link}
										<a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
									{/each}
								</div>
							{/if}

							<!-- Tasks -->
							<div class="card-tasks">
								{#if project.tasks.length > 0}
									<div class="progress" title="{progress.done}/{progress.total} tasks done">
										<div class="progress-bar" style="width: {progress.percent}%"></div>
									</div>
									<ul class="task-list">
										{#each project.tasks as task, ti}
											<li class="task" class:task-done={task.done}>
												<input
													type="checkbox"
													checked={task.done}
													on:change={() => toggleTask(project, ti)}
													aria-label="Toggle task: {task.text}"
												/>
												<span class="task-text">{task.text}</span>
												<button
													class="task-remove"
													title="Remove task"
													aria-label="Remove task: {task.text}"
													on:click={() => removeTask(project, ti)}>×</button
												>
											</li>
										{/each}
									</ul>
								{/if}
								<div class="task-add">
									<input
										type="text"
										placeholder="Add task..."
										bind:value={newTaskText[project.id]}
										on:keydown={(e) => e.key === 'Enter' && addTask(project)}
										aria-label="New task for {project.name}"
									/>
									<button on:click={() => addTask(project)} aria-label="Add task">+</button>
								</div>
							</div>

							<!-- Blockers -->
							{#if editingBlockers[project.id]}
								<textarea
									class="blockers-edit"
									bind:value={blockersDraft[project.id]}
									rows="2"
									placeholder="Blockers / notes..."
									on:blur={() => saveBlockers(project)}
									on:keydown={(e) => {
										if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveBlockers(project);
										if (e.key === 'Escape')
											editingBlockers = { ...editingBlockers, [project.id]: false };
									}}
									aria-label="Edit blockers for {project.name}"
								></textarea>
							{:else if project.blockers}
								<button
									class="blockers"
									on:click={() => startEditBlockers(project)}
									title="Click to edit"
								>
									⚠ {project.blockers}
								</button>
							{:else}
								<button class="blockers-add" on:click={() => startEditBlockers(project)}>
									+ blocker note
								</button>
							{/if}

							<!-- Footer -->
							<div class="card-foot">
								<span class="card-meta" title="Last updated">{formatDate(project.updatedAt)}</span>
								{#if project.itemStatus !== 'published'}
									<span class="card-draft">{project.itemStatus}</span>
								{/if}
								<span class="card-foot-spacer"></span>
								<button
									class="icon-btn"
									title="Move up"
									aria-label="Move {project.name} up"
									disabled={pi === 0}
									on:click={() => move(project, 'up')}>↑</button
								>
								<button
									class="icon-btn"
									title="Move down"
									aria-label="Move {project.name} down"
									disabled={pi === group.projects.length - 1}
									on:click={() => move(project, 'down')}>↓</button
								>
								<a
									class="icon-btn"
									href="/admin/cms/open-projects/{project.id}"
									title="Full editor"
									aria-label="Edit {project.name} in full editor"
								>
									✎
								</a>
								<button
									class="icon-btn icon-danger"
									title="Delete"
									aria-label="Delete {project.name}"
									on:click={() => (deleteTarget = project)}>🗑</button
								>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{:else}
		<!-- ── Board view ── -->
		<div class="board">
			{#each PROJECT_STATUSES as s}
				{@const column = boardColumn(s)}
				<div class="board-col">
					<h3 class="board-col-title" style="--col-color: {STATUS_COLORS[s]}">
						{STATUS_LABELS[s]}
						<span class="group-count">{column.length}</span>
					</h3>
					{#each column as project (project.id)}
						{@const progress = taskProgress(project.tasks)}
						<div class="board-card" class:card-saving={savingIds.has(project.id)}>
							<div class="board-card-head">
								<span class="board-card-name">{project.name}</span>
								<span
									class="priority-dot"
									style="--dot-color: {PRIORITY_COLORS[project.priority]}"
									title="Priority: {project.priority}"
								></span>
							</div>
							<span class="board-card-group">{project.group}</span>
							{#if project.tasks.length > 0}
								<div
									class="progress progress-sm"
									title="{progress.done}/{progress.total} tasks done"
								>
									<div class="progress-bar" style="width: {progress.percent}%"></div>
								</div>
								<span class="board-card-tasks">{progress.done}/{progress.total} tasks</span>
							{/if}
							{#if project.blockers}
								<span class="board-card-blocker" title={project.blockers}>⚠ blocked note</span>
							{/if}
							<select
								class="pill-select board-move"
								value={project.projectStatus}
								on:change={(e) => setStatus(project, e.currentTarget.value)}
								aria-label="Move {project.name} to status"
							>
								{#each PROJECT_STATUSES as opt}
									<option value={opt}>{STATUS_LABELS[opt]}</option>
								{/each}
							</select>
						</div>
					{/each}
					{#if column.length === 0}
						<p class="board-empty">—</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Quick Create Modal -->
{#if showCreate}
	<div
		class="modal-overlay"
		on:click|self={() => (showCreate = false)}
		on:keydown={(e) => e.key === 'Escape' && (showCreate = false)}
		role="presentation"
	>
		<div class="modal" role="dialog" aria-modal="true" aria-label="New project">
			<div class="modal-header">
				<h2>New Project</h2>
				<button class="btn-close" on:click={() => (showCreate = false)} aria-label="Close"
					>&times;</button
				>
			</div>
			<div class="modal-body">
				<div class="form-row">
					<div class="form-group">
						<label for="np-name">Name <span class="required">*</span></label>
						<input
							id="np-name"
							type="text"
							bind:value={createForm.name}
							placeholder="Project name"
						/>
					</div>
					<div class="form-group">
						<label for="np-group">Group</label>
						<select id="np-group" bind:value={createForm.group}>
							{#each [...new Set(['*Space', 'Personal', ...allGroups])] as g}
								<option value={g}>{g}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="np-status">Status</label>
						<select id="np-status" bind:value={createForm.status}>
							{#each PROJECT_STATUSES as s}
								<option value={s}>{STATUS_LABELS[s]}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="np-priority">Priority</label>
						<select id="np-priority" bind:value={createForm.priority}>
							{#each PROJECT_PRIORITIES as p}
								<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="form-group">
					<label for="np-desc">Description</label>
					<textarea
						id="np-desc"
						bind:value={createForm.description}
						rows="2"
						placeholder="Short summary..."
					></textarea>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="np-link">Primary link</label>
						<input
							id="np-link"
							type="url"
							bind:value={createForm.primaryLink}
							placeholder="https://..."
						/>
					</div>
					<div class="form-group">
						<label for="np-gh">GitHub URL</label>
						<input
							id="np-gh"
							type="url"
							bind:value={createForm.githubUrl}
							placeholder="https://github.com/..."
						/>
					</div>
				</div>
				<div class="form-group">
					<label for="np-task">First task</label>
					<input
						id="np-task"
						type="text"
						bind:value={createForm.firstTask}
						placeholder="What's next?"
					/>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={() => (showCreate = false)} disabled={creating}
					>Cancel</button
				>
				<button
					class="btn btn-primary"
					on:click={createProject}
					disabled={creating || !createForm.name.trim()}
				>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm -->
{#if deleteTarget}
	<div
		class="modal-overlay"
		on:click|self={() => (deleteTarget = null)}
		on:keydown={(e) => e.key === 'Escape' && (deleteTarget = null)}
		role="presentation"
	>
		<div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Confirm deletion">
			<div class="modal-header">
				<h2>Delete project</h2>
				<button class="btn-close" on:click={() => (deleteTarget = null)} aria-label="Close"
					>&times;</button
				>
			</div>
			<div class="modal-body">
				<p>Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={() => (deleteTarget = null)} disabled={deleting}
					>Cancel</button
				>
				<button class="btn btn-danger" on:click={confirmDelete} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dash {
		width: 100%;
	}

	/* Header */
	.dash-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
		flex-wrap: wrap;
	}

	.dash-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.dash-subtitle {
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		margin-top: 0.25rem;
	}

	.dash-subtitle a {
		color: var(--color-primary);
		text-decoration: none;
	}

	.dash-subtitle a:hover {
		text-decoration: underline;
	}

	.dash-header-actions {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.view-toggle {
		display: inline-flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.view-toggle button {
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border: none;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.view-toggle button.active {
		background: var(--color-primary);
		color: var(--color-background);
	}

	.error-toast {
		background: color-mix(in srgb, var(--color-danger, #dc3545) 12%, var(--color-surface));
		border: 1px solid var(--color-danger, #dc3545);
		color: var(--color-danger, #dc3545);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		margin-bottom: var(--spacing-md);
	}

	/* Stats */
	.stats-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-lg);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 74px;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.stat-static {
		cursor: default;
	}

	button.stat:hover {
		border-color: var(--stat-color, var(--color-primary));
	}

	.stat-active {
		border-color: var(--stat-color, var(--color-primary));
		box-shadow: 0 0 0 1px var(--stat-color, var(--color-primary));
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.stat-colored {
		color: var(--stat-color, var(--color-text));
	}

	.stat-label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-xl);
	}

	.toolbar input[type='search'],
	.toolbar select {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-family: inherit;
	}

	.search-input {
		flex: 1;
		min-width: 200px;
		max-width: 340px;
	}

	.toolbar input:focus,
	.toolbar select:focus {
		border-color: var(--color-primary);
		outline: none;
	}

	.toolbar-check {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		white-space: nowrap;
	}

	.toolbar-check input {
		accent-color: var(--color-primary);
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.toolbar-count {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--spacing-2xl);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-secondary);
	}

	.empty-state h3 {
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}

	/* Groups view */
	.group-section {
		margin-bottom: var(--spacing-xl);
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
	}

	.group-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		padding: 0 0.5em;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
		gap: var(--spacing-md);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-md);
		transition:
			opacity 0.15s,
			border-color 0.15s;
	}

	.card-blocked {
		border-color: color-mix(in srgb, var(--color-danger, #ef4444) 50%, var(--color-border));
	}

	.card-saving {
		opacity: 0.75;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.card-name-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		min-width: 0;
	}

	.card-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text);
		text-decoration: none;
		word-break: break-word;
	}

	a.card-name {
		color: var(--color-primary);
	}

	a.card-name:hover {
		text-decoration: underline;
	}

	.saving-dot {
		color: var(--color-primary);
		font-size: 0.625rem;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}

	.card-controls {
		display: flex;
		gap: var(--spacing-xs);
	}

	.pill-select {
		appearance: none;
		padding: 0.1em 0.6em;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--pill-color, var(--color-text-secondary));
		background: color-mix(in srgb, var(--pill-color, var(--color-text-secondary)) 14%, transparent);
		border: 1px solid
			color-mix(in srgb, var(--pill-color, var(--color-text-secondary)) 30%, transparent);
		cursor: pointer;
	}

	.card-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.card-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.card-links a {
		font-size: 0.75rem;
		color: var(--color-primary);
		text-decoration: none;
	}

	.card-links a:hover {
		text-decoration: underline;
	}

	/* Tasks */
	.progress {
		height: 5px;
		background: color-mix(in srgb, var(--color-border) 60%, transparent);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: var(--spacing-xs);
	}

	.progress-bar {
		height: 100%;
		background: var(--color-success, #22c55e);
		border-radius: 999px;
		transition: width 0.2s ease;
	}

	.task-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.task {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		color: var(--color-text);
	}

	.task:hover {
		background: color-mix(in srgb, var(--color-border) 30%, transparent);
	}

	.task input[type='checkbox'] {
		accent-color: var(--color-success, #22c55e);
		cursor: pointer;
		flex-shrink: 0;
	}

	.task-text {
		flex: 1;
		word-break: break-word;
	}

	.task-done .task-text {
		text-decoration: line-through;
		color: var(--color-text-secondary);
		opacity: 0.6;
	}

	.task-remove {
		visibility: hidden;
		border: none;
		background: none;
		color: var(--color-text-secondary);
		font-size: 0.9375rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
		border-radius: var(--radius-sm);
	}

	.task:hover .task-remove {
		visibility: visible;
	}

	.task-remove:hover {
		color: var(--color-danger, #dc3545);
	}

	.task-add {
		display: flex;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-xs);
	}

	.task-add input {
		flex: 1;
		padding: 0.25rem var(--spacing-sm);
		background: var(--color-background);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-family: inherit;
	}

	.task-add input:focus {
		border-color: var(--color-primary);
		outline: none;
	}

	.task-add button {
		padding: 0 var(--spacing-sm);
		background: var(--color-background);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.9375rem;
	}

	.task-add button:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	/* Blockers */
	.blockers {
		text-align: left;
		font-size: 0.8125rem;
		color: var(--color-warning, #f59e0b);
		padding: 0.25rem 0.5rem;
		border: none;
		border-left: 2px solid var(--color-warning, #f59e0b);
		background: color-mix(in srgb, var(--color-warning, #f59e0b) 8%, transparent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		cursor: pointer;
		font-family: inherit;
	}

	.blockers-add {
		align-self: flex-start;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 0.6875rem;
		cursor: pointer;
		padding: 0;
		opacity: 0.6;
	}

	.blockers-add:hover {
		opacity: 1;
		color: var(--color-warning, #f59e0b);
	}

	.blockers-edit {
		width: 100%;
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-background);
		color: var(--color-text);
		border: 1px solid var(--color-warning, #f59e0b);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-family: inherit;
		resize: vertical;
	}

	/* Card footer */
	.card-foot {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		margin-top: auto;
		padding-top: var(--spacing-xs);
		border-top: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
	}

	.card-meta {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
	}

	.card-draft {
		font-size: 0.625rem;
		text-transform: uppercase;
		color: var(--color-warning, #f59e0b);
		border: 1px solid currentColor;
		border-radius: var(--radius-sm);
		padding: 0 0.4em;
	}

	.card-foot-spacer {
		flex: 1;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.8125rem;
		text-decoration: none;
	}

	.icon-btn:hover:not(:disabled) {
		background: var(--color-background);
		color: var(--color-text);
	}

	.icon-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.icon-danger:hover:not(:disabled) {
		color: var(--color-danger, #dc3545);
	}

	/* Board view */
	.board {
		display: grid;
		grid-template-columns: repeat(5, minmax(180px, 1fr));
		gap: var(--spacing-md);
		overflow-x: auto;
	}

	.board-col {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-sm);
		min-height: 160px;
	}

	.board-col-title {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--col-color, var(--color-text));
		padding-bottom: var(--spacing-xs);
		border-bottom: 2px solid var(--col-color, var(--color-border));
	}

	.board-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
	}

	.board-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-xs);
	}

	.board-card-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
		word-break: break-word;
	}

	.priority-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--dot-color);
		flex-shrink: 0;
	}

	.board-card-group {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
	}

	.progress-sm {
		margin: 0.25rem 0 0 0;
	}

	.board-card-tasks {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
	}

	.board-card-blocker {
		font-size: 0.6875rem;
		color: var(--color-warning, #f59e0b);
	}

	.board-move {
		margin-top: 0.25rem;
		align-self: flex-start;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--color-background);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border-color: var(--color-border);
	}

	.btn-danger {
		background: var(--color-danger, #dc3545);
		color: #fff;
	}

	/* Modal (matches existing admin modal styling) */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--spacing-2xl);
		z-index: 1000;
		overflow-y: auto;
	}

	.modal {
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 560px;
		box-shadow: var(--shadow-lg);
		margin-top: var(--spacing-xl);
	}

	.modal-sm {
		max-width: 420px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.btn-close {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 1.25rem;
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.btn-close:hover {
		background: var(--color-surface);
		color: var(--color-text);
	}

	.modal-body {
		padding: var(--spacing-lg);
		max-height: 65vh;
		overflow-y: auto;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-sm);
		padding: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
	}

	.form-group {
		margin-bottom: var(--spacing-md);
	}

	.form-group label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: var(--spacing-xs);
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		border-color: var(--color-primary);
		outline: none;
	}

	.required {
		color: var(--color-danger, #dc3545);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.board {
			grid-template-columns: repeat(2, minmax(160px, 1fr));
		}
	}

	@media (max-width: 640px) {
		.cards {
			grid-template-columns: 1fr;
		}

		.board {
			grid-template-columns: 1fr;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.toolbar-count {
			margin-left: 0;
		}
	}
</style>
