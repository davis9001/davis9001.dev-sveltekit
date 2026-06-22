import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/projects/+page.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockData: any = {
	groups: [
		{
			name: '*Space',
			projects: [
				{
					id: '1',
					name: 'starspace.group',
					status: 'active',
					primaryLink: 'https://starspace.group/',
					extraLinks: [],
					tasks: ['Rebuild with NebulaKit'],
					completedTasks: [],
					sortOrder: 0
				},
				{
					id: '2',
					name: 'NebulaKit',
					status: 'active',
					primaryLink: 'https://nebulakit.starspace.group/',
					extraLinks: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/NebulaKit' }],
					tasks: ['LLMs/Agents Use Agile and TDD'],
					completedTasks: [],
					sortOrder: 1
				},
				{
					id: '3',
					name: 'SpaceBot',
					status: 'active',
					primaryLink: 'https://spacebot.starspace.group/',
					extraLinks: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/spacebot' }],
					tasks: ['Local Runners'],
					completedTasks: [],
					sortOrder: 3
				},
				{
					id: '4',
					name: 'Dashboard',
					status: 'active',
					primaryLink: 'https://dashboard.starspace.group',
					extraLinks: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/dashboard' }],
					tasks: ['Fix GitHub and Google Analytics'],
					completedTasks: [],
					sortOrder: 6
				},
				{
					id: '5',
					name: 'Game',
					status: 'active',
					primaryLink: 'https://game.starspace.group',
					extraLinks: [{ label: 'GitHub', href: 'https://github.com/starspacegroup/game' }],
					tasks: ['Finish end-game', 'Fix glitches'],
					completedTasks: [],
					sortOrder: 7
				}
			]
		},
		{
			name: 'Personal',
			projects: [
				{
					id: '6',
					name: 'davis9001.dev',
					status: 'active',
					primaryLink: 'https://davis9001.dev/',
					extraLinks: [
						{
							label: 'GitHub',
							href: 'https://github.com/starspacegroup/davis9001.dev-sveltekit'
						}
					],
					tasks: ['Fix Spotify'],
					completedTasks: [],
					sortOrder: 0
				},
				{
					id: '7',
					name: 'Arizona Iced VST',
					status: 'active',
					primaryLink: null,
					extraLinks: [],
					tasks: ['Add AI feature: Describe synth/effect type and it will build it for you'],
					completedTasks: [],
					sortOrder: 3
				}
			]
		}
	]
};

describe('Projects Page', () => {
	it('should render the page title', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: /open projects/i })).toBeInTheDocument();
	});

	it('should render top-level initiative groups', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: /\*space/i })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /personal/i })).toBeInTheDocument();
	});

	it('should include key active projects and tasks', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('link', { name: 'starspace.group' })).toHaveAttribute(
			'href',
			'https://starspace.group/'
		);
		expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
			'href',
			'https://dashboard.starspace.group'
		);
		expect(screen.getByRole('link', { name: 'Game' })).toHaveAttribute(
			'href',
			'https://game.starspace.group'
		);
		expect(screen.getByRole('link', { name: 'NebulaKit' })).toHaveAttribute(
			'href',
			'https://nebulakit.starspace.group/'
		);
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/NebulaKit"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/spacebot"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/dashboard"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/game"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/NebulaKit"] svg')
		).toBeInTheDocument();
		expect(screen.getByText('Rebuild with NebulaKit')).toBeInTheDocument();
		expect(screen.getByText('Fix GitHub and Google Analytics')).toBeInTheDocument();
		expect(screen.getByText('Fix Spotify')).toBeInTheDocument();
		expect(
			screen.getByText('Add AI feature: Describe synth/effect type and it will build it for you')
		).toBeInTheDocument();
	});

	it('should render the content in a main landmark', () => {
		render(Page, { props: { data: mockData } });
		expect(document.querySelector('main')).toBeInTheDocument();
	});

	it('should render completed tasks with strikethrough styling', () => {
		const dataWithCompleted: any = {
			groups: [
				{
					name: '*Space',
					projects: [
						{
							id: '1',
							name: 'NebulaKit',
							status: 'active',
							primaryLink: 'https://nebulakit.starspace.group/',
							extraLinks: [],
							tasks: ['Current task'],
							completedTasks: ['Finished task'],
							sortOrder: 0
						}
					]
				}
			]
		};
		render(Page, { props: { data: dataWithCompleted } });
		const doneList = document.querySelector('.task-list--done');
		expect(doneList).toBeInTheDocument();
		expect(doneList).toHaveTextContent('Finished task');
	});
});
