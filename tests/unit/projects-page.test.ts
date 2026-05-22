import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/projects/+page.svelte';

describe('Projects Page', () => {
	it('should render the page title', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /open projects/i })).toBeInTheDocument();
	});

	it('should render top-level initiative groups', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /\*space/i })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /davis9001/i })).toBeInTheDocument();
	});

	it('should include key active projects and tasks', () => {
		render(Page);
		expect(screen.getByText('starspace.group')).toBeInTheDocument();
		expect(screen.getByText('Rebuild with NebulaKit')).toBeInTheDocument();
		expect(screen.getByText('Fix Github and Google Analytics')).toBeInTheDocument();
		expect(screen.getByText('Fix Spotify')).toBeInTheDocument();
		expect(
			screen.getByText('Add AI feature: Describe synth/effect type and it will build it for you')
		).toBeInTheDocument();
	});

	it('should render the content in a main landmark', () => {
		render(Page);
		expect(document.querySelector('main')).toBeInTheDocument();
	});
});