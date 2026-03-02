<script lang="ts">
	import { onMount } from 'svelte';
	import GitHubActivityGrid from '$lib/components/GitHubActivityGrid.svelte';
	import SpotifyWidget from '$lib/components/SpotifyWidget.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import AnimatedCrow from '$lib/components/AnimatedCrow.svelte';
	import { formatBlogDate } from '$lib/utils/blog';
	import SEO from '$lib/components/SEO.svelte';
	import type { CrowTarget } from '$lib/utils/crow';
	import type { PageData } from './$types';

	export let data: PageData;

	$: recentPosts = data.recentPosts || [];

	let asciiCharacters: string[] = [];

	// Crow landing targets — positions relative to viewport
	// These are computed on mount and on resize to stay responsive
	let crowTargets: CrowTarget[] = [];

	function computeCrowTargets() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const targets: CrowTarget[] = [];

		// ── Shoulder ──
		// The background photo is positioned at -9ch 18em (background-size: contain).
		// The person's right shoulder sits in the upper-left quadrant of the image.
		// Scale is large so the crow looks realistically perched on you.
		// zIndex 35 puts it between the background (z-30) and content (z-40).
		const shoulderX = Math.min(vw * 0.22, 280);
		const shoulderY = vh * 0.45;
		targets.push({
			id: 'shoulder',
			x: shoulderX,
			y: shoulderY,
			scale: 1.6,
			zIndex: 35
		});

		// ── Logo — land on top edge of the logo image ──
		const logo = document.querySelector('.hero-logo');
		if (logo) {
			const rect = logo.getBoundingClientRect();
			targets.push({
				id: 'logo',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.4,
				zIndex: 45,
				anchorSelector: '.hero-logo',
				anchorAlign: { x: 0.5, y: 0 }
			});
		}

		// ── Title — land on top of the "davis9001" text ──
		const title = document.querySelector('.hero-title');
		if (title) {
			const rect = title.getBoundingClientRect();
			// Land on the right half of the title text (looks natural for a crow)
			targets.push({
				id: 'title',
				x: rect.left + rect.width * 0.65,
				y: rect.top,
				scale: 0.35,
				zIndex: 45,
				anchorSelector: '.hero-title',
				anchorAlign: { x: 0.65, y: 0 }
			});
		}

		// ── CTA — land on top edge of the first CTA button ──
		const cta = document.querySelector('.hero-cta');
		if (cta) {
			const rect = cta.getBoundingClientRect();
			targets.push({
				id: 'cta',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.3,
				zIndex: 45,
				anchorSelector: '.hero-cta',
				anchorAlign: { x: 0.5, y: 0 }
			});
		}

		// ── Scroll hint — land on the scroll chevron ──
		const scrollHint = document.querySelector('.hero-scroll-hint');
		if (scrollHint) {
			const rect = scrollHint.getBoundingClientRect();
			targets.push({
				id: 'scroll-hint',
				x: rect.left + rect.width * 0.5,
				y: rect.top,
				scale: 0.28,
				zIndex: 45,
				anchorSelector: '.hero-scroll-hint',
				anchorAlign: { x: 0.5, y: 0 }
			});
		}

		// ── Theme switcher — top-right corner ──
		// Theme switcher is z-50, crow sits just above it
		targets.push({
			id: 'theme-switcher',
			x: vw - 60,
			y: 40,
			scale: 0.3,
			zIndex: 51
		});

		crowTargets = targets;
	}

	onMount(() => {
		// Generate ASCII characters (same as Fresh site)
		const chars = [];
		for (let i = 42; i <= 4200; i++) {
			chars.push(String.fromCharCode(i));
		}
		asciiCharacters = chars;
		
		// Load ASCII animation script
		const script = document.createElement('script');
		script.src = '/ascii-animate.js';
		document.head.appendChild(script);

		// Compute crow targets after layout settles
		computeCrowTargets();
		window.addEventListener('resize', computeCrowTargets);

		return () => {
			window.removeEventListener('resize', computeCrowTargets);
		};
	});
</script>

<SEO
	title="Home"
	description="The personal website of David Monaghan aka davis9001."
	path="/"
/>

<main class="relative text-foreground text-center bg-primary/5 dark:bg-primary/100">
	<!-- Theme Toggle (top-right) -->
	<div class="fixed top-0 right-0 m-4 z-50">
		<ThemeSwitcher variant="inline" simpleToggle={true} />
	</div>

	<!-- Animated Crow -->
	{#if crowTargets.length > 0}
		<AnimatedCrow
			targets={crowTargets}
			minIdleSeconds={6}
			maxIdleSeconds={14}
			flightDurationMs={2400}
		/>
	{/if}

	<!-- Background Image -->
	<div
		class="fixed inset-0 z-30 bg-cover bg-center bg-no-repeat"
		style="
			background-image: url('/davis9001-2.webp');
			background-size: contain;
			background-position: -9ch 18em;
		"
	/>

	<!-- ASCII Animation Grid -->
	<div class="fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-23 sm:grid-cols-42 lg:grid-cols-99 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen">
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">
				{char}
			</div>
		{/each}
	</div>

	<!-- ===== HERO SECTION — Full viewport ===== -->
	<section class="hero-section relative z-40 min-h-screen flex flex-col items-center justify-center" role="banner">
		<div class="hero-content">
			<img
				class="hero-logo"
				src="/logo-green-Icon-250.webp"
				width="160"
				height="160"
				alt="the davis9001 logo: a 9 that roughly resembles a lowercase D, cut from a hexagon (not that anyone would notice)"
			/>

			<h1 class="hero-title">davis9001</h1>
			<p class="hero-subtitle">David "davis9001" Monaghan</p>
			<p class="hero-role">Software and Community Architect</p>

			<nav class="hero-ctas" aria-label="Quick links">
				<a href="https://starspace.group" class="hero-cta hero-cta--special">
					Currently building: *Space
				</a>
				<a href="/portfolio" class="hero-cta">
					Portfolio of Projects
				</a>
				<a href="/send" class="hero-cta">
					Send a message
				</a>
			</nav>

			<SocialLinks />
		</div>

		<!-- Scroll hint -->
		<div class="hero-scroll-hint" aria-hidden="true">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	</section>

	<!-- ===== CONTENT — Below the fold ===== -->
	<section class="relative z-40 content-section" role="region" aria-label="Activity and updates">
		<div class="content-card bg-background/70 backdrop-blur-sm rounded-xl">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
				<div class="w-full flex flex-col gap-4 lg:gap-6">
					<GitHubActivityGrid />

					<div class="w-full">
						<h3 class="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
							<img
								src="/logo-green-Icon-250.webp"
								width="24"
								height="24"
								alt="davis9001 logo"
								class="w-5 h-5 sm:w-6 sm:h-6"
							/>
							<a
								href="/updates"
								class="text-secondary hover:text-foreground transition-colors"
							>
								Updates (Blog)
							</a>
						</h3>
						<div class="text-base sm:text-xl">
							{#each recentPosts as post}
								<div class="text-left p-2">
									<a href="/updates/{post.slug}" class="text-accent">
										<em class="opacity-50">
											{formatBlogDate(post.publishedAt)}
										</em>
										- {post.title}
									</a>
								</div>
							{/each}
						</div>
						{#if recentPosts.length >= 5}
							<p class="text-left p-2">
								<a href="/updates" class="text-secondary">See the rest &rarr;</a>
							</p>
						{/if}
					</div>
				</div>

				<div class="w-full">
					<SpotifyWidget />
				</div>
			</div>

			<div class="mt-6">
				<Footer />
			</div>
		</div>
	</section>
</main>

<style>
	/* ── Hero Section ── */
	.hero-section {
		padding: 2rem 1rem 4rem;
	}

	.hero-content {
		max-width: 64rem;
		margin: 0 auto;
	}

	.hero-logo {
		margin: 0 auto 1.25rem;
		width: 96px;
		height: 96px;
		filter: drop-shadow(0 0 24px hsla(var(--accent), 0.35));
		transition: filter 300ms ease;
	}

	.hero-logo:hover {
		filter: drop-shadow(0 0 36px hsla(var(--accent), 0.55));
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1;
		margin-bottom: 0.35rem;
		color: hsla(var(--foreground));
		text-shadow: 0 2px 30px hsla(var(--primary), 0.4);
	}

	.hero-subtitle {
		font-style: italic;
		color: hsla(var(--foreground), 0.65);
		font-size: 1rem;
		margin-bottom: 1.25rem;
		line-height: 1.4;
	}

	.hero-role {
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.3;
		margin-bottom: 2rem;
		color: hsla(var(--foreground), 0.9);
	}

	/* ── CTA Buttons ── */
	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		justify-content: center;
		margin-bottom: 1.75rem;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		padding: 0.7rem 1.35rem;
		border-radius: 0.5rem;
		background: hsla(var(--background), 0.45);
		color: hsla(var(--accent));
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 200ms ease;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid hsla(var(--foreground), 0.08);
	}

	.hero-cta:hover {
		background: hsla(var(--background), 0.7);
		transform: translateY(-2px);
		box-shadow: 0 8px 30px -8px hsla(var(--primary), 0.35);
		color: hsla(var(--accent));
		border-color: hsla(var(--accent), 0.2);
	}

	.hero-cta--special {
		color: hsla(var(--special));
		border-color: hsla(var(--special), 0.15);
	}

	.hero-cta--special:hover {
		border-color: hsla(var(--special), 0.3);
		box-shadow: 0 8px 30px -8px hsla(var(--special), 0.3);
		color: hsla(var(--special));
	}

	/* ── Scroll Hint ── */
	.hero-scroll-hint {
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		color: hsla(var(--foreground), 0.35);
		animation: hero-bob 2.5s ease-in-out infinite;
	}

	@keyframes hero-bob {
		0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.35; }
		50% { transform: translateX(-50%) translateY(10px); opacity: 0.6; }
	}

	/* ── Content Section ── */
	.content-section {
		padding: 0 0.5rem 2rem;
	}

	.content-card {
		max-width: 64rem;
		margin: 0 auto;
		padding: 1rem;
	}

	/* ═══ Tablet+ (768px) ═══ */
	@media (min-width: 768px) {
		.hero-logo {
			width: 148px;
			height: 148px;
			margin-bottom: 1.75rem;
		}

		.hero-title {
			font-size: 6rem;
			letter-spacing: -0.04em;
			margin-bottom: 0.5rem;
		}

		.hero-subtitle {
			font-size: 1.25rem;
			margin-bottom: 1.5rem;
		}

		.hero-role {
			font-size: 2rem;
			margin-bottom: 2.5rem;
		}

		.hero-ctas {
			gap: 0.875rem;
			margin-bottom: 2.25rem;
		}

		.hero-cta {
			font-size: 1rem;
			padding: 0.85rem 1.75rem;
		}

		.content-section {
			padding: 0 1rem 3rem;
		}

		.content-card {
			padding: 2.5rem;
		}
	}

	/* ═══ Desktop (1024px) ═══ */
	@media (min-width: 1024px) {
		.hero-title {
			font-size: 7.5rem;
		}

		.hero-role {
			font-size: 2.25rem;
		}

		.hero-cta {
			font-size: 1.05rem;
			padding: 0.9rem 2rem;
		}

		.content-card {
			padding: 3rem;
		}
	}

	/* ═══ Wide Desktop (1280px) ═══ */
	@media (min-width: 1280px) {
		.hero-title {
			font-size: 8.5rem;
		}
	}

	/* ═══ Small screens ═══ */
	@media (min-width: 400px) {
		.content-card {
			padding: 1.25rem;
		}
	}

	@media (min-width: 640px) {
		.content-section {
			padding: 0 1rem 2rem;
		}

		.content-card {
			padding: 2rem;
		}
	}
</style>
