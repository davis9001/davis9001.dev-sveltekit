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

	it('renders the notice inside the shared container', () => {
		render(Footer);
		const container = document.querySelector('footer div');
		const paragraph = document.querySelector('footer p');

		// The old tests here asserted Tailwind class names — text-center, flex —
		// that this project has no Tailwind to implement, so they passed while
		// the footer sat unstyled and flush against the bottom of the window.
		// Spacing now comes from the component's own scoped styles, which this
		// environment does not resolve, so it is checked in a browser instead;
		// what is worth pinning here is the shape and the container it uses.
		expect(container).toHaveClass('container');
		expect(paragraph?.parentElement).toBe(container);
		expect(paragraph?.textContent).toMatch(/all rights reserved/i);
	});
});
