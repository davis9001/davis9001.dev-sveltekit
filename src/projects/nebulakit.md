---
url: "https://nebulakit.starspace.group"
title: "NebulaKit"
summary: "A SvelteKit starter template on Cloudflare's full stack — auth, CMS, D1, KV, R2, theming, command palette and an AI workspace wired up from day one."
technologies: [
  "SvelteKit",
  "TypeScript",
  "Cloudflare Pages",
  "D1",
  "KV",
  "R2",
  "Turnstile",
  "Bun",
  "Vitest",
  "Playwright",
]
latestContribution: 2026-08-29
---

Every new SvelteKit app on Cloudflare starts the same way: wire up auth, bind
D1 and KV and R2, build a theme system, add a session layer, set up tests. Days
of the same plumbing before a single feature gets written. NebulaKit is that
plumbing, built once and tested.

It ships email/password accounts with GitHub and Discord OAuth and account
linking, a typed CMS with media uploads and guarded admin editing, an AI
workspace with configurable provider keys and streaming chat, first-party
analytics with no third-party tracker, and a light/dark theme system on CSS
variables with automated WCAG-AA contrast checks. The shell adds a Cmd+K
command palette and a widget board where every pointer gesture has a keyboard
equivalent. Agents get a dynamic sitemap, an API catalog, Agent Skills
discovery and HTML-to-Markdown negotiation.

## The admin stats page

Analytics are first-party and cookie-free — aggregate counters only, no
per-visitor data, no third-party tracker. Page views, platform usage against
the Cloudflare free-tier allowance, referrers, countries, and coarse audience
buckets derived from request headers at request time. The raw User-Agent is
never stored.

![NebulaKit admin stats page in dark mode](/nebulakit/admin-stats-dark.webp)

The same page in light mode. Both themes are stepped independently against
their own surface and validated for colorblind separation, not flipped from
one another.

![NebulaKit admin stats page in light mode](/nebulakit/admin-stats-light.webp)

## Built on it

The whole thing sits behind a TDD harness with a 95% coverage floor. Click "Use
this template", run the customisation script once, and deploy.

Several of my own projects run on it, and features that prove themselves
downstream get folded back into the kit. Two of them were rebuilt on it from
the ground up: this site, davis9001.dev, and
[AgapeVerse](https://agapeverse.app) — the AI poem generator that started on
Deno Fresh and now runs the whole NebulaKit stack.

- Template: https://github.com/starspacegroup/NebulaKit
- The site above is itself a NebulaKit app: https://github.com/starspacegroup/nebulakit-site
- This site, rebuilt on NebulaKit: https://github.com/davis9001/davis9001.dev-sveltekit
- AgapeVerse, rebuilt on NebulaKit: https://agapeverse.app
