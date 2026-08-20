import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/dirac/terms/+page.svelte';

describe('Dirac Terms of Service Page', () => {
	it('should render the page title', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /dirac — terms of service/i })).toBeInTheDocument();
	});

	it('should say what the application is', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /what dirac is/i })).toBeInTheDocument();
	});

	it('should have an acceptance section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /acceptance/i })).toBeInTheDocument();
	});

	it('should have a use of service section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /use of service/i })).toBeInTheDocument();
	});

	it('should have a user accounts section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /user accounts/i })).toBeInTheDocument();
	});

	it('should have an availability section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /availability/i })).toBeInTheDocument();
	});

	it('should have an intellectual property section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /intellectual property/i })).toBeInTheDocument();
	});

	it('should have a limitation of liability section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /limitation of liability/i })).toBeInTheDocument();
	});

	it('should have a termination section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /termination/i })).toBeInTheDocument();
	});

	it('should have a contact section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument();
	});

	it('should link to the matching privacy policy', () => {
		render(Page);
		expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
			'href',
			'/dirac/privacy'
		);
	});

	it('should show a last updated date', () => {
		render(Page);
		expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
	});
});
