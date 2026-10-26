<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import SEO from '$lib/components/SEO.svelte';
	import { errorCopy } from '$lib/utils/error-copy';

	$: status = $page.status;
	$: error = $page.error;
	$: info = errorCopy(status, error?.message);
	$: homeHref = base || '/';
	// Until 2026-09-22 davis9001.com 301'd every path here, and browsers keep
	// a 301 for good — a visitor with that cached lands on this 404 when they
	// wanted, say, davis9001.com/start. Offer the same path there. The query
	// string is a URL their cache has never seen, so it gets through.
	$: studioHref =
		status === 404 && $page.url.pathname !== '/'
			? `https://davis9001.com${$page.url.pathname}?via=dev`
			: null;
	// Raw error text can leak internals; only show it while developing.
	const showDetails = import.meta.env.DEV;
</script>

<SEO title="{status} - {info.title}" description={info.message} />

<div class="error-page">
	<main class="error-content">
		<!-- The crow sits on the line under the code, like the ones on the home page. -->
		<div class="crow-wrap" aria-hidden="true">
			<svg class="crow" viewBox="-30 -30 80 60" width="96" height="72" xmlns="http://www.w3.org/2000/svg">
				<g class="crow-head-group">
					<ellipse cx="18" cy="-8" rx="9" ry="8.5" fill="#0f0f0f" stroke="#0d0d0d" stroke-width="0.8" />
					<path d="M26,-9 L38,-5 L26,-3 Z" fill="#2a2a2a" stroke="#0d0d0d" stroke-width="0.5" />
					<circle cx="21" cy="-10" r="1.6" fill="#e8e8e8" />
					<circle class="pupil" cx="21.5" cy="-10" r="0.8" fill="#0d0d0d" />
				</g>
				<path d="M-8,6 C-16,14 -30,22 -36,20 C-28,14 -20,8 -14,4 Z" fill="#111" stroke="#0d0d0d" stroke-width="0.5" />
				<ellipse cx="0" cy="2" rx="20" ry="11" fill="#111" stroke="#0d0d0d" stroke-width="0.8" />
				<ellipse cx="-2" cy="-1" rx="14" ry="7" fill="none" stroke="#1a2030" stroke-width="1.5" opacity="0.3" />
				<path d="M4,-2 C10,-4 16,-2 18,4 C16,8 10,10 4,6 Z" fill="#1a1a1a" stroke="#0d0d0d" stroke-width="0.5" />
				<path d="M-2,12 L-2,22 M5,12 L5,22" stroke="#444" stroke-width="1.4" stroke-linecap="round" />
			</svg>
		</div>
		<h1 class="error-code" aria-label="Error {status}">{status}</h1>
		<p class="error-title">{info.title}</p>
		<p class="error-message">{info.message}</p>

		<div class="error-actions">
			<a href={homeHref} class="btn btn-primary">Back to the start</a>
			{#if studioHref}
				<a href={studioHref} class="btn btn-secondary">Try it on davis9001.com</a>
			{/if}
			<button class="btn btn-secondary" on:click={() => history.back()}>Go back</button>
		</div>

		{#if showDetails && error?.message && error.message !== info.message}
			<details class="error-details">
				<summary>Technical details</summary>
				<pre>{error.message}</pre>
			</details>
		{/if}
	</main>
</div>

<style>
	.error-page {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl) var(--spacing-lg);
		margin-bottom: calc(-1 * var(--spacing-2xl));
	}

	.error-content {
		text-align: center;
		max-width: 520px;
	}

	.crow-wrap {
		/* The crow's feet land on the top edge of the code below. */
		height: 72px;
		margin-bottom: -20px;
	}

	.crow {
		overflow: visible;
		display: block;
		margin: 0 auto;
		/* Dark mode: a pale rim keeps the black bird readable on a dark page. */
		filter: drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.75));
	}

	.crow-head-group {
		transform-origin: 14px -5px;
		animation: look 7s ease-in-out infinite;
	}

	@keyframes look {
		0%,
		40%,
		100% {
			transform: rotate(0deg);
		}
		48%,
		62% {
			transform: rotate(-14deg);
		}
		70%,
		86% {
			transform: rotate(8deg);
		}
	}

	.error-code {
		font-size: 7rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--color-text);
		margin: 0 0 var(--spacing-md);
	}

	.error-title {
		font-size: 1.6rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--spacing-sm);
	}

	.error-message {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		margin: 0 auto var(--spacing-xl);
		max-width: 380px;
	}

	.error-actions {
		display: flex;
		gap: var(--spacing-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-lg);
		font-size: 1rem;
		font-weight: 500;
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.btn-primary {
		background: var(--color-primary);
		color: #fff;
		border: 1px solid var(--color-primary);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		color: #fff;
	}

	:global([data-theme='dark']) .btn-primary,
	:global([data-theme='dark']) .btn-primary:hover {
		color: hsl(0 0% 6%);
	}

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	.error-details {
		margin-top: var(--spacing-xl);
		text-align: left;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.error-details summary {
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.error-details pre {
		margin-top: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-background);
		border-radius: var(--radius-sm);
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--color-error);
	}

	@media (max-width: 480px) {
		.error-code {
			font-size: 5rem;
		}
		.error-title {
			font-size: 1.35rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crow-head-group {
			animation: none;
		}
	}
</style>
