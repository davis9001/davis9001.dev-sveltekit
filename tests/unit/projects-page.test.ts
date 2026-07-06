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
					priority: 'high',
					description: '',
					primaryLink: 'https://starspace.group/',
					githubUrl: null,
					extraLinks: [],
					tasks: [{ text: 'Rebuild with NebulaKit', done: false }],
					blockers: '',
					sortOrder: 0
				},
				{
					id: '2',
					name: 'NebulaKit',
					status: 'active',
					priority: 'high',
					description: '',
					primaryLink: 'https://nebulakit.starspace.group/',
					githubUrl: 'https://github.com/starspacegroup/NebulaKit',
					extraLinks: [],
					tasks: [{ text: 'LLMs/Agents Use Agile and TDD', done: false }],
					blockers: '',
					sortOrder: 1
				},
				{
					id: '3',
					name: 'SpaceBot',
					status: 'paused',
					priority: 'medium',
					description: '',
					primaryLink: 'https://spacebot.starspace.group/',
					githubUrl: 'https://github.com/starspacegroup/spacebot',
					extraLinks: [],
					tasks: [{ text: 'Local Runners', done: false }],
					blockers: 'Waiting on dependency',
					sortOrder: 3
				},
				{
					id: '4',
					name: 'Dashboard',
					status: 'blocked',
					priority: 'medium',
					description: '',
					primaryLink: 'https://dashboard.starspace.group',
					githubUrl: 'https://github.com/starspacegroup/dashboard',
					extraLinks: [],
					tasks: [{ text: 'Fix GitHub and Google Analytics', done: false }],
					blockers: '',
					sortOrder: 6
				},
				{
					id: '5',
					name: 'Game',
					status: 'active',
					priority: 'medium',
					description: '',
					primaryLink: 'https://game.starspace.group',
					githubUrl: 'https://github.com/starspacegroup/game',
					extraLinks: [],
					tasks: [
						{ text: 'Finish end-game', done: false },
						{ text: 'Fix glitches', done: true }
					],
					blockers: '',
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
					priority: 'high',
					description: '',
					primaryLink: 'https://davis9001.dev/',
					githubUrl: 'https://github.com/starspacegroup/davis9001.dev-sveltekit',
					extraLinks: [],
					tasks: [{ text: 'Fix Spotify', done: false }],
					blockers: '',
					sortOrder: 0
				},
				{
					id: '7',
					name: 'Arizona Iced VST',
					status: 'planning',
					priority: 'medium',
					description: '',
					primaryLink: null,
					githubUrl: null,
					extraLinks: [],
					tasks: [
						{
							text: 'Add AI feature: Describe synth/effect type and it will build it for you',
							done: false
						}
					],
					blockers: '',
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

	it('should include key active projects and links', () => {
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
		// GitHub links via githubUrl field
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
		// GitHub icon SVG rendered
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/NebulaKit"] svg')
		).toBeInTheDocument();
	});

	it('should render tasks as list items', () => {
		render(Page, { props: { data: mockData } });
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

	it('should show status badges for each project', () => {
		render(Page, { props: { data: mockData } });
		const badges = document.querySelectorAll('.status-badge');
		expect(badges.length).toBeGreaterThan(0);
		// active badge
		expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
		// paused badge
		expect(screen.getByText('Paused')).toBeInTheDocument();
		// blocked badge
		expect(screen.getByText('Blocked')).toBeInTheDocument();
		// planning badge
		expect(screen.getByText('Planning')).toBeInTheDocument();
	});

	it('should render done tasks with strikethrough class', () => {
		render(Page, { props: { data: mockData } });
		// "Fix glitches" is done: true in the mock
		const doneItems = document.querySelectorAll('.task-done');
		expect(doneItems.length).toBeGreaterThan(0);
		const doneTexts = Array.from(doneItems).map((el) => el.textContent);
		expect(doneTexts).toContain('Fix glitches');
	});

	it('should render open tasks without strikethrough', () => {
		render(Page, { props: { data: mockData } });
		// "Finish end-game" is done: false
		const openTask = screen.getByText('Finish end-game');
		expect(openTask).not.toHaveClass('task-done');
	});

	it('should show blockers note when blockers field is set', () => {
		render(Page, { props: { data: mockData } });
		expect(document.querySelector('.blockers-note')).toBeInTheDocument();
		expect(screen.getByText(/waiting on dependency/i)).toBeInTheDocument();
	});
});
