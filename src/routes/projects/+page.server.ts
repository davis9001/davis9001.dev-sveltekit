import {
	createContentItem,
	getContentTypeBySlug,
	listContentItems,
	syncContentTypes
} from '$lib/services/cms';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export type Task = { text: string; done: boolean };

export type ProjectItem = {
	id: string;
	name: string;
	projectStatus: string;
	priority: string;
	description: string;
	primaryLink: string | null;
	githubUrl: string | null;
	extraLinks: { label: string; href: string }[];
	tasks: Task[];
	blockers: string;
	sortOrder: number;
};

export type ProjectGroup = {
	name: string;
	projects: ProjectItem[];
};

/** Normalise the tasks field — handles legacy string[] and new {text,done}[] */
function normalizeTasks(
	tasks: unknown,
	completedTasks: unknown
): Task[] {
	const rawTasks: any[] = Array.isArray(tasks) ? tasks : [];
	const normalized: Task[] = rawTasks.map((t) =>
		typeof t === 'string' ? { text: t, done: false } : { text: String(t.text ?? ''), done: Boolean(t.done) }
	);

	const rawCompleted: any[] = Array.isArray(completedTasks) ? completedTasks : [];
	const completed: Task[] = rawCompleted.map((t) =>
		typeof t === 'string' ? { text: t, done: true } : { text: String(t.text ?? ''), done: true }
	);

	return [...normalized, ...completed];
}

const SEED_DATA = [
	{
		group: '*Space',
		project_name: 'starspace.group',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: 'https://starspace.group/',
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Rebuild with NebulaKit', done: false }],
		blockers: '',
		sort_order: 0
	},
	{
		group: '*Space',
		project_name: 'NebulaKit',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: 'https://nebulakit.starspace.group/',
		github_url: 'https://github.com/starspacegroup/NebulaKit',
		extra_links: [],
		tasks: [{ text: 'LLMs/Agents Use Agile and TDD', done: false }],
		blockers: '',
		sort_order: 1
	},
	{
		group: '*Space',
		project_name: 'Athena',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: 'https://athena.starspace.group/',
		github_url: null,
		extra_links: [{ label: 'Whitepaper', href: 'https://athena.starspace.group/whitepaper' }],
		tasks: [{ text: 'v0.2 of Whitepaper', done: false }],
		blockers: '',
		sort_order: 2
	},
	{
		group: '*Space',
		project_name: 'SpaceBot',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: 'https://spacebot.starspace.group/',
		github_url: 'https://github.com/starspacegroup/spacebot',
		extra_links: [],
		tasks: [{ text: 'Local Runners', done: false }],
		blockers: '',
		sort_order: 3
	},
	{
		group: '*Space',
		project_name: 'Ammoura',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: 'https://ammoura.me/',
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Tenants', done: false }],
		blockers: '',
		sort_order: 4
	},
	{
		group: '*Space',
		project_name: 'Nabu',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [
			{ text: 'Content generation', done: false },
			{ text: 'Content publishing', done: false }
		],
		blockers: '',
		sort_order: 5
	},
	{
		group: '*Space',
		project_name: 'Dashboard',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: 'https://dashboard.starspace.group',
		github_url: 'https://github.com/starspacegroup/dashboard',
		extra_links: [],
		tasks: [{ text: 'Fix GitHub and Google Analytics', done: false }],
		blockers: '',
		sort_order: 6
	},
	{
		group: '*Space',
		project_name: 'Game',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: 'https://game.starspace.group',
		github_url: 'https://github.com/starspacegroup/game',
		extra_links: [],
		tasks: [
			{ text: 'Finish end-game', done: false },
			{ text: 'Fix glitches', done: false }
		],
		blockers: '',
		sort_order: 7
	},
	{
		group: '*Space',
		project_name: 'Guides',
		status: 'active',
		priority: 'low',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Finish 0.1 of guides and publish', done: false }],
		blockers: '',
		sort_order: 8
	},
	{
		group: '*Space',
		project_name: 'Convey.land',
		status: 'planning',
		priority: 'low',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Initialize project with NebulaKit', done: false }],
		blockers: '',
		sort_order: 9
	},
	{
		group: 'Personal',
		project_name: 'davis9001.dev',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: 'https://davis9001.dev/',
		github_url: 'https://github.com/starspacegroup/davis9001.dev-sveltekit',
		extra_links: [],
		tasks: [{ text: 'Fix Spotify', done: false }],
		blockers: '',
		sort_order: 0
	},
	{
		group: 'Personal',
		project_name: 'AgapeVerse',
		status: 'active',
		priority: 'high',
		description: '',
		primary_link: 'https://agapeverse.app/',
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Finish rebuild with SvelteKit', done: false }],
		blockers: '',
		sort_order: 1
	},
	{
		group: 'Personal',
		project_name: 'Music (davis9001)',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Create 11 songs', done: false }],
		blockers: '',
		sort_order: 2
	},
	{
		group: 'Personal',
		project_name: 'Arizona Iced VST',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [
			{ text: 'Add AI feature: Describe synth/effect type and it will build it for you', done: false }
		],
		blockers: '',
		sort_order: 3
	},
	{
		group: 'Personal',
		project_name: 'Abbot',
		status: 'active',
		priority: 'medium',
		description: '',
		primary_link: null,
		github_url: null,
		extra_links: [],
		tasks: [{ text: 'Build on Linux', done: false }],
		blockers: '',
		sort_order: 4
	}
];

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	await syncContentTypes(db);

	const contentType = await getContentTypeBySlug(db, 'open-projects');
	if (!contentType) {
		throw error(500, 'open-projects content type not found');
	}

	// Seed on first run if no items exist
	const existing = await listContentItems(db, contentType.id, { pageSize: 1 });
	if (existing.total === 0) {
		for (const seed of SEED_DATA) {
			await createContentItem(db, {
				contentTypeSlug: 'open-projects',
				title: seed.project_name,
				status: 'published',
				fields: seed
			});
		}
	}

	const result = await listContentItems(db, contentType.id, {
		status: 'published',
		pageSize: 200,
		sortBy: 'created_at',
		sortDirection: 'asc'
	});

	const groupMap = new Map<string, ProjectItem[]>();

	for (const item of result.items) {
		const f = item.fields;
		const groupName = (f.group as string) || 'Other';
		if (!groupMap.has(groupName)) {
			groupMap.set(groupName, []);
		}

		groupMap.get(groupName)!.push({
			id: item.id,
			name: (f.project_name as string) || item.title,
			projectStatus: (f.status as string) || 'active',
			priority: (f.priority as string) || 'medium',
			description: (f.description as string) || '',
			primaryLink: (f.primary_link as string | null) || null,
			githubUrl: (f.github_url as string | null) || null,
			extraLinks: (f.extra_links as { label: string; href: string }[]) || [],
			tasks: normalizeTasks(f.tasks, f.completed_tasks),
			blockers: (f.blockers as string) || '',
			sortOrder: typeof f.sort_order === 'number' ? (f.sort_order as number) : 999
		});
	}

	for (const projects of groupMap.values()) {
		projects.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	const groupOrder = ['*Space', 'Personal'];
	const groups: ProjectGroup[] = [];
	for (const name of groupOrder) {
		if (groupMap.has(name)) {
			groups.push({ name, projects: groupMap.get(name)! });
			groupMap.delete(name);
		}
	}
	for (const [name, projects] of groupMap) {
		groups.push({ name, projects });
	}

	return { groups };
};
