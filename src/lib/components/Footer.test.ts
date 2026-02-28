import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.svelte';

describe('Footer', () => {
	it('should render the footer element', () => {
		render(Footer);
		const footer = document.querySelector('footer');
		expect(footer).toBeInTheDocument();
	});

	it('should display copyright with current year', () => {
		render(Footer);
		const currentYear = new Date().getFullYear();
		expect(screen.getByText(new RegExp(`© ${currentYear}`, 'i'))).toBeInTheDocument();
	});

	it('should display davis9001.dev in copyright', () => {
		render(Footer);
		expect(screen.getByText(/davis9001\.dev/)).toBeInTheDocument();
	});

	it('should display all rights reserved', () => {
		render(Footer);
		expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
	});

	it('should have centered text styling', () => {
		render(Footer);
		const paragraph = document.querySelector('footer p');
		expect(paragraph).toBeInTheDocument();
		expect(paragraph).toHaveClass('text-center');
	});

	it('should have container with flex layout', () => {
		render(Footer);
		const container = document.querySelector('footer div');
		expect(container).toBeInTheDocument();
		expect(container).toHaveClass('container');
		expect(container).toHaveClass('flex');
	});
});
