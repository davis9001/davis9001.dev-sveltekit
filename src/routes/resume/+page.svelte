<script lang="ts">
	import { onMount } from 'svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

	let asciiCharacters: string[] = [];

	const ASCII_CHAR_START = 42;
	const ASCII_CHAR_END = 4200;
	const ASCII_CHUNK_SIZE = 220;

	function populateAsciiCharactersProgressively() {
		asciiCharacters = [];
		let currentCodePoint = ASCII_CHAR_START;
		const appendChunk = () => {
			const chunk: string[] = [];
			const max = Math.min(currentCodePoint + ASCII_CHUNK_SIZE - 1, ASCII_CHAR_END);
			for (; currentCodePoint <= max; currentCodePoint++) {
				chunk.push(String.fromCharCode(currentCodePoint));
			}
			asciiCharacters = [...asciiCharacters, ...chunk];
			if (currentCodePoint <= ASCII_CHAR_END) setTimeout(appendChunk, 0);
		};
		appendChunk();
	}

	onMount(() => {
		// Force theme for headless PDF generation via URL param
		const params = new URLSearchParams(window.location.search);
		if (params.has('dark')) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else if (params.has('light')) {
			document.documentElement.removeAttribute('data-theme');
		}

		requestAnimationFrame(() => populateAsciiCharactersProgressively());
		const s = document.createElement('script');
		s.src = '/ascii-animate.js';
		document.head.appendChild(s);
	});
</script>

<svelte:head>
	<title>David Monaghan — Résumé</title>
	<meta
		name="description"
		content="Full-Stack Software Engineer · Community Architect · Founder. Clarkdale, Arizona."
	/>
</svelte:head>

<main class="relative text-foreground bg-primary/5 dark:bg-primary/100 min-h-screen">
	<!-- Theme toggle -->
	<div class="fixed top-0 right-0 m-4 z-50">
		<ThemeSwitcher variant="inline" simpleToggle={true} />
	</div>

	<!-- ASCII signal-field background -->
	<div
		class="fixed top-0 left-0 z-10 select-none font-mono items-center grid grid-cols-23 sm:grid-cols-42 lg:grid-cols-99 justify-center text-foreground text-center w-screen h-screen min-w-screen min-h-screen"
		aria-hidden="true"
	>
		{#each asciiCharacters as char}
			<div class="inline-block w-5 text-secondary ascii-character">{char}</div>
		{/each}
	</div>

	<!-- ─── Main content layer ─────────────────────────────────── -->
	<div class="relative z-40 resume-page">
		<div class="resume-card bg-background/70 backdrop-blur-sm">
			<!-- ── Header bar ── -->
			<header class="resume-header">
				<div class="resume-header-left">
					<img
						class="resume-logo"
						src="/logo-green-Icon-250.webp"
						width="72"
						height="72"
						alt="davis9001 logo"
					/>
					<div class="resume-header-name">
						<h1 class="resume-name">David <span class="resume-name-accent">Monaghan</span></h1>
						<p class="resume-role">
							Full-Stack Software Engineer · Community Architect · <span class="resume-role-accent"
								>Founder</span
							>
						</p>
						<p class="resume-location">Clarkdale, Arizona</p>
					</div>
				</div>
				<div class="resume-header-contacts">
					<a href="mailto:monaghan.david@gmail.com">monaghan.david@gmail.com</a>
					<a href="https://davis9001.dev">davis9001.dev</a>
					<a href="https://github.com/davis9001">github.com/davis9001</a>
					<a href="https://linkedin.com/in/davidmonaghan">linkedin.com/in/davidmonaghan</a>
				</div>
			</header>

			<!-- ── Two-column body ── -->
			<div class="resume-columns">
				<!-- LEFT: Skills + Links -->
				<aside class="r-left">
					<section class="r-section">
						<h2 class="r-title">Technical Skills</h2>
						<div class="r-skill">
							<h3 class="r-skill-cat">Frontend</h3>
							<p>SvelteKit, Svelte, Nuxt.js, Deno Fresh, TypeScript, JavaScript</p>
						</div>
						<div class="r-skill">
							<h3 class="r-skill-cat">Edge &amp; Backend</h3>
							<p>Cloudflare Workers, Pages, D1, KV, R2 · Bun, Deno, Node.js</p>
						</div>
						<div class="r-skill">
							<h3 class="r-skill-cat">AI / ML</h3>
							<p>Anthropic Claude API · Cloudflare Workers AI · Google Veo 3</p>
						</div>
						<div class="r-skill">
							<h3 class="r-skill-cat">Auth &amp; Payments</h3>
							<p>OAuth2 (GitHub · Google · Discord), Lucia Auth, Stripe</p>
						</div>
						<div class="r-skill">
							<h3 class="r-skill-cat">DevOps &amp; Tooling</h3>
							<p>Git, Vitest/TDD, Wrangler CLI, Linux (Arch/Hyprland)</p>
						</div>
						<div class="r-skill">
							<h3 class="r-skill-cat">Community &amp; Governance</h3>
							<p>Discord bot dev, DAO mechanism design, two-token governance</p>
						</div>
					</section>

					<section class="r-section">
						<h2 class="r-title">Links</h2>
						<ul class="r-links">
							<li>
								<span class="r-diamond">◈</span><a href="https://davis9001.dev">davis9001.dev</a>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://github.com/davis9001"
									>github.com/davis9001</a
								>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://starspace.group">starspace.group</a
								>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://nebulakit.starspace.group"
									>nebulakit.starspace.group</a
								>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://agapeverse.app">agapeverse.app</a>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://athena.starspace.group"
									>athena.starspace.group</a
								>
							</li>
							<li>
								<span class="r-diamond">◈</span><a href="https://bsky.app/profile/davis9001.dev"
									>bsky.app/profile/davis9001.dev</a
								>
							</li>
						</ul>
					</section>
				</aside>

				<!-- RIGHT: Summary · Experience · OSS · Projects -->
				<main class="r-right">
					<section class="r-section">
						<h2 class="r-title">Summary</h2>
						<blockquote class="r-summary">
							Self-taught engineer turned systems architect with deep experience building full-stack
							web applications, community platforms, and AI-integrated products on Cloudflare's
							edge. Founder of <strong>*Space</strong>, a digital co-working community, and creator
							of
							<strong>NebulaKit</strong> — an engineering-discipline-first SvelteKit + Cloudflare starter.
							Designs and ships production systems across eCommerce, AI content generation, Discord automation,
							DAO governance, and generative music. Strong advocate for TDD, agile practices, and building
							in public.
						</blockquote>
					</section>

					<section class="r-section">
						<h2 class="r-title">Experience</h2>

						<article class="r-job">
							<div class="r-job-header">
								<span class="r-job-line">
									<strong class="r-org">*Space</strong>
									<span class="r-dot">·</span>
									<span class="r-role">Founder &amp; Community Architect</span>
								</span>
								<time class="r-dates">2024 – Present</time>
							</div>
							<ul class="r-bullets">
								<li>
									Founded and grew a digital co-working community on Discord; built the full ops
									stack including <strong>SpaceBot</strong> — open-source Discord platform with slash
									commands, event automations, AI workflows, REST API, and analytics.
								</li>
								<li>
									Designed <strong>Athena</strong>: two-token DAO governance framework (SpaceTime +
									SpaceMoney) separating labor voice from economic stake; whitepaper published.
								</li>
								<li>
									Architected and shipped <strong>NebulaKit</strong> — open-source SvelteKit + Cloudflare
									starter with TDD-first engineering, OAuth, AI interfaces, and real-time capabilities.
								</li>
							</ul>
						</article>

						<article class="r-job">
							<div class="r-job-header">
								<span class="r-job-line">
									<strong class="r-org">AgapeVerse</strong>
									<span class="r-dot">·</span>
									<span class="r-role">Founder &amp; Lead Engineer</span>
								</span>
								<time class="r-dates">2024 – Present</time>
							</div>
							<ul class="r-bullets">
								<li>
									AI poem generation web app serving 37+ users, 138+ poems in live production.
									Dual-model: Cloudflare Workers AI (free tier) + Anthropic Claude Haiku (premium)
									at 150–170× revenue margin.
								</li>
								<li>
									Full Stripe subscription system, HeartPoints economy, admin CMS, and super-admin
									prompt overrides.
								</li>
								<li>
									Migrated Deno Fresh → SvelteKit before Deno Deploy Classic sunset (July 2026),
									including full production KV export/import pipeline.
								</li>
							</ul>
						</article>

						<article class="r-job">
							<div class="r-job-header">
								<span class="r-job-line">
									<strong class="r-org">Ammoura / Nabu</strong>
									<span class="r-dot">·</span>
									<span class="r-role">Founder &amp; Lead Engineer</span>
								</span>
								<time class="r-dates">2025 – Present</time>
							</div>
							<ul class="r-bullets">
								<li>
									<strong>Ammoura:</strong> multi-tenant eCommerce + website builder (SvelteKit + Cloudflare
									D1/R2/KV + Stripe), targeting 4 storefronts for launch on 9/11/2026.
								</li>
								<li>
									<strong>Nabu:</strong> marketing automation — AI content generation with auto-publishing
									to Dev.to and LinkedIn via Cloudflare Cron.
								</li>
							</ul>
						</article>

						<article class="r-job">
							<div class="r-job-header">
								<span class="r-job-line">
									<strong class="r-org">Freelance Web Development</strong>
								</span>
								<time class="r-dates">2022 – Present</time>
							</div>
							<ul class="r-bullets">
								<li>
									<a href="https://robbieschroeder.com" class="r-link">robbieschroeder.com</a> — full
									site for comedian/artist/musician; Nuxt 3 + TinaCMS.
								</li>
								<li>
									Client and sample websites for small businesses and service professionals using
									Svelte.
								</li>
							</ul>
						</article>
					</section>

					<section class="r-section">
						<h2 class="r-title">Open Source</h2>
						<ul class="r-oss">
							<li>
								<span class="r-bullet-dot">◆</span> Dark/light theme toggle for
								<a href="https://docs.deno.com" class="r-link">docs.deno.com</a>
								and <a href="https://fresh.deno.dev/docs" class="r-link">fresh.deno.dev/docs</a> — official
								Deno documentation
							</li>
							<li>
								<span class="r-bullet-dot">◆</span> <strong>NebulaKit</strong> — SvelteKit + Cloudflare
								engineering-first starter framework
							</li>
							<li>
								<span class="r-bullet-dot">◆</span> <strong>SpaceBot</strong> — Discord community operations
								platform
							</li>
						</ul>
					</section>

					<section class="r-section">
						<h2 class="r-title">Selected Projects</h2>
						<div class="r-portfolio">
							<a href="https://nebulakit.starspace.group" class="r-pcard">
								<span class="r-pcard-url">nebulakit.starspace.group</span>
								<span class="r-pcard-desc"
									>SvelteKit + Cloudflare engineering-first starter with TDD, Auth, AI</span
								>
							</a>
							<a href="https://agapeverse.app" class="r-pcard">
								<span class="r-pcard-url">agapeverse.app</span>
								<span class="r-pcard-desc"
									>AI poem generation webapp — Claude API + Stripe + Cloudflare</span
								>
							</a>
							<a href="https://spacebot.starspace.group" class="r-pcard">
								<span class="r-pcard-url">spacebot.starspace.group</span>
								<span class="r-pcard-desc">Open-source Discord community ops platform</span>
							</a>
							<a href="https://game.starspace.group" class="r-pcard">
								<span class="r-pcard-url">game.starspace.group</span>
								<span class="r-pcard-desc"
									>Real-time multiplayer browser game on a spherical world</span
								>
							</a>
							<a href="https://trill-symbiont.starspace.group" class="r-pcard">
								<span class="r-pcard-url">trill-symbiont.starspace.group</span>
								<span class="r-pcard-desc"
									>Shared generative ambient music — Circle of Fifths + physics</span
								>
							</a>
							<a href="https://athena.starspace.group" class="r-pcard">
								<span class="r-pcard-url">athena.starspace.group</span>
								<span class="r-pcard-desc"
									>Two-token DAO governance framework — whitepaper published</span
								>
							</a>
						</div>
					</section>
				</main>
			</div>
		</div>
	</div>
</main>

<style>
	/* ── Page wrapper ─────────────────────────────────────────── */
	.resume-page {
		padding: 2rem 1rem 3rem;
		font-size: 14px;
	}

	.resume-card {
		max-width: 72rem;
		margin: 0 auto;
		border: 1px solid hsla(var(--foreground), 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 12px 40px hsla(var(--background), 0.5);
		overflow: hidden;
	}

	/* ── Header bar ─────────────────────────────────────────────── */
	.resume-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid hsla(var(--foreground), 0.1);
		background: hsla(var(--background), 0.5);
	}

	.resume-header-left {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.resume-logo {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		filter: drop-shadow(0 0 14px hsla(var(--accent), 0.35));
	}

	.resume-header-name {
		text-align: left;
	}

	.resume-name {
		font-size: 2.2rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		line-height: 1.1;
		margin: 0 0 0.2rem;
		color: hsla(var(--foreground));
	}

	.resume-name-accent {
		color: hsla(var(--accent));
	}

	.resume-role {
		font-size: 0.9rem;
		font-weight: 500;
		color: hsla(var(--foreground), 0.75);
		margin: 0 0 0.15rem;
		line-height: 1.3;
	}

	.resume-role-accent {
		color: hsla(var(--secondary));
		font-weight: 700;
	}

	.resume-location {
		font-size: 0.72rem;
		color: hsla(var(--foreground), 0.45);
		letter-spacing: 0.06em;
		margin: 0;
	}

	.resume-header-contacts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	.resume-header-contacts a {
		font-size: 12px;
		color: hsla(var(--accent));
		text-decoration: none;
		transition: color 150ms;
		white-space: nowrap;
	}

	.resume-header-contacts a:hover {
		color: hsla(var(--foreground));
	}

	/* ── Two-column grid ─────────────────────────────────────────── */
	.resume-columns {
		display: grid;
		grid-template-columns: 28fr 72fr;
	}

	@media (max-width: 700px) {
		.resume-columns {
			grid-template-columns: 1fr;
		}
		.r-left {
			border-right: none !important;
			border-bottom: 1px solid hsla(var(--foreground), 0.1);
		}
		.resume-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.resume-header-contacts {
			align-items: flex-start;
		}
		.resume-name {
			font-size: 1.7rem;
		}
	}

	/* ── Left column ─────────────────────────────────────────────── */
	.r-left {
		padding: 1.5rem 1.25rem;
		border-right: 1px solid hsla(var(--foreground), 0.1);
		background: hsla(var(--background), 0.35);
		text-align: left;
	}

	/* ── Right column ────────────────────────────────────────────── */
	.r-right {
		padding: 1.5rem 1.75rem;
		text-align: left;
	}

	/* ── Section chrome ──────────────────────────────────────────── */
	.r-section {
		margin-bottom: 1.5rem;
	}

	.r-title {
		font-size: 10px;
		font-weight: 700;
		color: hsla(var(--secondary));
		text-transform: uppercase;
		letter-spacing: 0.18em;
		margin-bottom: 0.75rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid hsla(var(--foreground), 0.15);
		line-height: 1;
	}

	/* ── Skills ──────────────────────────────────────────────────── */
	.r-skill {
		margin-bottom: 0.65rem;
	}

	.r-skill-cat {
		font-size: 11px;
		font-weight: 700;
		color: hsla(var(--accent));
		margin-bottom: 2px;
		letter-spacing: 0.02em;
	}

	.r-skill p {
		font-size: 11.5px;
		color: hsla(var(--foreground), 0.62);
		line-height: 1.5;
		margin: 0;
	}

	/* ── Links ───────────────────────────────────────────────────── */
	.r-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.r-links li {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.r-diamond {
		font-size: 10px;
		color: hsla(var(--accent));
		flex-shrink: 0;
	}

	.r-links a {
		font-size: 11.5px;
		color: hsla(var(--accent));
		text-decoration: none;
		word-break: break-all;
		transition: color 150ms;
	}

	.r-links a:hover {
		color: hsla(var(--foreground));
	}

	/* ── Summary ─────────────────────────────────────────────────── */
	.r-summary {
		font-size: 13.5px;
		color: hsla(var(--foreground), 0.85);
		line-height: 1.75;
		margin: 0;
		padding: 0.75rem 1rem;
		border-left: 3px solid hsla(var(--accent), 0.5);
		background: hsla(var(--background), 0.3);
		border-radius: 0 0.35rem 0.35rem 0;
	}

	.r-summary strong {
		color: hsla(var(--foreground));
		font-weight: 700;
	}

	/* ── Experience ──────────────────────────────────────────────── */
	.r-job {
		margin-bottom: 1.2rem;
		padding-bottom: 1.2rem;
		border-bottom: 1px solid hsla(var(--foreground), 0.07);
	}

	.r-job:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.r-job-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.45rem;
	}

	.r-job-line {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.r-org {
		font-size: 14.5px;
		font-weight: 800;
		color: hsla(var(--foreground), 0.95);
	}

	.r-dot {
		color: hsla(var(--foreground), 0.35);
		font-weight: 400;
	}

	.r-role {
		font-size: 13px;
		color: hsla(var(--foreground), 0.65);
		font-weight: 400;
	}

	.r-dates {
		font-size: 12px;
		color: hsla(var(--accent));
		white-space: nowrap;
		flex-shrink: 0;
		padding-top: 1px;
		font-weight: 500;
	}

	.r-bullets {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.r-bullets li {
		font-size: 12.5px;
		color: hsla(var(--foreground), 0.8);
		padding-left: 1.1rem;
		position: relative;
		line-height: 1.6;
	}

	.r-bullets li::before {
		content: '·';
		position: absolute;
		left: 0;
		color: hsla(var(--accent));
		font-size: 14px;
		top: -1px;
	}

	.r-bullets strong {
		color: hsla(var(--foreground), 0.95);
	}

	.r-link {
		color: hsla(var(--accent));
		text-decoration: none;
		transition: color 150ms;
	}
	.r-link:hover {
		color: hsla(var(--foreground));
	}

	/* ── Open Source ─────────────────────────────────────────────── */
	.r-oss {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.r-oss li {
		font-size: 12.5px;
		color: hsla(var(--foreground), 0.8);
		line-height: 1.55;
		display: flex;
		align-items: flex-start;
		gap: 7px;
	}

	.r-bullet-dot {
		color: hsla(var(--accent));
		font-size: 10px;
		flex-shrink: 0;
		padding-top: 3px;
	}

	.r-oss strong {
		color: hsla(var(--accent));
		font-weight: 600;
	}

	/* ── Projects grid ───────────────────────────────────────────── */
	.r-portfolio {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}

	@media (max-width: 480px) {
		.r-portfolio {
			grid-template-columns: 1fr;
		}
	}

	.r-pcard {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 0.65rem 0.85rem;
		border: 1px solid hsla(var(--foreground), 0.1);
		border-left: 3px solid hsla(var(--accent), 0.5);
		border-radius: 0 0.4rem 0.4rem 0;
		text-decoration: none;
		background: hsla(var(--background), 0.3);
		transition: all 180ms ease;
	}

	.r-pcard:hover {
		border-left-color: hsla(var(--accent), 0.9);
		background: hsla(var(--background), 0.55);
		transform: translateX(2px);
	}

	.r-pcard-url {
		font-size: 12.5px;
		font-weight: 700;
		color: hsla(var(--accent));
		line-height: 1.2;
	}

	.r-pcard-desc {
		font-size: 11.5px;
		color: hsla(var(--foreground), 0.55);
		line-height: 1.45;
	}

	/* ── Desktop padding ─────────────────────────────────────────── */
	@media (min-width: 768px) {
		.resume-page {
			padding: 2.5rem 1.5rem 4rem;
		}
		.resume-name {
			font-size: 2.6rem;
		}
	}

	/* ── Print / PDF ─────────────────────────────────────────── */
	@media print {
		@page {
			size: 8.5in 11in;
			margin: 0;
		}

		/* Hide all decorative / interactive chrome */
		div[aria-hidden='true'],
		:global(.fixed),
		:global([class*='theme']) {
			display: none !important;
		}

		:global(html) {
			font-size: 9.5pt;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		main {
			background: #ffffff !important;
			min-height: unset !important;
		}

		/* Side gutters as content padding (not @page margin) so they survive
		   the print dialog's "Margins: None" setting and never get clipped
		   by the printer's non-printable edge. Kept at 0.3in to stay 1 page. */
		.resume-page {
			padding: 0 0.3in;
		}

		.resume-card {
			max-width: 100% !important;
			border: none !important;
			box-shadow: none !important;
			border-radius: 0 !important;
			backdrop-filter: none !important;
			background: transparent !important;
		}

		/* ── LIGHT print palette ── */
		.resume-header {
			padding: 0.14in 0.22in 0.12in;
			border-bottom: 1.5px solid #ccc !important;
			background: #ffffff !important;
			backdrop-filter: none !important;
		}
		.resume-logo {
			width: 46px;
			height: 46px;
			filter: none;
		}
		.resume-name {
			font-size: 19pt;
			color: #111;
		}
		.resume-name-accent {
			color: #0d7a6b;
		}
		.resume-role {
			color: #333;
			font-size: 0.75rem;
		}
		.resume-role-accent {
			color: #b05010;
		}
		.resume-location {
			color: #666;
		}
		.resume-header-contacts a {
			color: #0d7a6b;
			font-size: 8pt;
		}

		.resume-columns {
			grid-template-columns: 28fr 72fr !important;
		}

		.r-left {
			background: #f0eef8 !important;
			border-right: 1px solid #ccc !important;
			padding: 0.1in 0.1in;
			backdrop-filter: none !important;
		}
		.r-right {
			padding: 0.1in 0.08in 0.1in 0.14in;
		}

		.r-section {
			margin-bottom: 0.55rem;
		}
		.r-title {
			color: #b05010;
			border-bottom-color: #ccc;
			font-size: 6.5pt;
			margin-bottom: 0.35rem;
		}
		.r-skill {
			margin-bottom: 0.3rem;
		}
		.r-skill-cat {
			color: #0d7a6b;
			font-size: 8pt;
		}
		.r-skill p {
			color: #555;
			font-size: 7pt;
			line-height: 1.35;
		}
		.r-diamond {
			color: #0d7a6b;
			font-size: 9px;
		}
		.r-links a {
			color: #0d7a6b;
			font-size: 7.5pt;
		}
		.r-links {
			gap: 0.15rem;
		}

		.r-summary {
			border-left-color: #0d7a6b !important;
			background: #f5f3fc !important;
			color: #1a1a1a;
			font-size: 7.5pt;
			line-height: 1.5;
			padding: 0.35rem 0.6rem;
			margin-bottom: 0;
		}
		.r-summary strong {
			color: #111;
		}

		.r-job {
			margin-bottom: 0.5rem;
			padding-bottom: 0.5rem;
			border-bottom-color: rgba(0, 0, 0, 0.08) !important;
		}
		.r-job-header {
			margin-bottom: 0.2rem;
		}
		.r-org {
			color: #111;
			font-size: 12px;
		}
		.r-role {
			color: #555;
			font-size: 11px;
		}
		.r-dot {
			color: #999;
		}
		.r-dates {
			color: #0d7a6b;
			font-size: 10px;
		}
		.r-bullets {
			gap: 0.1rem;
		}
		.r-bullets li {
			color: #1a1a1a;
			font-size: 7.5pt;
			line-height: 1.4;
			padding-left: 0.85rem;
		}
		.r-bullets li::before {
			color: #0d7a6b;
			font-size: 12px;
		}
		.r-bullets strong {
			color: #111;
		}
		.r-link {
			color: #0d7a6b;
		}

		.r-oss {
			gap: 0.2rem;
		}
		.r-oss li {
			color: #1a1a1a;
			font-size: 7.5pt;
			line-height: 1.35;
			gap: 5px;
		}
		.r-bullet-dot {
			color: #0d7a6b;
			font-size: 9px;
		}
		.r-oss strong {
			color: #0d7a6b;
		}

		.r-portfolio {
			gap: 4px;
			grid-template-columns: repeat(2, 1fr);
		}
		.r-pcard {
			border-left-color: #0d7a6b !important;
			border-color: #ddd !important;
			background: transparent !important;
			padding: 0.3rem 0.5rem;
		}
		.r-pcard-url {
			color: #0d7a6b;
			font-size: 7.5pt;
		}
		.r-pcard-desc {
			color: #555;
			font-size: 7pt;
			line-height: 1.35;
		}

		.r-job {
			page-break-inside: avoid;
		}
		.r-section {
			page-break-inside: avoid;
		}
		.r-portfolio {
			page-break-inside: avoid;
		}

		/* ── DARK print palette (cosmic AgapeVerse) ── */
		:global([data-theme='dark']) main {
			background: #0f0c16 !important;
		}

		:global([data-theme='dark']) .resume-header {
			background: #160f22 !important;
			border-bottom-color: #2e2548 !important;
		}
		:global([data-theme='dark']) .resume-name {
			color: #ede8f7;
		}
		:global([data-theme='dark']) .resume-name-accent {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .resume-role {
			color: #a899c8;
		}
		:global([data-theme='dark']) .resume-role-accent {
			color: #fbcc60;
		}
		:global([data-theme='dark']) .resume-location {
			color: #7a6e99;
		}
		:global([data-theme='dark']) .resume-header-contacts a {
			color: #79d9ec;
		}

		:global([data-theme='dark']) .r-left {
			background: #160f22 !important;
			border-right-color: #2e2548 !important;
		}
		:global([data-theme='dark']) .resume-header {
			background: #160f22 !important;
			border-bottom-color: #2e2548 !important;
		}

		:global([data-theme='dark']) .r-title {
			color: #fbcc60;
			border-bottom-color: #2e2548;
		}
		:global([data-theme='dark']) .r-skill-cat {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-skill p {
			color: #8a7eb8;
		}
		:global([data-theme='dark']) .r-diamond {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-links a {
			color: #79d9ec;
		}

		:global([data-theme='dark']) .r-summary {
			border-left-color: #79d9ec !important;
			background: rgba(121, 217, 236, 0.07) !important;
			color: #ede8f7;
		}
		:global([data-theme='dark']) .r-summary strong {
			color: #ffffff;
		}

		:global([data-theme='dark']) .r-job {
			border-bottom-color: #2e2548 !important;
		}
		:global([data-theme='dark']) .r-org {
			color: #ede8f7;
		}
		:global([data-theme='dark']) .r-role {
			color: #a899c8;
		}
		:global([data-theme='dark']) .r-dot {
			color: #4a3d66;
		}
		:global([data-theme='dark']) .r-dates {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-bullets li {
			color: #ccc4e8;
		}
		:global([data-theme='dark']) .r-bullets li::before {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-bullets strong {
			color: #ede8f7;
		}
		:global([data-theme='dark']) .r-link {
			color: #79d9ec;
		}

		:global([data-theme='dark']) .r-oss li {
			color: #ccc4e8;
		}
		:global([data-theme='dark']) .r-bullet-dot {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-oss strong {
			color: #79d9ec;
		}

		:global([data-theme='dark']) .r-pcard {
			border-left-color: #79d9ec !important;
			border-color: #2e2548 !important;
			background: rgba(121, 217, 236, 0.04) !important;
		}
		:global([data-theme='dark']) .r-pcard-url {
			color: #79d9ec;
		}
		:global([data-theme='dark']) .r-pcard-desc {
			color: #8a7eb8;
		}
	}
</style>
