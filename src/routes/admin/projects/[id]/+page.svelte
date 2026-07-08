<!--
  Admin Project Edit Page

  Full-field editor for a single open project. The dashboard handles quick
  inline edits; this page covers everything: identity, links, extra links,
  tasks, blockers, and ordering.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		PROJECT_PRIORITIES,
		PROJECT_STATUS_LABELS as STATUS_LABELS,
		PROJECT_STATUSES
	} from '$lib/projects/types';
	import type { ExtraLink, Task } from '$lib/projects/types';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Editable form state, seeded from the loaded project
	let form = {
		group: data.project.group,
		name: data.project.name,
		status: data.project.status,
		priority: data.project.priority,
		description: data.project.description,
		primaryLink: data.project.primaryLink ?? '',
		githubUrl: data.project.githubUrl ?? '',
		extraLinks: data.project.extraLinks.map((l: ExtraLink) => ({ ...l })),
		tasks: data.project.tasks.map((t: Task) => ({ ...t })),
		blockers: data.project.blockers,
		sortOrder: data.project.sortOrder
	};

	let saving = false;
	let saved = false;
	let errorMessage = '';
	let confirmingDelete = false;
	let deleting = false;
	let savedTimer: ReturnType<typeof setTimeout> | null = null;

	function addExtraLink() {
		form.extraLinks = [...form.extraLinks, { label: '', href: '' }];
	}

	function removeExtraLink(index: number) {
		form.extraLinks = form.extraLinks.filter((_, i) => i !== index);
	}

	function addTask() {
		form.tasks = [...form.tasks, { text: '', done: false, status: 'planning', priority: 'medium' }];
	}

	function removeTask(index: number) {
		form.tasks = form.tasks.filter((_, i) => i !== index);
	}

	async function save() {
		errorMessage = '';
		if (!form.name.trim() || !form.group.trim()) {
			errorMessage = 'Name and group are required.';
			return;
		}

		saving = true;
		try {
			const res = await fetch(`/api/admin/projects/${data.project.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					group: form.group.trim(),
					name: form.name.trim(),
					status: form.status,
					priority: form.priority,
					description: form.description,
					primaryLink: form.primaryLink.trim() || null,
					githubUrl: form.githubUrl.trim() || null,
					extraLinks: form.extraLinks.filter((l) => l.label.trim() && l.href.trim()),
					tasks: form.tasks.filter((t) => t.text.trim()),
					blockers: form.blockers,
					sortOrder: form.sortOrder
				})
			});

			if (res.ok) {
				saved = true;
				if (savedTimer) clearTimeout(savedTimer);
				savedTimer = setTimeout(() => (saved = false), 2500);
			} else {
				const errData = await res.json().catch(() => ({}));
				errorMessage = errData.message || 'Failed to save project';
			}
		} catch {
			errorMessage = 'Failed to save project';
		} finally {
			saving = false;
		}
	}

	async function deleteProject() {
		deleting = true;
		try {
			const res = await fetch(`/api/admin/projects/${data.project.id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto('/admin/projects');
			} else {
				errorMessage = 'Failed to delete project';
				confirmingDelete = false;
			}
		} catch {
			errorMessage = 'Failed to delete project';
			confirmingDelete = false;
		} finally {
			deleting = false;
		}
	}
</script>

<SEO
	title="Edit {data.project.name} - Projects - Admin"
	description="Edit open project."
	path="/admin/projects/{data.project.id}"
/>

<div class="edit-page">
	<div class="edit-header">
		<div>
			<a class="back-link" href="/admin/projects">← Projects</a>
			<h1>Edit project</h1>
		</div>
		<div class="edit-actions">
			{#if saved}
				<span class="saved-flash" role="status">Saved ✓</span>
			{/if}
			<button class="btn btn-danger-outline" on:click={() => (confirmingDelete = true)}>
				Delete
			</button>
			<button class="btn btn-primary" on:click={save} disabled={saving}>
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>

	{#if errorMessage}
		<div class="error-toast" role="alert">{errorMessage}</div>
	{/if}

	<div class="form-card">
		<div class="form-row">
			<div class="form-group">
				<label for="ep-name">Name <span class="required">*</span></label>
				<input id="ep-name" type="text" bind:value={form.name} placeholder="Project name" />
			</div>
			<div class="form-group">
				<label for="ep-group">Group <span class="required">*</span></label>
				<input id="ep-group" type="text" bind:value={form.group} list="group-options" />
				<datalist id="group-options">
					{#each data.groups as g}
						<option value={g}></option>
					{/each}
				</datalist>
			</div>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="ep-status">Status</label>
				<select id="ep-status" bind:value={form.status}>
					{#each PROJECT_STATUSES as s}
						<option value={s}>{STATUS_LABELS[s]}</option>
					{/each}
				</select>
			</div>
			<div class="form-group">
				<label for="ep-priority">Priority</label>
				<select id="ep-priority" bind:value={form.priority}>
					{#each PROJECT_PRIORITIES as p}
						<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
					{/each}
				</select>
			</div>
			<div class="form-group form-group-sm">
				<label for="ep-order">Sort order</label>
				<input id="ep-order" type="number" bind:value={form.sortOrder} min="0" />
			</div>
		</div>

		<div class="form-group">
			<label for="ep-desc">Description</label>
			<textarea id="ep-desc" bind:value={form.description} rows="3" placeholder="Short summary...">
			</textarea>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="ep-link">Primary link</label>
				<input id="ep-link" type="url" bind:value={form.primaryLink} placeholder="https://..." />
			</div>
			<div class="form-group">
				<label for="ep-gh">GitHub URL</label>
				<input
					id="ep-gh"
					type="url"
					bind:value={form.githubUrl}
					placeholder="https://github.com/..."
				/>
			</div>
		</div>

		<fieldset class="form-group">
			<legend>Extra links</legend>
			{#each form.extraLinks as link, i}
				<div class="row-editor">
					<input
						type="text"
						bind:value={link.label}
						placeholder="Label"
						aria-label="Extra link {i + 1} label"
					/>
					<input
						type="url"
						bind:value={link.href}
						placeholder="https://..."
						aria-label="Extra link {i + 1} URL"
					/>
					<button
						class="icon-btn icon-danger"
						title="Remove link"
						aria-label="Remove extra link {i + 1}"
						on:click={() => removeExtraLink(i)}>×</button
					>
				</div>
			{/each}
			<button class="btn-link" on:click={addExtraLink}>+ Add link</button>
		</fieldset>

		<fieldset class="form-group">
			<legend>Tasks</legend>
			{#each form.tasks as task, i}
				<div class="row-editor">
					<select
						class="task-status-select"
						value={task.status}
						on:change={(e) => {
							const status = e.currentTarget.value as (typeof PROJECT_STATUSES)[number];
							form.tasks[i] = { ...task, status, done: status === 'complete' };
						}}
						aria-label="Task {i + 1} status"
					>
						{#each PROJECT_STATUSES as s}
							<option value={s}>{STATUS_LABELS[s]}</option>
						{/each}
					</select>
					<select
						class="task-priority-select"
						value={task.priority}
						on:change={(e) => {
							const priority = e.currentTarget.value as (typeof PROJECT_PRIORITIES)[number];
							form.tasks[i] = { ...task, priority };
						}}
						aria-label="Task {i + 1} priority"
					>
						{#each PROJECT_PRIORITIES as p}
							<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
						{/each}
					</select>
					<input
						type="text"
						bind:value={task.text}
						placeholder="Task..."
						aria-label="Task {i + 1} text"
						class="task-text-input"
					/>
					<button
						class="icon-btn icon-danger"
						title="Remove task"
						aria-label="Remove task {i + 1}"
						on:click={() => removeTask(i)}>×</button
					>
				</div>
			{/each}
			<button class="btn-link" on:click={addTask}>+ Add task</button>
		</fieldset>

		<div class="form-group">
			<label for="ep-blockers">Blockers / notes</label>
			<textarea id="ep-blockers" bind:value={form.blockers} rows="2" placeholder="Blockers...">
			</textarea>
		</div>
	</div>
</div>

{#if confirmingDelete}
	<div
		class="modal-overlay"
		on:click|self={() => (confirmingDelete = false)}
		on:keydown={(e) => e.key === 'Escape' && (confirmingDelete = false)}
		role="presentation"
	>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Confirm deletion">
			<div class="modal-header">
				<h2>Delete project</h2>
				<button class="btn-close" on:click={() => (confirmingDelete = false)} aria-label="Close"
					>&times;</button
				>
			</div>
			<div class="modal-body">
				<p>Delete <strong>{data.project.name}</strong>? This cannot be undone.</p>
			</div>
			<div class="modal-footer">
				<button
					class="btn btn-secondary"
					on:click={() => (confirmingDelete = false)}
					disabled={deleting}>Cancel</button
				>
				<button class="btn btn-danger" on:click={deleteProject} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.edit-page {
		width: 100%;
		max-width: 760px;
	}

	.edit-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
		flex-wrap: wrap;
	}

	.edit-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.back-link {
		display: inline-block;
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		text-decoration: none;
		margin-bottom: 0.25rem;
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	.edit-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.saved-flash {
		color: var(--color-success, #22c55e);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.error-toast {
		padding: var(--spacing-sm) var(--spacing-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-danger, #ef4444);
		border-radius: var(--radius-md);
		color: var(--color-danger, #ef4444);
		font-size: 0.875rem;
		margin-bottom: var(--spacing-md);
	}

	.form-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.form-row {
		display: flex;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.form-row .form-group {
		flex: 1;
		min-width: 180px;
	}

	.form-group-sm {
		max-width: 120px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		border: none;
		padding: 0;
		margin: 0;
	}

	.form-group label,
	.form-group legend {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.form-group legend {
		margin-bottom: 0.375rem;
	}

	.required {
		color: var(--color-danger, #ef4444);
	}

	.form-group input[type='text'],
	.form-group input[type='url'],
	.form-group input[type='number'],
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: 0.875rem;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.row-editor {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.row-editor input[type='text'],
	.row-editor input[type='url'] {
		flex: 1;
	}

	.task-status-select,
	.task-priority-select {
		flex: none;
		max-width: 8.5rem;
	}

	.task-text-input {
		flex: 1;
	}

	.icon-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		width: 1.75rem;
		height: 1.75rem;
		line-height: 1;
		flex: none;
	}

	.icon-btn:hover {
		background: var(--color-surface-hover);
	}

	.icon-danger:hover {
		color: var(--color-danger, #ef4444);
		border-color: var(--color-danger, #ef4444);
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: var(--color-background);
		border-color: var(--color-border);
		color: var(--color-text);
	}

	.btn-danger {
		background: var(--color-danger, #ef4444);
		color: white;
	}

	.btn-danger-outline {
		background: none;
		border-color: var(--color-danger, #ef4444);
		color: var(--color-danger, #ef4444);
	}

	.btn-danger-outline:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.8125rem;
		padding: 0;
		text-align: left;
	}

	.btn-link:hover {
		text-decoration: underline;
	}

	.btn-close {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 1.5rem;
		cursor: pointer;
		line-height: 1;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--spacing-md);
	}

	.modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 420px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.modal-body {
		padding: var(--spacing-lg);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-sm);
		padding: var(--spacing-md) var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}
</style>
