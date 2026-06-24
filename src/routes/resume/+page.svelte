<script lang="ts">
  // Static resume page — no reactive state needed
</script>

<svelte:head>
  <title>David Monaghan — Résumé</title>
  <meta name="description" content="Full-Stack Software Engineer · Community Architect · Founder. Clarkdale, Arizona." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300;400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="r-shell">
  <!-- Fixed background decorations -->
  <div class="r-bg-glow" aria-hidden="true"></div>
  <div class="r-stars" aria-hidden="true"></div>

  <!-- ─── Header ─────────────────────────────────────────────── -->
  <header class="r-header">
    <div class="r-orbital" aria-hidden="true"></div>
    <h1 class="r-name">David Monaghan</h1>
    <p class="r-subtitle">Full-Stack Software Engineer · Community Architect · Founder</p>
    <p class="r-location">Clarkdale, Arizona</p>
  </header>

  <!-- ─── Two-column body ─────────────────────────────────────── -->
  <div class="r-body">

    <!-- LEFT COLUMN: Contact, Skills, Links -->
    <aside class="r-left">

      <section class="r-section">
        <h2 class="r-section-title">Contact</h2>
        <ul class="r-contact">
          <li>
            <span class="r-ci" aria-hidden="true">✉</span>
            <a href="mailto:monaghan.david@gmail.com">monaghan.david@gmail.com</a>
          </li>
          <li>
            <span class="r-ci" aria-hidden="true">◈</span>
            <a href="https://davis9001.dev">davis9001.dev</a>
          </li>
          <li>
            <span class="r-ci" aria-hidden="true">⌘</span>
            <a href="https://github.com/davis9001">github.com/davis9001</a>
          </li>
          <li>
            <span class="r-ci" aria-hidden="true">in</span>
            <a href="https://linkedin.com/in/davidmonaghan">linkedin.com/in/davidmonaghan</a>
          </li>
          <li>
            <span class="r-ci" aria-hidden="true">☁</span>
            <a href="https://bsky.app/profile/davis9001.dev">bsky.app/profile/davis9001.dev</a>
          </li>
        </ul>
      </section>

      <section class="r-section">
        <h2 class="r-section-title">Skills</h2>
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
        <h2 class="r-section-title">Links</h2>
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

    <!-- RIGHT COLUMN: Summary, Experience, OSS, Portfolio -->
    <main class="r-right">

      <section class="r-section">
        <h2 class="r-section-title">Summary</h2>
        <p class="r-summary">
          Self-taught engineer turned systems architect with deep experience building full-stack web
          applications, community platforms, and AI-integrated products on Cloudflare's edge. Founder
          of <em>*Space</em>, a digital co-working community, and creator of NebulaKit — an
          engineering-first SvelteKit + Cloudflare starter. Designs and ships production systems
          across eCommerce, AI content generation, Discord automation, DAO governance, and generative
          music. Strong advocate for TDD, agile practices, and building in public.
        </p>
      </section>

      <section class="r-section">
        <h2 class="r-section-title">Experience</h2>

        <article class="r-job">
          <div class="r-job-header">
            <div class="r-job-meta">
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
            <div class="r-job-meta">
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
            <div class="r-job-meta">
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
            <div class="r-job-meta">
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
        <h2 class="r-section-title">Open Source</h2>
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
        <h2 class="r-section-title">Portfolio</h2>
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

<style>
  /* ── AgapeVerse dark-mode palette & type tokens ─────────────── */
  .r-shell {
    --bg:    hsl(265, 30%,  7%);
    --surf:  hsl(265, 25%, 12%);
    --text:  hsl(265, 20%, 92%);
    --text2: hsl(265, 15%, 60%);
    --vio:   hsl(265, 70%, 78%);
    --rose:  hsl(345, 85%, 72%);
    --gold:  hsl( 42, 95%, 68%);
    --teal:  hsl(190, 75%, 70%);
    --bord:  hsla(265, 30%, 50%, 0.25);
    --fh:    'Fraunces', 'Instrument Serif', Georgia, serif;
    --fb:    'Inter', system-ui, sans-serif;

    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--fb);
    font-size: 14px;
    line-height: 1.65;
    overflow-x: hidden;
  }

  /* Neutralise the global h1/h2/h3 font-size blowup from app.css */
  .r-shell :global(h1),
  .r-shell :global(h2),
  .r-shell :global(h3) {
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    margin: 0;
    padding: 0;
  }

  .r-shell :global(ul),
  .r-shell :global(ol) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* ── Fixed background decorations ──────────────────────────── */

  /* Nebula glow — top-right quadrant */
  .r-bg-glow {
    position: fixed;
    top: -280px;
    right: -280px;
    width: 860px;
    height: 860px;
    background: radial-gradient(
      circle,
      hsla(265, 72%, 52%, 0.13) 0%,
      hsla(265, 60%, 40%, 0.05) 50%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }

  /* Star-field via box-shadow dots */
  .r-stars {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Large/bright stars */
  .r-stars::before {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: transparent;
    /* stylelint-disable */
    box-shadow:
       47px   83px 0 0 rgba(255,255,255,0.90),
      143px  156px 0 0 rgba(255,255,255,0.45),
      234px   45px 0 0 rgba(255,255,255,0.75),
      389px  178px 0 0 rgba(255,255,255,0.35),
      512px   67px 0 0 rgba(255,255,255,0.65),
      678px  234px 0 0 rgba(255,255,255,0.55),
      834px   89px 0 0 rgba(255,255,255,0.85),
      923px  267px 0 0 rgba(255,255,255,0.40),
     1056px  134px 0 0 rgba(255,255,255,0.70),
     1189px  289px 0 0 rgba(255,255,255,0.50),
     1312px   56px 0 0 rgba(255,255,255,0.80),
     1445px  201px 0 0 rgba(255,255,255,0.60),
     1567px  345px 0 0 rgba(255,255,255,0.40),
     1689px  123px 0 0 rgba(255,255,255,0.90),
     1812px  267px 0 0 rgba(255,255,255,0.50),
       89px  456px 0 0 rgba(255,255,255,0.55),
      234px  578px 0 0 rgba(255,255,255,0.38),
      412px  489px 0 0 rgba(255,255,255,0.75),
      567px  623px 0 0 rgba(255,255,255,0.45),
      734px  512px 0 0 rgba(255,255,255,0.65),
      890px  678px 0 0 rgba(255,255,255,0.35),
     1034px  534px 0 0 rgba(255,255,255,0.60),
     1178px  712px 0 0 rgba(255,255,255,0.48),
     1345px  589px 0 0 rgba(255,255,255,0.80),
     1490px  734px 0 0 rgba(255,255,255,0.38),
     1623px  612px 0 0 rgba(255,255,255,0.68),
     1756px  478px 0 0 rgba(255,255,255,0.50),
      156px 1012px 0 0 rgba(255,255,255,0.45),
      312px 1167px 0 0 rgba(255,255,255,0.65),
      489px 1089px 0 0 rgba(255,255,255,0.35),
      678px 1234px 0 0 rgba(255,255,255,0.58),
      823px 1145px 0 0 rgba(255,255,255,0.78),
     1012px 1289px 0 0 rgba(255,255,255,0.38),
     1189px 1156px 0 0 rgba(255,255,255,0.48),
     1367px 1312px 0 0 rgba(255,255,255,0.65),
     1534px 1189px 0 0 rgba(255,255,255,0.35),
     1712px 1345px 0 0 rgba(255,255,255,0.55);
    /* stylelint-enable */
  }

  /* Small/dim stars */
  .r-stars::after {
    content: '';
    position: absolute;
    width: 1px;
    height: 1px;
    border-radius: 50%;
    background: transparent;
    /* stylelint-disable */
    box-shadow:
       78px  312px 0 0 rgba(255,255,255,0.35),
      189px  423px 0 0 rgba(255,255,255,0.25),
      301px  267px 0 0 rgba(255,255,255,0.42),
      456px  389px 0 0 rgba(255,255,255,0.25),
      590px  145px 0 0 rgba(255,255,255,0.35),
      723px  356px 0 0 rgba(255,255,255,0.22),
      856px  423px 0 0 rgba(255,255,255,0.42),
      990px  178px 0 0 rgba(255,255,255,0.25),
     1123px  412px 0 0 rgba(255,255,255,0.35),
     1256px  234px 0 0 rgba(255,255,255,0.22),
     1389px  467px 0 0 rgba(255,255,255,0.42),
     1523px  301px 0 0 rgba(255,255,255,0.25),
     1656px  434px 0 0 rgba(255,255,255,0.35),
     1789px  189px 0 0 rgba(255,255,255,0.22),
      123px  823px 0 0 rgba(255,255,255,0.35),
      267px  934px 0 0 rgba(255,255,255,0.22),
      456px  756px 0 0 rgba(255,255,255,0.42),
      623px  867px 0 0 rgba(255,255,255,0.25),
      778px  934px 0 0 rgba(255,255,255,0.35),
      934px  812px 0 0 rgba(255,255,255,0.22),
     1089px  956px 0 0 rgba(255,255,255,0.42),
     1245px  823px 0 0 rgba(255,255,255,0.25),
     1400px  967px 0 0 rgba(255,255,255,0.35),
     1556px  834px 0 0 rgba(255,255,255,0.22),
     1712px  978px 0 0 rgba(255,255,255,0.32),
      234px 1412px 0 0 rgba(255,255,255,0.25),
      445px 1534px 0 0 rgba(255,255,255,0.35),
      634px 1456px 0 0 rgba(255,255,255,0.22),
      823px 1578px 0 0 rgba(255,255,255,0.42),
     1012px 1445px 0 0 rgba(255,255,255,0.25),
     1201px 1589px 0 0 rgba(255,255,255,0.32),
     1390px 1467px 0 0 rgba(255,255,255,0.22),
     1578px 1612px 0 0 rgba(255,255,255,0.35),
     1756px 1489px 0 0 rgba(255,255,255,0.22);
    /* stylelint-enable */
  }

  /* ── Header ─────────────────────────────────────────────────── */
  .r-header {
    position: relative;
    text-align: center;
    padding: 3.8rem 2rem 2.6rem;
    z-index: 1;
    overflow: visible;
  }

  /* Dashed orbital ring — decorative CSS circle behind the name */
  .r-orbital {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    border: 1px dashed hsla(265, 70%, 78%, 0.20);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-14deg);
    pointer-events: none;
  }

  .r-orbital::after {
    content: '';
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    border: 1px dashed hsla(345, 85%, 72%, 0.11);
    transform: rotate(30deg);
  }

  .r-name {
    font-family: var(--fh);
    font-size: 56px;
    font-weight: 700;
    line-height: 1.05;
    color: var(--gold);
    letter-spacing: -0.022em;
    margin-bottom: 0.55rem;
    text-shadow:
      0 0 45px hsla(42, 95%, 68%, 0.28),
      0 0 90px hsla(42, 95%, 68%, 0.12);
    position: relative;
    z-index: 1;
  }

  .r-subtitle {
    font-size: 15px;
    font-weight: 300;
    color: var(--text2);
    letter-spacing: 0.045em;
    margin-bottom: 0.35rem;
    position: relative;
    z-index: 1;
  }

  .r-location {
    font-size: 13px;
    color: hsla(265, 14%, 48%, 1);
    letter-spacing: 0.08em;
    position: relative;
    z-index: 1;
  }

  /* ── Two-column layout ─────────────────────────────────────── */
  .r-body {
    display: grid;
    grid-template-columns: 28fr 72fr;
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 1.5rem 3.5rem;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 740px) {
    .r-body {
      grid-template-columns: 1fr;
      padding: 0 1rem 2.5rem;
    }

    .r-name {
      font-size: 38px;
    }

    .r-left {
      border-radius: 8px 8px 0 0 !important;
      border-right: none !important;
      border-bottom: 1px solid var(--bord) !important;
    }

    .r-right {
      padding: 1.5rem 0 0 !important;
    }
  }

  /* ── Left column ───────────────────────────────────────────── */
  .r-left {
    background: var(--surf);
    border-right: 1px solid var(--bord);
    border-radius: 8px 0 0 8px;
    padding: 1.6rem 1.25rem;
  }

  /* ── Right column ──────────────────────────────────────────── */
  .r-right {
    padding: 1.6rem 0 1.6rem 1.8rem;
  }

  /* ── Shared section chrome ─────────────────────────────────── */
  .r-section {
    margin-bottom: 1.8rem;
  }

  .r-section-title {
    font-family: var(--fh);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--vio);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    border-left: 3px solid var(--rose);
    padding-left: 8px;
    margin-bottom: 0.9rem;
    line-height: 1;
  }

  /* ── Contact ───────────────────────────────────────────────── */
  .r-contact {
    display: flex;
    flex-direction: column;
    gap: 0.52rem;
  }

  .r-contact li {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .r-ci {
    font-size: 11px;
    color: var(--rose);
    width: 14px;
    flex-shrink: 0;
    text-align: center;
  }

  .r-contact a {
    font-size: 12px;
    color: var(--teal);
    text-decoration: none;
    word-break: break-all;
    transition: color 140ms;
  }

  .r-contact a:hover {
    color: var(--vio);
  }

  /* ── Skills ────────────────────────────────────────────────── */
  .r-skill {
    margin-bottom: 0.7rem;
  }

  .r-skill-cat {
    font-size: 11px;
    font-weight: 600;
    color: var(--rose);
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }

  .r-skill p {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.5;
  }

  /* ── Left-column links ─────────────────────────────────────── */
  .r-links {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .r-links a {
    font-size: 12px;
    color: var(--teal);
    text-decoration: none;
    word-break: break-all;
    transition: color 140ms;
  }

  .r-links a:hover {
    color: var(--vio);
  }

  /* ── Summary ───────────────────────────────────────────────── */
  .r-summary {
    font-size: 14px;
    color: var(--text);
    line-height: 1.80;
  }

  .r-summary em {
    color: var(--vio);
    font-style: normal;
  }

  /* ── Experience ────────────────────────────────────────────── */
  .r-job {
    margin-bottom: 1.45rem;
    padding-bottom: 1.45rem;
    border-bottom: 1px solid var(--bord);
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
    margin-bottom: 0.55rem;
  }

  .r-job-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .r-job-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
  }

  .r-job-org {
    font-size: 13px;
    color: var(--teal);
    text-decoration: none;
    transition: color 140ms;
  }

  .r-job-org:hover {
    color: var(--vio);
  }

  .r-job-org-plain {
    font-size: 13px;
    color: var(--text2);
  }

  .r-job-dates {
    font-size: 12px;
    color: var(--text2);
    white-space: nowrap;
    padding-top: 2px;
    flex-shrink: 0;
  }

  .r-bullets {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .r-bullets li {
    font-size: 13px;
    color: var(--text);
    padding-left: 1.15rem;
    position: relative;
    line-height: 1.62;
  }

  .r-bullets li::before {
    content: '▹';
    position: absolute;
    left: 0;
    color: var(--rose);
    font-size: 11px;
    top: 2px;
  }

  /* ── Open Source ───────────────────────────────────────────── */
  .r-oss {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .r-oss li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .r-oss-arrow {
    color: var(--rose);
    font-size: 11px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .r-oss li div {
    font-size: 13px;
    color: var(--text);
    line-height: 1.55;
  }

  .r-oss strong {
    color: var(--vio);
    font-weight: 600;
  }

  .r-oss-repo {
    font-size: 12px;
    color: var(--text2);
  }

  /* ── Portfolio grid ────────────────────────────────────────── */
  .r-portfolio {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  @media (max-width: 520px) {
    .r-portfolio {
      grid-template-columns: 1fr;
    }
  }

  .r-pcard {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    background: hsla(265, 30%, 50%, 0.07);
    border: 1px solid var(--bord);
    border-radius: 7px;
    text-decoration: none;
    transition:
      border-color 180ms,
      background   180ms,
      box-shadow   180ms,
      transform    180ms;
  }

  .r-pcard:hover {
    border-color: hsla(265, 70%, 78%, 0.48);
    background: hsla(265, 30%, 50%, 0.14);
    box-shadow: 0 0 20px hsla(265, 70%, 78%, 0.10);
    transform: translateY(-2px);
  }

  .r-pcard-name {
    font-family: var(--fh);
    font-size: 14px;
    font-weight: 600;
    color: var(--vio);
    line-height: 1.2;
  }

  .r-pcard-desc {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.52;
  }

  /* ── Print / PDF ───────────────────────────────────────────── */
  @media print {
    @page {
      size: letter;
      margin: 0.5in;
    }

    .r-shell {
      background: #ffffff;
      color: #1a1a1a;
      font-size: 10pt;
    }

    /* Hide decorative elements */
    .r-bg-glow,
    .r-stars,
    .r-orbital {
      display: none !important;
    }

    .r-header {
      padding: 0 0 0.25in;
      border-bottom: 1.5px solid #ddd6f5;
      margin-bottom: 0.18in;
    }

    .r-name {
      color: hsl(42, 85%, 32%);
      text-shadow: none;
      font-size: 26pt;
    }

    .r-subtitle {
      color: #4a4a5e;
      font-size: 10.5pt;
    }

    .r-location {
      color: #7a7a8e;
      font-size: 9.5pt;
    }

    .r-body {
      padding: 0;
      max-width: 100%;
    }

    .r-left {
      background: #f8f6ff;
      border-right: 1px solid #e0d6f5;
      border-radius: 0;
      padding: 0.12in 0.12in 0.12in 0.08in;
    }

    .r-right {
      padding: 0.12in 0 0.12in 0.18in;
    }

    .r-section-title {
      color: hsl(265, 55%, 35%);
      border-left-color: hsl(345, 72%, 48%);
      font-size: 7.5pt;
    }

    .r-contact a,
    .r-links a {
      color: hsl(190, 65%, 30%);
      font-size: 8.5pt;
    }

    .r-skill p { color: #555; font-size: 8.5pt; }
    .r-skill-cat { color: hsl(345, 65%, 40%); }

    .r-job-title { color: #111; font-size: 10pt; }
    .r-job-org { color: hsl(190, 65%, 30%); }
    .r-job-org-plain,
    .r-job-dates { color: #666; }

    .r-bullets li {
      color: #2a2a2a;
      font-size: 9pt;
    }

    .r-bullets li::before,
    .r-oss-arrow,
    .r-ci { color: hsl(345, 65%, 40%); }

    .r-summary { color: #2a2a2a; }
    .r-summary em { color: hsl(265, 50%, 40%); }

    .r-oss strong { color: hsl(265, 50%, 38%); }
    .r-oss li div,
    .r-oss-repo { color: #444; font-size: 9pt; }

    .r-pcard {
      background: transparent;
      border-color: #ddd6f5;
      box-shadow: none;
      transform: none;
    }

    .r-pcard-name {
      color: hsl(265, 55%, 35%);
      font-size: 9.5pt;
    }

    .r-pcard-desc {
      color: #555;
      font-size: 8.5pt;
    }

    /* Prevent ugly mid-section page breaks */
    .r-job         { page-break-inside: avoid; }
    .r-section     { page-break-inside: avoid; }
    .r-pcard       { page-break-inside: avoid; }
    .r-portfolio   { page-break-inside: avoid; }
  }
</style>
