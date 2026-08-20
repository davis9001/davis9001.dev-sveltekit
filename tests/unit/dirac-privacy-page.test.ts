import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/dirac/privacy/+page.svelte';

describe('Dirac Privacy Policy Page', () => {
	it('should render the page title', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /dirac — privacy policy/i })).toBeInTheDocument();
	});

	it('should name who operates the application', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /who operates it/i })).toBeInTheDocument();
	});

	it('should have an information collection section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument();
	});

	it('should say how information is used', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /how information is used/i })).toBeInTheDocument();
	});

	it('should have an information sharing section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /information sharing/i })).toBeInTheDocument();
	});

	it('should have a data retention section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /data retention/i })).toBeInTheDocument();
	});

	it('should have a data security section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /data security/i })).toBeInTheDocument();
	});

	it('should tell the reader their rights', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /your rights/i })).toBeInTheDocument();
	});

	it('should have a children section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /children/i })).toBeInTheDocument();
	});

	it('should have a changes section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /changes to this policy/i })).toBeInTheDocument();
	});

	it('should have a contact section', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /^contact$/i })).toBeInTheDocument();
	});

	it("should link to Discord's own privacy policy", () => {
		render(Page);
		expect(screen.getByRole('link', { name: /discord's privacy policy/i })).toHaveAttribute(
			'href',
			'https://discord.com/privacy'
		);
	});

	it('should link to the matching terms of service', () => {
		render(Page);
		expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute(
			'href',
			'/dirac/terms'
		);
	});
});
