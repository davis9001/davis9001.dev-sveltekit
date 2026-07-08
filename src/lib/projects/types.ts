/**
 * Open Projects — shared types
 *
 * The single source of truth for project shapes used by the D1 service,
 * the admin dashboard, the public page, and both APIs.
 */

export type ProjectStatus = 'active' | 'planning' | 'paused' | 'blocked' | 'complete';
export type ProjectPriority = 'high' | 'medium' | 'low';

/**
 * A project task. Tasks flow through the same statuses as projects (the
 * admin board is a task kanban); `done` is kept in sync with
 * `status === 'complete'` and is what the public API exposes. `priority`
 * is an admin-only concern (like project priority) — never exposed publicly.
 *
 * The `github*` fields and `updatedAt` are optional, admin-only sync
 * bookkeeping for GitHub Projects v2 (see $lib/github) — absence of
 * `githubItemId` means the task isn't linked to a board item. None of these
 * ever appear in the public API/page shape (see PublicTask below).
 */
export type Task = {
	text: string;
	done: boolean;
	status: ProjectStatus;
	priority: ProjectPriority;
	/** ProjectV2Item node id — presence means this task is linked to a board item */
	githubItemId?: string;
	/** Issue node id, for GraphQL mutations */
	githubIssueId?: string;
	/** Issue number, for REST calls and the issue URL */
	githubIssueNumber?: number;
	/** ISO8601 — set on any local edit or when a pull applies a remote value; the conflict-resolution key */
	updatedAt?: string;
};

export type ExtraLink = { label: string; href: string };

/** Workflow order — drives column order on the board and select options */
export const PROJECT_STATUSES: ProjectStatus[] = [
	'planning',
	'active',
	'paused',
	'blocked',
	'complete'
];

export const PROJECT_PRIORITIES: ProjectPriority[] = ['high', 'medium', 'low'];

/** Board columns — the flow board omits Paused (admin and public boards) */
export const BOARD_STATUSES: ProjectStatus[] = PROJECT_STATUSES.filter((s) => s !== 'paused');

/** Display labels ('active' is stored for API compatibility, shown as In Progress) */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	planning: 'Planning',
	active: 'In Progress',
	paused: 'Paused',
	blocked: 'Blocked',
	complete: 'Done'
};

/** Status accent colors (CSS custom properties with fallbacks) */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
	planning: 'var(--color-primary)',
	active: 'var(--color-success, #22c55e)',
	paused: 'var(--color-warning, #f59e0b)',
	blocked: 'var(--color-danger, #ef4444)',
	complete: 'var(--color-text-secondary)'
};

export interface OpenProject {
	id: string;
	group: string;
	name: string;
	status: ProjectStatus;
	priority: ProjectPriority;
	description: string;
	primaryLink: string | null;
	githubUrl: string | null;
	extraLinks: ExtraLink[];
	tasks: Task[];
	blockers: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	/** Raw pasted GitHub Projects v2 board URL (e.g. github.com/orgs/x/projects/3) */
	githubProjectUrl: string | null;
	/** Resolved ProjectV2 GraphQL node id, set once linking succeeds */
	githubProjectId: string | null;
	githubSyncEnabled: boolean;
	githubLastSyncedAt: string | null;
	githubLastSyncError: string | null;
	/** Whether the linked board has a custom field literally named "Priority" */
	githubPriorityFieldFound: boolean;
}

/**
 * Create/patch input — camelCase, all optional except where the API enforces.
 * `githubProjectId`/`githubLastSyncedAt`/`githubLastSyncError`/
 * `githubPriorityFieldFound` are server-derived: internal code (the link/
 * sync routes, the push-on-save job) sets them by building this shape
 * directly, but `validateProjectInput` — the sole gatekeeper for untrusted
 * request bodies — never populates them from raw JSON. Only
 * `githubProjectUrl`/`githubSyncEnabled` are accepted from a request body.
 */
export interface OpenProjectInput {
	group?: string;
	name?: string;
	status?: ProjectStatus;
	priority?: ProjectPriority;
	description?: string;
	primaryLink?: string | null;
	githubUrl?: string | null;
	extraLinks?: ExtraLink[];
	tasks?: Task[];
	blockers?: string;
	sortOrder?: number;
	githubProjectUrl?: string | null;
	githubProjectId?: string | null;
	githubSyncEnabled?: boolean;
	githubLastSyncedAt?: string | null;
	githubLastSyncError?: string | null;
	githubPriorityFieldFound?: boolean;
}

export interface ProjectGroup {
	name: string;
	projects: OpenProject[];
}

/** The frozen public API/page shape — no id, no sortOrder */
/** The task shape exposed publicly — no internal status field */
export type PublicTask = { text: string; done: boolean };

export interface PublicProject {
	name: string;
	status: ProjectStatus;
	priority: ProjectPriority;
	description: string;
	primaryLink: string | null;
	githubUrl: string | null;
	extraLinks: ExtraLink[];
	tasks: PublicTask[];
	blockers: string;
}

export interface PublicProjectGroup {
	name: string;
	projects: PublicProject[];
}
