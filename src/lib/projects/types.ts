/**
 * Open Projects — shared types
 *
 * The single source of truth for project shapes used by the D1 service,
 * the admin dashboard, the public page, and both APIs.
 */

export type Task = { text: string; done: boolean };

export type ExtraLink = { label: string; href: string };

export type ProjectStatus = 'active' | 'planning' | 'paused' | 'blocked' | 'complete';
export type ProjectPriority = 'high' | 'medium' | 'low';

/** Workflow order — drives column order on the board and select options */
export const PROJECT_STATUSES: ProjectStatus[] = [
	'planning',
	'active',
	'paused',
	'blocked',
	'complete'
];

export const PROJECT_PRIORITIES: ProjectPriority[] = ['high', 'medium', 'low'];

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
}

/** Create/patch input — camelCase, all optional except where the API enforces */
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
}

export interface ProjectGroup {
	name: string;
	projects: OpenProject[];
}

/** The frozen public API/page shape — no id, no sortOrder */
export interface PublicProject {
	name: string;
	status: ProjectStatus;
	priority: ProjectPriority;
	description: string;
	primaryLink: string | null;
	githubUrl: string | null;
	extraLinks: ExtraLink[];
	tasks: Task[];
	blockers: string;
}

export interface PublicProjectGroup {
	name: string;
	projects: PublicProject[];
}
