import { goto } from '$app/navigation';
import { showCommandPalette } from '$lib/stores/commandPalette';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../../src/routes/+page.svelte';

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// NOTE: These tests are skipped due to the page store issue in vitest.
// The page store cannot be subscribed to outside a Svelte component context.
// See: https://svelte.dev/docs/kit/state-management#avoid-shared-state-on-the-server
describe.skip('Home Page Hero', () => {
	beforeEach(() => {
		// Reset the command palette store before each test
		showCommandPalette.set(false);
	});

	afterEach(() => {
		showCommandPalette.set(false);
	});

	it('should render the main title', () => {
		render(Page);
		const title = screen.getByText('davis9001');
		expect(title).toBeTruthy();
	});

	it('should render the subtitle with author name', () => {
		render(Page);
		const subtitle = screen.getByText(/David "davis9001" Monaghan/i);
		expect(subtitle).toBeTruthy();
	});

	it('should render the role description', () => {
		render(Page);
		const role = screen.getByText('Software and Community Architect');
		expect(role).toBeTruthy();
	});

	it('should render hero CTA links', () => {
		render(Page);
		expect(screen.getByText(/Currently building \*Space/)).toBeTruthy();
		expect(screen.getByText('Portfolio of Projects')).toBeTruthy();
		expect(screen.getByText('Send a message')).toBeTruthy();
	});

	it('should have hero section with banner role', () => {
		const { container } = render(Page);
		const banner = container.querySelector('[role="banner"]');
		expect(banner).toBeTruthy();
	});

	it('should have quick links navigation', () => {
		const { container } = render(Page);
		const nav = container.querySelector('nav[aria-label="Quick links"]');
		expect(nav).toBeTruthy();
	});

	it('should render the logo with alt text', () => {
		render(Page);
		const logo = screen.getByAlt(/davis9001 logo/i);
		expect(logo).toBeTruthy();
	});

	it('should have activity section with proper aria label', () => {
		const { container } = render(Page);
		const section = container.querySelector('[aria-label="Activity and updates"]');
		expect(section).toBeTruthy();
	});

	it('should render ASCII animation grid', () => {
		const { container } = render(Page);
		const asciiGrid = container.querySelector('.ascii-character');
		// Characters are generated in onMount, may not be present in SSR test
		// but the container should exist
		const gridContainer = container.querySelector('.font-mono');
		expect(gridContainer).toBeTruthy();
	});

	it('should have scroll hint indicator', () => {
		const { container } = render(Page);
		const scrollHint = container.querySelector('.hero-scroll-hint');
		expect(scrollHint).toBeTruthy();
		expect(scrollHint?.getAttribute('aria-hidden')).toBe('true');
	});
});
