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
    requestAnimationFrame(() => populateAsciiCharactersProgressively());
    const s = document.createElement('script');
    s.src = '/ascii-animate.js';
    document.head.appendChild(s);
  });
</script>

<svelte:head>
  <title>David Monaghan — Résumé</title>
  <meta name="description" content="Full-Stack Software Engineer · Community Architect · Founder. Clarkdale, Arizona." />
</svelte:head>

<main class="relative text-foreground text-center bg-primary/5 dark:bg-primary/100 min-h-screen">

  <!-- Theme toggle -->
  <div class="fixed top-0 right-0 m-4 z-50">
    <ThemeSwitcher variant="inline" simpleToggle={true} />
  </div>

  <!-- ASCII signal-field background (same as home page) -->
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

    <!-- ── Hero header ── -->
    <header class="resume-hero">
      <img
        class="resume-logo"
        src="/logo-green-Icon-250.webp"
        width="96"
        height="96"
        alt="davis9001 logo"
      />
      <h1 class="resume-name">David Monaghan</h1>
      <p class="resume-aka">David "davis9001" Monaghan</p>
      <p class="resume-role">Full-Stack Software Engineer · Community Architect · Founder</p>
      <p class="resume-location">Clarkdale, Arizona</p>
    </header>

    <!-- ── Two-column resume body ── -->
    <div class="resume-card bg-background/70 backdrop-blur-sm rounded-xl">
      <div class="resume-columns">

        <!-- LEFT: Contact · Skills · Links -->
        <aside class="r-left bg-background/50 backdrop-blur-sm">

          <section class="r-section">
            <h2 class="r-title">Contact</h2>
            <ul class="r-contact">
              <li>
                <span class="r-icon" aria-hidden="true">✉</span>
                <a href="mailto:monaghan.david@gmail.com">monaghan.david@gmail.com</a>
              </li>
              <li>
                <span class="r-icon" aria-hidden="true">◈</span>
                <a href="https://davis9001.dev">davis9001.dev</a>
              </li>
              <li>
                <span class="r-icon" aria-hidden="true">⌘</span>
                <a href="https://github.com/davis9001">github.com/davis9001</a>
              </li>
              <li>
                <span class="r-icon" aria-hidden="true">in</span>
                <a href="https://linkedin.com/in/davidmonaghan">linkedin.com/in/davidmonaghan</a>
              </li>
              <li>
                <span class="r-icon" aria-hidden="true">☁</span>
                <a href="https://bsky.app/profile/davis9001.dev">bsky.app/profile/davis9001.dev</a>
              </li>
            </ul>
          </section>

          <section class="r-section">
            <h2 class="r-title">Skills</h2>
            <div class="r-skill">
              <h3 class="r-skill-cat">Frontend</h3>
              <p>SvelteKit · Svelte · Nuxt.js · Deno Fresh · TypeScript</p>
            </div>
            <div class="r-skill">
              <h3 class="r-skill-cat">Edge / Backend</h3>
              <p>Cloudflare Workers · Pages · D1 · KV · R2 · Bun · Deno · Node.js</p>
            </div>
            <div class="r-skill">
              <h3 class="r-skill-cat">AI / ML</h3>
              <p>Anthropic Claude API · Cloudflare Workers AI · Google Veo 3</p>
            </div>
            <div class="r-skill">
              <h3 class="r-skill-cat">Auth &amp; Payments</h3>
              <p>OAuth2 (GitHub/Google/Discord) · Lucia Auth · Stripe</p>
            </div>
            <div class="r-skill">
              <h3 class="r-skill-cat">DevOps</h3>
              <p>Git · Vitest/TDD · Wrangler CLI · Linux (Arch/Hyprland)</p>
            </div>
            <div class="r-skill">
              <h3 class="r-skill-cat">Community</h3>
              <p>Discord bot dev · DAO governance architecture</p>
            </div>
          </section>

          <section class="r-section">
            <h2 class="r-title">Links</h2>
            <ul class="r-links">
              <li><a href="https://nebulakit.starspace.group">nebulakit.starspace.group</a></li>
              <li><a href="https://agapeverse.app">agapeverse.app</a></li>
              <li><a href="https://spacebot.starspace.group">spacebot.starspace.group</a></li>
              <li><a href="https://game.starspace.group">game.starspace.group</a></li>
              <li><a href="https://trill-symbiont.starspace.group">trill-symbiont.starspace.group</a></li>
              <li><a href="https://athena.starspace.group">athena.starspace.group</a></li>
            </ul>
          </section>

        </aside>

        <!-- RIGHT: Summary · Experience · OSS · Portfolio -->
        <main class="r-right">

          <section class="r-section">
            <h2 class="r-title">Summary</h2>
            <p class="r-summary">
              Self-taught engineer turned systems architect with deep experience building full-stack
              web applications, community platforms, and AI-integrated products on Cloudflare's edge.
              Founder of <em>*Space</em>, a digital co-working community, and creator of NebulaKit —
              an engineering-first SvelteKit + Cloudflare starter. Designs and ships production
              systems across eCommerce, AI content generation, Discord automation, DAO governance, and
              generative music. Strong advocate for TDD, agile practices, and building in public.
            </p>
          </section>

          <section class="r-section">
            <h2 class="r-title">Experience</h2>

            <article class="r-job">
              <div class="r-job-header">
                <div>
                  <h3 class="r-job-title">Founder &amp; Community Architect</h3>
                  <a class="r-job-org" href="https://starspace.group">*Space (starspace.group)</a>
                </div>
                <time class="r-job-dates">2024–Present</time>
              </div>
              <ul class="r-bullets">
                <li>Founded and grew a digital co-working community on Discord; built the full tooling stack powering operations.</li>
                <li>Designed Athena: a two-token DAO governance framework (SpaceTime + SpaceMoney) separating labor influence from economic stake; published whitepaper.</li>
                <li>Architected and shipped NebulaKit — open-source SvelteKit + Cloudflare starter with TDD, OAuth, AI interfaces, real-time capabilities.</li>
                <li>Built SpaceBot (open source): Discord ops platform with slash commands, event-driven automation, AI workflows, REST API, and analytics.</li>
              </ul>
            </article>

            <article class="r-job">
              <div class="r-job-header">
                <div>
                  <h3 class="r-job-title">Founder &amp; Lead Engineer</h3>
                  <a class="r-job-org" href="https://agapeverse.app">AgapeVerse (agapeverse.app)</a>
                </div>
                <time class="r-job-dates">2024–Present</time>
              </div>
              <ul class="r-bullets">
                <li>Launched AI poem generation web app; serves 37+ users, 138+ poems from live production data.</li>
                <li>Dual-model AI tier: Cloudflare Workers AI (free tier), Anthropic Claude Haiku (premium/acrostic) with 150–170× revenue margin.</li>
                <li>Full Stripe subscription system, HeartPoints economy, admin CMS with super-admin prompt overrides.</li>
                <li>Migrated from Deno Fresh to SvelteKit before Deno Deploy Classic sunset (July 2026 deadline), including full production KV data export/import pipeline.</li>
              </ul>
            </article>

            <article class="r-job">
              <div class="r-job-header">
                <div>
                  <h3 class="r-job-title">Founder &amp; Lead Engineer</h3>
                  <span class="r-job-org-plain">Ammoura / Nabu</span>
                </div>
                <time class="r-job-dates">2025–Present</time>
              </div>
              <ul class="r-bullets">
                <li>Designing Ammoura: multi-tenant eCommerce + website builder (SvelteKit + Cloudflare D1/R2/KV + Stripe), launching 4 storefronts on 9/11/2026.</li>
                <li>Building Nabu: marketing automation — AI content generation (CF Workers AI) with auto-publishing to Dev.to and LinkedIn via Cloudflare Cron.</li>
              </ul>
            </article>

            <article class="r-job">
              <div class="r-job-header">
                <div>
                  <h3 class="r-job-title">Freelance Web Developer</h3>
                  <span class="r-job-org-plain">Independent</span>
                </div>
                <time class="r-job-dates">2022–Present</time>
              </div>
              <ul class="r-bullets">
                <li>robbieschroeder.com — full site for comedian/artist/musician; Nuxt 3 + TinaCMS.</li>
                <li>Sample/client websites for small businesses and professionals using Svelte.</li>
              </ul>
            </article>

          </section>

          <section class="r-section">
            <h2 class="r-title">Open Source</h2>
            <ul class="r-oss">
              <li>
                <span class="r-oss-arrow" aria-hidden="true">▹</span>
                <div>
                  <strong>docs.deno.com</strong> — Dark/light theme toggle for official Deno documentation
                </div>
              </li>
              <li>
                <span class="r-oss-arrow" aria-hidden="true">▹</span>
                <div>
                  <strong>fresh.deno.dev/docs</strong> — Dark/light theme toggle for Deno Fresh docs
                </div>
              </li>
              <li>
                <span class="r-oss-arrow" aria-hidden="true">▹</span>
                <div>
                  <strong>NebulaKit</strong>
                  <span class="r-oss-repo">(starspacegroup/NebulaKit)</span>
                  — SvelteKit + Cloudflare framework
                </div>
              </li>
              <li>
                <span class="r-oss-arrow" aria-hidden="true">▹</span>
                <div>
                  <strong>SpaceBot</strong>
                  <span class="r-oss-repo">(starspacegroup/spacebot)</span>
                  — Discord ops platform
                </div>
              </li>
            </ul>
          </section>

          <section class="r-section">
            <h2 class="r-title">Portfolio</h2>
            <div class="r-portfolio">
              <a href="https://nebulakit.starspace.group" class="r-pcard">
                <span class="r-pcard-name">NebulaKit</span>
                <span class="r-pcard-desc">SvelteKit + Cloudflare engineering-first starter</span>
              </a>
              <a href="https://agapeverse.app" class="r-pcard">
                <span class="r-pcard-name">AgapeVerse</span>
                <span class="r-pcard-desc">AI poem generation · SvelteKit + Claude API + Stripe</span>
              </a>
              <a href="https://spacebot.starspace.group" class="r-pcard">
                <span class="r-pcard-name">SpaceBot</span>
                <span class="r-pcard-desc">Discord community ops platform (open source)</span>
              </a>
              <a href="https://game.starspace.group" class="r-pcard">
                <span class="r-pcard-name">StarSpace Game</span>
                <span class="r-pcard-desc">Real-time multiplayer browser game on a sphere world</span>
              </a>
              <a href="https://trill-symbiont.starspace.group" class="r-pcard">
                <span class="r-pcard-name">Trill Symbiont</span>
                <span class="r-pcard-desc">Shared generative ambient music · Circle of Fifths + physics</span>
              </a>
              <a href="https://athena.starspace.group" class="r-pcard">
                <span class="r-pcard-name">Athena DAO</span>
                <span class="r-pcard-desc">Two-token governance framework · whitepaper published</span>
              </a>
            </div>
          </section>

        </main>
      </div>
    </div>
  </div>
</main>

<style>
  /* ── Page wrapper ──────────────────────────────────────────── */
  .resume-page {
    padding: 2rem 1rem 3rem;
    font-size: 14px;
  }

  /* ── Hero header — matches home page hero section ──────────── */
  .resume-hero {
    max-width: 56rem;
    margin: 0 auto 2rem;
    padding-bottom: 1.5rem;
  }

  .resume-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 1rem;
    display: block;
    filter: drop-shadow(0 0 20px hsla(var(--accent), 0.40));
    transition: filter 300ms ease;
  }

  .resume-logo:hover {
    filter: drop-shadow(0 0 36px hsla(var(--accent), 0.60));
  }

  .resume-name {
    font-size: 3.2rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 0.3rem;
    color: hsla(var(--foreground));
    text-shadow: 0 2px 30px hsla(var(--primary), 0.45);
  }

  .resume-aka {
    font-style: italic;
    font-size: 0.9rem;
    color: hsla(var(--foreground), 0.55);
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .resume-role {
    font-size: 1rem;
    font-weight: 600;
    color: hsla(var(--foreground), 0.88);
    margin-bottom: 0.4rem;
    line-height: 1.3;
  }

  .resume-location {
    font-size: 0.75rem;
    color: hsla(var(--foreground), 0.45);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Content card — matches home page .content-card ───────── */
  .resume-card {
    max-width: 68rem;
    margin: 0 auto;
    border: 1px solid hsla(var(--foreground), 0.1);
    box-shadow: 0 12px 40px hsla(var(--background), 0.5);
  }

  /* ── Two-column grid ────────────────────────────────────────── */
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
      border-radius: 0.75rem 0.75rem 0 0 !important;
    }
    .resume-name {
      font-size: 2.2rem;
    }
  }

  /* ── Left column ─────────────────────────────────────────────── */
  .r-left {
    padding: 1.5rem 1.25rem;
    border-right: 1px solid hsla(var(--foreground), 0.1);
    border-radius: 0.75rem 0 0 0.75rem;
    text-align: left;
  }

  /* ── Right column ────────────────────────────────────────────── */
  .r-right {
    padding: 1.5rem 1.5rem 1.5rem 1.75rem;
    text-align: left;
  }

  /* ── Section chrome ──────────────────────────────────────────── */
  .r-section {
    margin-bottom: 1.6rem;
  }

  .r-title {
    font-size: 11px;
    font-weight: 700;
    color: hsla(var(--secondary));
    text-transform: uppercase;
    letter-spacing: 0.16em;
    border-left: 3px solid hsla(var(--accent), 0.7);
    padding-left: 8px;
    margin-bottom: 0.85rem;
    line-height: 1;
  }

  /* ── Contact ─────────────────────────────────────────────────── */
  .r-contact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .r-contact li {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .r-icon {
    font-size: 11px;
    color: hsla(var(--accent));
    width: 14px;
    flex-shrink: 0;
    text-align: center;
  }

  .r-contact a {
    font-size: 12px;
    color: hsla(var(--secondary));
    text-decoration: none;
    word-break: break-all;
    transition: color 150ms ease;
  }

  .r-contact a:hover {
    color: hsla(var(--foreground));
  }

  /* ── Skills ──────────────────────────────────────────────────── */
  .r-skill {
    margin-bottom: 0.65rem;
  }

  .r-skill-cat {
    font-size: 11px;
    font-weight: 600;
    color: hsla(var(--accent));
    letter-spacing: 0.03em;
    margin-bottom: 2px;
  }

  .r-skill p {
    font-size: 12px;
    color: hsla(var(--foreground), 0.6);
    line-height: 1.5;
    margin: 0;
  }

  /* ── Links (left col) ────────────────────────────────────────── */
  .r-links {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .r-links a {
    font-size: 12px;
    color: hsla(var(--secondary));
    text-decoration: none;
    word-break: break-all;
    transition: color 150ms ease;
  }

  .r-links a:hover {
    color: hsla(var(--foreground));
  }

  /* ── Summary ─────────────────────────────────────────────────── */
  .r-summary {
    font-size: 14px;
    color: hsla(var(--foreground), 0.85);
    line-height: 1.78;
    margin: 0;
  }

  .r-summary em {
    color: hsla(var(--accent));
    font-style: normal;
    font-weight: 500;
  }

  /* ── Experience ──────────────────────────────────────────────── */
  .r-job {
    margin-bottom: 1.35rem;
    padding-bottom: 1.35rem;
    border-bottom: 1px solid hsla(var(--foreground), 0.08);
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
    margin-bottom: 0.5rem;
  }

  .r-job-title {
    font-size: 15px;
    font-weight: 700;
    color: hsla(var(--foreground), 0.95);
    line-height: 1.25;
    margin: 0 0 2px;
  }

  .r-job-org {
    font-size: 13px;
    color: hsla(var(--secondary));
    text-decoration: none;
    transition: color 150ms ease;
  }

  .r-job-org:hover {
    color: hsla(var(--foreground));
  }

  .r-job-org-plain {
    font-size: 13px;
    color: hsla(var(--foreground), 0.5);
  }

  .r-job-dates {
    font-size: 12px;
    color: hsla(var(--foreground), 0.45);
    white-space: nowrap;
    padding-top: 2px;
    flex-shrink: 0;
  }

  .r-bullets {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .r-bullets li {
    font-size: 13px;
    color: hsla(var(--foreground), 0.82);
    padding-left: 1.1rem;
    position: relative;
    line-height: 1.62;
  }

  .r-bullets li::before {
    content: '▹';
    position: absolute;
    left: 0;
    color: hsla(var(--accent));
    font-size: 11px;
    top: 2px;
  }

  /* ── Open Source ─────────────────────────────────────────────── */
  .r-oss {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .r-oss li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .r-oss-arrow {
    color: hsla(var(--accent));
    font-size: 11px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .r-oss li div {
    font-size: 13px;
    color: hsla(var(--foreground), 0.82);
    line-height: 1.55;
    text-align: left;
  }

  .r-oss strong {
    color: hsla(var(--accent));
    font-weight: 600;
  }

  .r-oss-repo {
    font-size: 12px;
    color: hsla(var(--foreground), 0.45);
  }

  /* ── Portfolio grid ──────────────────────────────────────────── */
  .r-portfolio {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  @media (max-width: 480px) {
    .r-portfolio {
      grid-template-columns: 1fr;
    }
  }

  /* Portfolio cards — same frosted-glass style as home page CTAs */
  .r-pcard {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0.75rem 1rem;
    background: hsla(var(--background), 0.42);
    border: 1px solid hsla(var(--foreground), 0.08);
    border-radius: 0.5rem;
    text-decoration: none;
    transition: all 200ms ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .r-pcard:hover {
    background: hsla(var(--background), 0.68);
    border-color: hsla(var(--accent), 0.22);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px -8px hsla(var(--primary), 0.35);
  }

  .r-pcard-name {
    font-size: 14px;
    font-weight: 700;
    color: hsla(var(--accent));
    line-height: 1.2;
  }

  .r-pcard-desc {
    font-size: 12px;
    color: hsla(var(--foreground), 0.55);
    line-height: 1.5;
    text-align: left;
  }

  /* ── Desktop scale-up ────────────────────────────────────────── */
  @media (min-width: 768px) {
    .resume-logo {
      width: 96px;
      height: 96px;
    }

    .resume-name {
      font-size: 4.5rem;
    }

    .resume-aka {
      font-size: 1.1rem;
    }

    .resume-role {
      font-size: 1.2rem;
    }

    .resume-page {
      padding: 3rem 1rem 4rem;
    }
  }

  @media (min-width: 1024px) {
    .resume-name {
      font-size: 5.5rem;
    }
  }

  /* ── Print / PDF ─────────────────────────────────────────────── */
  @media print {
    @page {
      size: letter;
      margin: 0.5in;
    }

    /* Kill the ASCII grid and background effects */
    :global(html) { font-size: 10pt; }

    main {
      background: #ffffff !important;
      color: #1a1a1a !important;
    }

    /* Hide decorative/interactive elements */
    div[aria-hidden="true"],
    .resume-logo,
    :global(.theme-switcher) {
      display: none !important;
    }

    .resume-page {
      padding: 0;
      font-size: 10pt;
    }

    .resume-hero {
      padding-bottom: 0.2in;
      border-bottom: 1.5px solid #ddd;
      margin-bottom: 0.15in;
    }

    .resume-name {
      font-size: 26pt;
      color: #1a1a1a;
      text-shadow: none;
    }

    .resume-aka {
      color: #555;
      font-size: 10pt;
    }

    .resume-role {
      color: #2a2a2a;
      font-size: 10.5pt;
    }

    .resume-location {
      color: #777;
    }

    .resume-card {
      background: transparent !important;
      backdrop-filter: none !important;
      border: none !important;
      box-shadow: none !important;
    }

    .resume-columns {
      grid-template-columns: 28fr 72fr;
    }

    .r-left {
      background: #f6f4ff !important;
      backdrop-filter: none !important;
      border-right: 1px solid #ddd !important;
      padding: 0.12in 0.12in 0.12in 0.08in;
    }

    .r-right {
      padding: 0.12in 0 0.12in 0.18in;
    }

    .r-title {
      color: #c07020;
      border-left-color: #22a855;
      font-size: 7.5pt;
    }

    .r-contact a,
    .r-links a,
    .r-job-org {
      color: #1a7f5a;
    }

    .r-icon,
    .r-bullets li::before,
    .r-oss-arrow,
    .r-oss strong,
    .r-skill-cat {
      color: #22a855;
    }

    .r-skill p,
    .r-job-org-plain,
    .r-job-dates,
    .r-oss-repo {
      color: #555;
    }

    .r-summary,
    .r-bullets li,
    .r-oss li div {
      color: #1a1a1a;
    }

    .r-job-title {
      color: #111;
    }

    .r-summary em {
      color: #22a855;
    }

    .r-pcard {
      background: transparent !important;
      backdrop-filter: none !important;
      border-color: #ddd !important;
      box-shadow: none !important;
      transform: none !important;
    }

    .r-pcard-name {
      color: #22a855;
    }

    .r-pcard-desc {
      color: #555;
    }

    .r-job         { page-break-inside: avoid; }
    .r-section     { page-break-inside: avoid; }
    .r-portfolio   { page-break-inside: avoid; }
  }
</style>
