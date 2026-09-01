---
url: "https://agapeverse.app"
title: "AgapeVerse"
summary: "An AI poem studio — tell it who the poem is for and what the occasion is, then edit, print, or send what comes back. Started on Deno Fresh in October 2024, rebuilt on NebulaKit."
technologies: [
  "SvelteKit",
  "TypeScript",
  "Cloudflare Pages",
  "D1",
  "KV",
  "R2",
  "Stripe",
  "OpenAI",
  "Anthropic",
  "Cloudflare Workers AI",
  "TipTap",
  "Vitest",
  "Playwright",
]
latestContribution: 2026-08-26
---

AgapeVerse writes personal poems. You say who it is for and what the occasion
is, the poem arrives seconds later, and then you can work on it — edit it,
print it, or send it. It started as a small side project from a passion to
share goodness with the world, and it kept growing.

![The AgapeVerse home page](/agapeverse/home-{theme}.webp)

## What it makes

Poems come in a few shapes. A basic poem is the straight ask. A hidden-message
poem is an acrostic — the first letters spell out something only the recipient
will catch. The workshop takes a poem you already have and revises it against
a note about what you want changed.

Every poem gets a permalink, and the ones people choose to make public can be
read by anyone.

![A generated poem on its permalink page](/agapeverse/poem-{theme}.webp)

Those public poems collect in a community gallery.

![The community poem gallery](/agapeverse/poems-{theme}.webp)

## How it is built

The original ran on Deno Fresh and Deno Deploy. It now runs on
[NebulaKit](/portfolio/project/nebulakit), my SvelteKit starter for
Cloudflare's stack — D1 for data, KV for sessions, R2 for files, GitHub,
Google and Discord sign-in, and a CMS-backed blog.

Generation is multi-provider rather than tied to one vendor: OpenAI,
Anthropic, and Cloudflare Workers AI all sit behind one interface, with model
choice and keys configurable from the admin UI. There is a streaming chat
workspace and voice sessions on top of it.

Billing runs on Stripe. Capacity is metered in HeartPoints — a credit that
different poem types spend at different rates, so the free tier is a real
allowance rather than a trial, and unused credit carries over on paid plans.

![The AgapeVerse pricing page](/agapeverse/pricing-{theme}.webp)
