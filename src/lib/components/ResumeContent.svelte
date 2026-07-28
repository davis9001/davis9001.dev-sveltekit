<script lang="ts">
	/**
	 * The résumé itself — content lives here once and is rendered twice by
	 * /resume: as the responsive web layout (`mode="web"`) and as the fixed
	 * 8.5in print sheet (`mode="sheet"`) that is what actually gets printed.
	 *
	 * Every size in sheet mode is `calc(N * var(--pt))`, where
	 * `--pt: calc(1pt * var(--s))`. So the single `--s` multiplier set by the
	 * auto-fit code scales the entire document uniformly to exactly one page.
	 * Never hard-code a pt/px font size in sheet mode — it would refuse to
	 * scale and break the one-page guarantee.
	 */
	export let mode: 'web' | 'sheet' = 'web';
</script>

<div class="r-root" class:sheet={mode === 'sheet'}>
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
						<span class="r-diamond">◈</span><a href="https://starspace.group">starspace.group</a>
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
		<div class="r-right">
			<section class="r-section">
				<h2 class="r-title">Summary</h2>
				<blockquote class="r-summary">
					Self-taught engineer turned systems architect with deep experience building full-stack web
					applications, community platforms, and AI-integrated products on Cloudflare's edge.
					Founder of <strong>*Space</strong>, a digital co-working community, and creator of
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
							Founded and grew a digital co-working community on Discord; built the full ops stack
							including <strong>SpaceBot</strong> — open-source Discord platform with slash commands,
							event automations, AI workflows, REST API, and analytics.
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
							Dual-model: Cloudflare Workers AI (free tier) + Anthropic Claude Haiku (premium) at
							150–170× revenue margin.
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
							<a href="https://robbieschroeder.com" class="r-link">robbieschroeder.com</a> — full site
							for comedian/artist/musician; Nuxt 3 + TinaCMS.
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
						<span class="r-bullet-dot">◆</span> <strong>NebulaKit</strong> — SvelteKit + Cloudflare engineering-first
						starter framework
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
						<span class="r-pcard-desc">Real-time multiplayer browser game on a spherical world</span
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
		</div>
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════════════
	   WEB MODE
	   Every font size is calc(N * var(--w)) where N is the size in px at
	   100%. --resume-web-scale is the single knob for on-screen type size.
	   ═══════════════════════════════════════════════════════════════════ */
	.r-root {
		--resume-web-scale: 1.2;
		--w: calc(1px * var(--resume-web-scale));
	}

	/* ── Header bar ── */
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
		font-size: calc(35 * var(--w));
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
		font-size: calc(14.5 * var(--w));
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
		font-size: calc(11.5 * var(--w));
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
		font-size: calc(12 * var(--w));
		color: hsla(var(--accent));
		text-decoration: none;
		transition: color 150ms;
		white-space: nowrap;
	}

	.resume-header-contacts a:hover {
		color: hsla(var(--foreground));
	}

	/* ── Two-column grid ── */
	.resume-columns {
		display: grid;
		/* minmax(0, …) rather than bare fr: an fr track refuses to shrink below
		   its content's min-content width, so on a narrow screen the columns
		   would push past the card and get clipped by its overflow:hidden. */
		grid-template-columns: minmax(0, 28fr) minmax(0, 72fr);
	}

	.r-left {
		padding: 1.5rem 1.25rem;
		border-right: 1px solid hsla(var(--foreground), 0.1);
		background: hsla(var(--background), 0.35);
		text-align: left;
	}

	.r-right {
		padding: 1.5rem 1.75rem;
		text-align: left;
	}

	/* ── Section chrome ── */
	.r-section {
		margin-bottom: 1.5rem;
	}

	.r-title {
		font-size: calc(10 * var(--w));
		font-weight: 700;
		color: hsla(var(--secondary));
		text-transform: uppercase;
		letter-spacing: 0.18em;
		margin-bottom: 0.75rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid hsla(var(--foreground), 0.15);
		line-height: 1;
	}

	/* ── Skills ── */
	.r-skill {
		margin-bottom: 0.65rem;
	}

	.r-skill-cat {
		font-size: calc(11 * var(--w));
		font-weight: 700;
		color: hsla(var(--accent));
		margin-bottom: 2px;
		letter-spacing: 0.02em;
	}

	.r-skill p {
		font-size: calc(11.5 * var(--w));
		color: hsla(var(--foreground), 0.62);
		line-height: 1.5;
		margin: 0;
	}

	/* ── Links ── */
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
		font-size: calc(10 * var(--w));
		color: hsla(var(--accent));
		flex-shrink: 0;
	}

	.r-links a {
		font-size: calc(11.5 * var(--w));
		color: hsla(var(--accent));
		text-decoration: none;
		word-break: break-all;
		transition: color 150ms;
	}

	.r-links a:hover {
		color: hsla(var(--foreground));
	}

	/* ── Summary ── */
	.r-summary {
		font-size: calc(13.5 * var(--w));
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

	/* ── Experience ── */
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
		font-size: calc(14.5 * var(--w));
		font-weight: 800;
		color: hsla(var(--foreground), 0.95);
	}

	.r-dot {
		color: hsla(var(--foreground), 0.35);
		font-weight: 400;
	}

	.r-role {
		font-size: calc(13 * var(--w));
		color: hsla(var(--foreground), 0.65);
		font-weight: 400;
	}

	.r-dates {
		font-size: calc(12 * var(--w));
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
		font-size: calc(12.5 * var(--w));
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
		font-size: calc(14 * var(--w));
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

	/* ── Open Source ── */
	.r-oss {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	/* Hanging indent, not flex: these items mix text with inline links, and
	   flex would make every link its own item — each shrinking and wrapping
	   on its own once the column got narrow. */
	.r-oss li {
		font-size: calc(12.5 * var(--w));
		color: hsla(var(--foreground), 0.8);
		line-height: 1.55;
		padding-left: 1.15em;
		text-indent: -1.15em;
	}

	.r-bullet-dot {
		color: hsla(var(--accent));
		font-size: calc(10 * var(--w));
		margin-right: 0.4em;
	}

	.r-oss strong {
		color: hsla(var(--accent));
		font-weight: 600;
	}

	/* ── Projects grid ── */
	.r-portfolio {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
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
		font-size: calc(12.5 * var(--w));
		font-weight: 700;
		color: hsla(var(--accent));
		line-height: 1.2;
	}

	.r-pcard-desc {
		font-size: calc(11.5 * var(--w));
		color: hsla(var(--foreground), 0.55);
		line-height: 1.45;
	}

	/* ── Web responsive tweaks ── */
	@media (max-width: 700px) {
		/* Long URLs and project domains must break rather than force the
		   single column wider than the phone. */
		.r-root:not(.sheet) .r-skill p,
		.r-root:not(.sheet) .r-bullets li,
		.r-root:not(.sheet) .r-oss li,
		.r-root:not(.sheet) .r-summary,
		.r-root:not(.sheet) .r-pcard-url,
		.r-root:not(.sheet) .r-pcard-desc {
			overflow-wrap: anywhere;
		}
		.r-root:not(.sheet) .resume-columns {
			grid-template-columns: minmax(0, 1fr);
		}
		.r-root:not(.sheet) .r-left {
			border-right: none;
			border-bottom: 1px solid hsla(var(--foreground), 0.1);
		}
		.r-root:not(.sheet) .resume-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.r-root:not(.sheet) .resume-header-contacts {
			align-items: flex-start;
		}
		.r-root:not(.sheet) .resume-name {
			font-size: calc(27 * var(--w));
		}
	}

	@media (max-width: 480px) {
		.r-root:not(.sheet) .r-portfolio {
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 768px) {
		.r-root:not(.sheet) .resume-name {
			font-size: calc(42 * var(--w));
		}
	}

	/* ═══════════════════════════════════════════════════════════════════
	   SHEET MODE — what actually prints
	   Sizes are calc(N * var(--pt)) where N is the size in points at
	   --s: 1. The auto-fit code solves for the --s that fills exactly one
	   page, so NOTHING here may use a fixed px/pt/rem font size or it
	   would refuse to scale.
	   ═══════════════════════════════════════════════════════════════════ */
	.r-root.sheet {
		--pt: calc(1pt * var(--s, 1));
		color: #1a1a1a;
		/* app.css scales the root font-size with the viewport (18 / 20 / 23px).
		   Anything in the sheet that inherited it would measure one height on
		   screen and lay out at another on paper, so the sheet declares its own
		   base and every child sizes off --pt. */
		font-size: calc(9 * var(--pt));
		line-height: 1.4;
	}

	.r-root.sheet .resume-header {
		padding: 0 0 calc(8 * var(--pt));
		gap: calc(12 * var(--pt));
		border-bottom: 1px solid #ccc;
		background: transparent;
	}
	.r-root.sheet .resume-header-left {
		gap: calc(10 * var(--pt));
	}
	.r-root.sheet .resume-logo {
		width: calc(34 * var(--pt));
		height: calc(34 * var(--pt));
		filter: none;
	}
	.r-root.sheet .resume-name {
		font-size: calc(19 * var(--pt));
		margin-bottom: calc(1.5 * var(--pt));
		color: #111;
	}
	.r-root.sheet .resume-name-accent {
		color: #0d7a6b;
	}
	.r-root.sheet .resume-role {
		font-size: calc(9 * var(--pt));
		margin-bottom: calc(1 * var(--pt));
		color: #333;
	}
	.r-root.sheet .resume-role-accent {
		color: #b05010;
	}
	.r-root.sheet .resume-location {
		font-size: calc(6.5 * var(--pt));
		color: #666;
	}
	.r-root.sheet .resume-header-contacts {
		gap: calc(2 * var(--pt));
	}
	.r-root.sheet .resume-header-contacts a {
		font-size: calc(8 * var(--pt));
		color: #0d7a6b;
	}

	.r-root.sheet .r-left {
		padding: calc(8 * var(--pt)) calc(8 * var(--pt)) calc(8 * var(--pt)) 0;
		border-right: 1px solid #ccc;
		background: transparent;
	}
	.r-root.sheet .r-right {
		padding: calc(8 * var(--pt)) 0 calc(4 * var(--pt)) calc(10 * var(--pt));
	}

	.r-root.sheet .r-section {
		margin-bottom: calc(7 * var(--pt));
	}
	.r-root.sheet .r-section:last-child {
		margin-bottom: 0;
	}
	.r-root.sheet .r-title {
		font-size: calc(6.5 * var(--pt));
		margin-bottom: calc(4 * var(--pt));
		padding-bottom: calc(2.5 * var(--pt));
		color: #b05010;
		border-bottom-color: #ccc;
	}

	.r-root.sheet .r-skill {
		margin-bottom: calc(3.5 * var(--pt));
	}
	.r-root.sheet .r-skill-cat {
		font-size: calc(8 * var(--pt));
		margin-bottom: calc(0.5 * var(--pt));
		color: #0d7a6b;
	}
	.r-root.sheet .r-skill p {
		font-size: calc(7 * var(--pt));
		line-height: 1.35;
		color: #555;
	}

	.r-root.sheet .r-links {
		gap: calc(2 * var(--pt));
	}
	.r-root.sheet .r-links li {
		gap: calc(3 * var(--pt));
	}
	.r-root.sheet .r-diamond {
		font-size: calc(6.5 * var(--pt));
		color: #0d7a6b;
	}
	.r-root.sheet .r-links a {
		font-size: calc(7.5 * var(--pt));
		color: #0d7a6b;
	}

	.r-root.sheet .r-summary {
		font-size: calc(7.5 * var(--pt));
		line-height: 1.5;
		padding: calc(4 * var(--pt)) calc(7 * var(--pt));
		border-left: calc(2 * var(--pt)) solid #0d7a6b;
		border-radius: 0;
		background: #f5f3fc;
		color: #1a1a1a;
	}
	.r-root.sheet .r-summary strong {
		color: #111;
	}

	.r-root.sheet .r-job {
		margin-bottom: calc(6 * var(--pt));
		padding-bottom: calc(6 * var(--pt));
		border-bottom-color: rgba(0, 0, 0, 0.08);
	}
	.r-root.sheet .r-job-header {
		margin-bottom: calc(2.5 * var(--pt));
		gap: calc(8 * var(--pt));
	}
	.r-root.sheet .r-job-line {
		gap: calc(3 * var(--pt));
	}
	.r-root.sheet .r-org {
		font-size: calc(9 * var(--pt));
		color: #111;
	}
	.r-root.sheet .r-role {
		font-size: calc(8.25 * var(--pt));
		color: #555;
	}
	.r-root.sheet .r-dot {
		font-size: calc(8.25 * var(--pt));
		color: #999;
	}
	.r-root.sheet .r-dates {
		font-size: calc(7.5 * var(--pt));
		color: #0d7a6b;
	}

	.r-root.sheet .r-bullets {
		gap: calc(1.5 * var(--pt));
	}
	.r-root.sheet .r-bullets li {
		font-size: calc(7.5 * var(--pt));
		line-height: 1.4;
		padding-left: calc(8 * var(--pt));
		color: #1a1a1a;
	}
	.r-root.sheet .r-bullets li::before {
		font-size: calc(9 * var(--pt));
		color: #0d7a6b;
	}
	.r-root.sheet .r-bullets strong {
		color: #111;
	}
	.r-root.sheet .r-link {
		color: #0d7a6b;
	}

	.r-root.sheet .r-oss {
		gap: calc(2.5 * var(--pt));
	}
	.r-root.sheet .r-oss li {
		font-size: calc(7.5 * var(--pt));
		line-height: 1.35;
		color: #1a1a1a;
	}
	.r-root.sheet .r-bullet-dot {
		font-size: calc(6.5 * var(--pt));
		color: #0d7a6b;
	}
	.r-root.sheet .r-oss strong {
		color: #0d7a6b;
	}

	.r-root.sheet .r-portfolio {
		gap: calc(3 * var(--pt));
	}
	.r-root.sheet .r-pcard {
		padding: calc(3.5 * var(--pt)) calc(5 * var(--pt));
		gap: calc(1 * var(--pt));
		border: 1px solid #ddd;
		border-left: calc(2 * var(--pt)) solid #0d7a6b;
		border-radius: 0;
		background: transparent;
		transform: none;
	}
	.r-root.sheet .r-pcard-url {
		font-size: calc(7.5 * var(--pt));
		color: #0d7a6b;
	}
	.r-root.sheet .r-pcard-desc {
		font-size: calc(7 * var(--pt));
		line-height: 1.35;
		color: #555;
	}

	/* ── Sheet, dark palette (cosmic AgapeVerse) ── */
	:global([data-theme='dark']) .r-root.sheet {
		color: #ccc4e8;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-header {
		border-bottom-color: #2e2548;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-name {
		color: #ede8f7;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-name-accent {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-role {
		color: #a899c8;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-role-accent {
		color: #fbcc60;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-location {
		color: #7a6e99;
	}
	:global([data-theme='dark']) .r-root.sheet .resume-header-contacts a {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-left {
		border-right-color: #2e2548;
	}
	:global([data-theme='dark']) .r-root.sheet .r-title {
		color: #fbcc60;
		border-bottom-color: #2e2548;
	}
	:global([data-theme='dark']) .r-root.sheet .r-skill-cat {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-skill p {
		color: #8a7eb8;
	}
	:global([data-theme='dark']) .r-root.sheet .r-diamond {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-links a {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-summary {
		border-left-color: #79d9ec;
		background: rgba(121, 217, 236, 0.07);
		color: #ede8f7;
	}
	:global([data-theme='dark']) .r-root.sheet .r-summary strong {
		color: #ffffff;
	}
	:global([data-theme='dark']) .r-root.sheet .r-job {
		border-bottom-color: #2e2548;
	}
	:global([data-theme='dark']) .r-root.sheet .r-org {
		color: #ede8f7;
	}
	:global([data-theme='dark']) .r-root.sheet .r-role {
		color: #a899c8;
	}
	:global([data-theme='dark']) .r-root.sheet .r-dot {
		color: #4a3d66;
	}
	:global([data-theme='dark']) .r-root.sheet .r-dates {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-bullets li {
		color: #ccc4e8;
	}
	:global([data-theme='dark']) .r-root.sheet .r-bullets li::before {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-bullets strong {
		color: #ede8f7;
	}
	:global([data-theme='dark']) .r-root.sheet .r-link {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-oss li {
		color: #ccc4e8;
	}
	:global([data-theme='dark']) .r-root.sheet .r-bullet-dot {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-oss strong {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-pcard {
		border-color: #2e2548;
		border-left-color: #79d9ec;
		background: rgba(121, 217, 236, 0.04);
	}
	:global([data-theme='dark']) .r-root.sheet .r-pcard-url {
		color: #79d9ec;
	}
	:global([data-theme='dark']) .r-root.sheet .r-pcard-desc {
		color: #8a7eb8;
	}
</style>
