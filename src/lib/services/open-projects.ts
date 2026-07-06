/**
 * Open Projects service
 *
 * D1 data access for the open_projects table. All functions take a
 * D1Database instance as the first parameter, matching the cms service
 * conventions. Row JSON columns (tasks, extra_links) are parsed
 * defensively — malformed data degrades to empty arrays, never throws.
 */

import type { OpenProject, OpenProjectInput } from '$lib/projects/types';
import {
	asPriority,
	asProjectStatus,
	normalizeExtraLinks,
	normalizeTasks
} from '$lib/projects/utils';
import type { D1Database } from '@cloudflare/workers-types';

interface OpenProjectRow {
	id: string;
	group_name: string;
	name: string;
	status: string;
	priority: string;
	description: string;
	primary_link: string | null;
	github_url: string | null;
	extra_links: string;
	tasks: string;
	blockers: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

function parseJsonArray(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return [];
	}
}

function rowToProject(row: OpenProjectRow): OpenProject {
	return {
		id: row.id,
		group: row.group_name,
		name: row.name,
		status: asProjectStatus(row.status),
		priority: asPriority(row.priority),
		description: row.description ?? '',
		primaryLink: row.primary_link,
		githubUrl: row.github_url,
		extraLinks: normalizeExtraLinks(parseJsonArray(row.extra_links)),
		tasks: normalizeTasks(parseJsonArray(row.tasks)),
		blockers: row.blockers ?? '',
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/** All projects, ordered by group then sort order */
export async function listOpenProjects(db: D1Database): Promise<OpenProject[]> {
	const result = await db
		.prepare('SELECT * FROM open_projects ORDER BY group_name, sort_order, name')
		.all<OpenProjectRow>();

	return (result.results || []).map(rowToProject);
}

/** A single project by id, or null */
export async function getOpenProject(db: D1Database, id: string): Promise<OpenProject | null> {
	const row = await db
		.prepare('SELECT * FROM open_projects WHERE id = ?')
		.bind(id)
		.first<OpenProjectRow>();

	return row ? rowToProject(row) : null;
}

/**
 * Create a project. Requires group and name; everything else defaults.
 * When sortOrder is omitted the project is appended at the end of its group.
 */
export async function createOpenProject(
	db: D1Database,
	input: OpenProjectInput & { group: string; name: string }
): Promise<OpenProject> {
	const id = crypto.randomUUID();

	let sortOrder = input.sortOrder;
	if (typeof sortOrder !== 'number') {
		const row = await db
			.prepare(
				'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM open_projects WHERE group_name = ?'
			)
			.bind(input.group)
			.first<{ next: number }>();
		sortOrder = row?.next ?? 0;
	}

	await db
		.prepare(
			`INSERT INTO open_projects
				(id, group_name, name, status, priority, description, primary_link, github_url, extra_links, tasks, blockers, sort_order)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.group,
			input.name,
			input.status ?? 'active',
			input.priority ?? 'medium',
			input.description ?? '',
			input.primaryLink ?? null,
			input.githubUrl ?? null,
			JSON.stringify(input.extraLinks ?? []),
			JSON.stringify(input.tasks ?? []),
			input.blockers ?? '',
			sortOrder
		)
		.run();

	const created = await getOpenProject(db, id);
	if (!created) {
		throw new Error('Failed to create project');
	}
	return created;
}

/** Column mapping for patchable fields */
const PATCH_COLUMNS: Record<string, { column: string; serialize?: (v: unknown) => unknown }> = {
	group: { column: 'group_name' },
	name: { column: 'name' },
	status: { column: 'status' },
	priority: { column: 'priority' },
	description: { column: 'description' },
	primaryLink: { column: 'primary_link' },
	githubUrl: { column: 'github_url' },
	extraLinks: { column: 'extra_links', serialize: (v) => JSON.stringify(v ?? []) },
	tasks: { column: 'tasks', serialize: (v) => JSON.stringify(v ?? []) },
	blockers: { column: 'blockers' },
	sortOrder: { column: 'sort_order' }
};

/**
 * Partially update a project. Returns the fresh row, or null when the id
 * does not exist. An empty patch still bumps updated_at.
 */
export async function updateOpenProject(
	db: D1Database,
	id: string,
	patch: OpenProjectInput
): Promise<OpenProject | null> {
	const existing = await db
		.prepare('SELECT id FROM open_projects WHERE id = ?')
		.bind(id)
		.first<{ id: string }>();
	if (!existing) {
		return null;
	}

	const sets: string[] = [];
	const values: unknown[] = [];
	for (const [key, spec] of Object.entries(PATCH_COLUMNS)) {
		if (key in patch && (patch as Record<string, unknown>)[key] !== undefined) {
			const raw = (patch as Record<string, unknown>)[key];
			sets.push(`${spec.column} = ?`);
			values.push(spec.serialize ? spec.serialize(raw) : raw);
		}
	}
	sets.push('updated_at = CURRENT_TIMESTAMP');

	await db
		.prepare(`UPDATE open_projects SET ${sets.join(', ')} WHERE id = ?`)
		.bind(...values, id)
		.run();

	return getOpenProject(db, id);
}

/** Delete a project. Returns false when the id does not exist. */
export async function deleteOpenProject(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM open_projects WHERE id = ?').bind(id).run();

	return (result.meta?.changes || 0) > 0;
}

/** Apply a set of sort-order updates atomically in one batch */
export async function reorderOpenProjects(
	db: D1Database,
	updates: { id: string; sortOrder: number }[]
): Promise<number> {
	if (updates.length === 0) {
		return 0;
	}

	await db.batch(
		updates.map((u) =>
			db
				.prepare(
					'UPDATE open_projects SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
				)
				.bind(u.sortOrder, u.id)
		)
	);

	return updates.length;
}
