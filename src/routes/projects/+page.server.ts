import {
	createContentItem,
	getContentTypeBySlug,
	listContentItems,
	syncContentTypes
} from '$lib/services/cms';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type ProjectItem = {
	id: string;
	name: string;
	status: string;
	primaryLink: string | null;
	extraLinks: { label: string; href: string }[];
	tasks: string[];
	completedTasks: string[];
	sortOrder: number;
};

type ProjectGroup = {
	name: string;
	projects: ProjectItem[];
};

const SEED_DATA = [
	{
		group: '*Space',
		project_name: 'starspace.group',
		primary_link: 'https://starspace.group/',
		extra_links: [],
		tasks: ['Rebuild with NebulaKit'],
		completed_tasks: [],
		status: 'active',
		sort_order: 0
	},
	{
		group: '*Space',
		project_name: 'NebulaKit',
		primary_link: 'https://nebulakit.starspace.group/',
		extra_links: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/NebulaKit' }],
		tasks: ['LLMs/Agents Use Agile and TDD'],
		completed_tasks: [],
		status: 'active',
		sort_order: 1
	},
	{
		group: '*Space',
		project_name: 'Athena',
		primary_link: 'https://athena.starspace.group/',
		extra_links: [{ label: 'Whitepaper', href: 'https://athena.starspace.group/whitepaper' }],
		tasks: ['v0.2 of Whitepaper'],
		completed_tasks: [],
		status: 'active',
		sort_order: 2
	},
	{
		group: '*Space',
		project_name: 'SpaceBot',
		primary_link: 'https://spacebot.starspace.group/',
		extra_links: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/spacebot' }],
		tasks: ['Local Runners'],
		completed_tasks: [],
		status: 'active',
		sort_order: 3
	},
	{
		group: '*Space',
		project_name: 'Ammoura',
		primary_link: 'https://ammoura.me/',
		extra_links: [],
		tasks: ['Tenants'],
		completed_tasks: [],
		status: 'active',
		sort_order: 4
	},
	{
		group: '*Space',
		project_name: 'Nabu',
		primary_link: null,
		extra_links: [],
		tasks: ['Content generation', 'Content publishing'],
		completed_tasks: [],
		status: 'active',
		sort_order: 5
	},
	{
		group: '*Space',
		project_name: 'Dashboard',
		primary_link: 'https://dashboard.starspace.group',
		extra_links: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/dashboard' }],
		tasks: ['Fix GitHub and Google Analytics'],
		completed_tasks: [],
		status: 'active',
		sort_order: 6
	},
	{
		group: '*Space',
		project_name: 'Game',
		primary_link: 'https://game.starspace.group',
		extra_links: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/game' }],
		tasks: ['Finish end-game', 'Fix glitches'],
		completed_tasks: [],
		status: 'active',
		sort_order: 7
	},
	{
		group: '*Space',
		project_name: 'Guides',
		primary_link: null,
		extra_links: [],
		tasks: ['Finish 0.1 of guides and publish'],
		completed_tasks: [],
		status: 'active',
		sort_order: 8
	},
	{
		group: '*Space',
		project_name: 'Convey.land',
		primary_link: null,
		extra_links: [],
		tasks: ['Initialize project with NebulaKit'],
		completed_tasks: [],
		status: 'active',
		sort_order: 9
	},
	{
		group: 'Personal',
		project_name: 'davis9001.dev',
		primary_link: 'https://davis9001.dev/',
		extra_links: [
			{
				label: 'GitHub',
				href: 'https://github.com/starspacegroup/davis9001.dev-sveltekit'
			}
		],
		tasks: ['Fix Spotify'],
		completed_tasks: [],
		status: 'active',
		sort_order: 0
	},
	{
		group: 'Personal',
		project_name: 'AgapeVerse',
		primary_link: 'https://agapeverse.app/',
		extra_links: [],
		tasks: ['Finish rebuild with SvelteKit'],
		completed_tasks: [],
		status: 'active',
		sort_order: 1
	},
	{
		group: 'Personal',
		project_name: 'Music (davis9001)',
		primary_link: null,
		extra_links: [],
		tasks: ['Create 11 songs'],
		completed_tasks: [],
		status: 'active',
		sort_order: 2
	},
	{
		group: 'Personal',
		project_name: 'Arizona Iced VST',
		primary_link: null,
		extra_links: [],
		tasks: ['Add AI feature: Describe synth/effect type and it will build it for you'],
		completed_tasks: [],
		status: 'active',
		sort_order: 3
	},
	{
		group: 'Personal',
		project_name: 'Abbot',
		primary_link: null,
		extra_links: [],
		tasks: ['Build on Linux'],
		completed_tasks: [],
		status: 'active',
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
				fields: {
					group: seed.group,
					project_name: seed.project_name,
					primary_link: seed.primary_link,
					extra_links: seed.extra_links,
					tasks: seed.tasks,
					completed_tasks: seed.completed_tasks,
					status: seed.status,
					sort_order: seed.sort_order
				}
			});
		}
	}

	const result = await listContentItems(db, contentType.id, {
		status: 'published',
		pageSize: 200,
		sortBy: 'created_at',
		sortDirection: 'asc'
	});

	// Group and sort by sort_order field
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
			status: (f.status as string) || 'active',
			primaryLink: (f.primary_link as string | null) || null,
			extraLinks: (f.extra_links as { label: string; href: string }[]) || [],
			tasks: (f.tasks as string[]) || [],
			completedTasks: (f.completed_tasks as string[]) || [],
			sortOrder: typeof f.sort_order === 'number' ? (f.sort_order as number) : 999
		});
	}

	// Sort projects within each group by sort_order
	for (const projects of groupMap.values()) {
		projects.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	// Preserve group order: *Space first, Personal second, others after
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
