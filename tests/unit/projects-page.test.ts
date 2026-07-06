import { fireEvent, render, screen, within } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/projects/+page.svelte';

function publicProject(overrides: Record<string, unknown> = {}) {
	return {
		name: 'Project',
		status: 'active',
		priority: 'medium',
		description: '',
		primaryLink: null,
		githubUrl: null,
		extraLinks: [],
		tasks: [],
		blockers: '',
		...overrides
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockData: any = {
	groups: [
		{
			name: '*Space',
			projects: [
				publicProject({
					name: 'starspace.group',
					priority: 'high',
					primaryLink: 'https://starspace.group/'
				}),
				publicProject({
					name: 'NebulaKit',
					priority: 'high',
					primaryLink: 'https://nebulakit.starspace.group/',
					githubUrl: 'https://github.com/starspacegroup/NebulaKit'
				}),
				publicProject({
					name: 'SpaceBot',
					status: 'paused',
					primaryLink: 'https://spacebot.starspace.group/',
					githubUrl: 'https://github.com/starspacegroup/spacebot',
					blockers: 'Waiting on dependency'
				}),
				publicProject({
					name: 'Dashboard',
					status: 'blocked',
					primaryLink: 'https://dashboard.starspace.group',
					githubUrl: 'https://github.com/starspacegroup/dashboard'
				})
			]
		},
		{
			name: 'Personal',
			projects: [
				publicProject({
					name: 'davis9001.dev',
					priority: 'high',
					primaryLink: 'https://davis9001.dev/'
				}),
				publicProject({ name: 'Arizona Iced VST', status: 'planning' })
			]
		}
	],
	boardTasks: [
		{
			text: 'Rebuild with NebulaKit',
			status: 'planning',
			projectName: 'starspace.group',
			group: '*Space',
			projectLink: 'https://starspace.group/'
		},
		{
			text: 'LLMs/Agents Use Agile and TDD',
			status: 'active',
			projectName: 'NebulaKit',
			group: '*Space',
			projectLink: 'https://nebulakit.starspace.group/'
		},
		{
			text: 'Fix GitHub and Google Analytics',
			status: 'blocked',
			projectName: 'Dashboard',
			group: '*Space',
			projectLink: 'https://dashboard.starspace.group'
		},
		{
			text: 'Fix glitches',
			status: 'complete',
			projectName: 'Game',
			group: '*Space',
			projectLink: 'https://game.starspace.group'
		},
		{
			text: 'Fix Spotify',
			status: 'planning',
			projectName: 'davis9001.dev',
			group: 'Personal',
			projectLink: 'https://davis9001.dev/'
		}
	]
};

describe('Projects Page (public board)', () => {
	it('should render the page title in a main landmark', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: /open projects/i })).toBeInTheDocument();
		expect(document.querySelector('main')).toBeInTheDocument();
	});

	it('should render top-level initiative groups', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByRole('heading', { name: /\*space/i })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /personal/i })).toBeInTheDocument();
	});

	it('should include project pills with links and GitHub icons', () => {
		render(Page, { props: { data: mockData } });
		const strip = screen.getByLabelText('Current work groups');
		expect(within(strip).getByRole('link', { name: 'starspace.group' })).toHaveAttribute(
			'href',
			'https://starspace.group/'
		);
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/NebulaKit"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('a[href="https://github.com/starspacegroup/NebulaKit"] svg')
		).toBeInTheDocument();
	});

	it('should show status badges on project pills', () => {
		render(Page, { props: { data: mockData } });
		const badges = document.querySelectorAll('.status-badge');
		expect(badges.length).toBeGreaterThan(0);
		expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
		expect(screen.getByText('Paused')).toBeInTheDocument();
	});

	it('should show blockers note when blockers field is set', () => {
		render(Page, { props: { data: mockData } });
		expect(document.querySelector('.blockers-note')).toBeInTheDocument();
		expect(screen.getByText(/waiting on dependency/i)).toBeInTheDocument();
	});

	it('renders four board columns without Paused', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByLabelText('Planning tasks')).toBeInTheDocument();
		expect(screen.getByLabelText('In Progress tasks')).toBeInTheDocument();
		expect(screen.getByLabelText('Blocked tasks')).toBeInTheDocument();
		expect(screen.getByLabelText('Done tasks')).toBeInTheDocument();
		expect(screen.queryByLabelText('Paused tasks')).toBeNull();
	});

	it('places task cards in their status columns with project chips', () => {
		render(Page, { props: { data: mockData } });

		const planning = screen.getByLabelText('Planning tasks');
		expect(within(planning).getByText('Rebuild with NebulaKit')).toBeInTheDocument();
		expect(within(planning).getByText('Fix Spotify')).toBeInTheDocument();

		const blocked = screen.getByLabelText('Blocked tasks');
		expect(within(blocked).getByText('Fix GitHub and Google Analytics')).toBeInTheDocument();
		expect(within(blocked).getByText('Dashboard')).toBeInTheDocument();

		// project chip links out to the project site
		const chip = within(planning).getByText('starspace.group');
		expect(chip).toHaveAttribute('href', 'https://starspace.group/');
	});

	it('renders done task cards with strikethrough styling', () => {
		render(Page, { props: { data: mockData } });
		const done = screen.getByLabelText('Done tasks');
		const card = within(done).getByText('Fix glitches').closest('.task-card');
		expect(card).toHaveClass('task-card-done');
	});

	it('filters the board by group chips', async () => {
		render(Page, { props: { data: mockData } });

		await fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
		const planning = screen.getByLabelText('Planning tasks');
		expect(within(planning).getByText('Fix Spotify')).toBeInTheDocument();
		expect(within(planning).queryByText('Rebuild with NebulaKit')).toBeNull();

		// clicking All restores everything
		await fireEvent.click(screen.getByRole('button', { name: 'All' }));
		expect(
			within(screen.getByLabelText('Planning tasks')).getByText('Rebuild with NebulaKit')
		).toBeInTheDocument();
	});

	it('shows column counts', () => {
		render(Page, { props: { data: mockData } });
		const planning = screen.getByLabelText('Planning tasks');
		expect(within(planning).getByText('2')).toBeInTheDocument();
	});
});
