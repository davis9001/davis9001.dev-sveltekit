---
title: Building SpaceBot, NebulaKit, Ammoura, and Athena: A Deep Progress Update
publishedAt: 2026-04-22T17:00:00Z
summary: A long-form update on what I have been building lately across SpaceBot, NebulaKit, Ammoura.me, and Athena, including how the two-token DAO model is being designed for *Space and related organizations.
tags: [spacebot, nebulakit, ammoura, athena, dao, starspace, sveltekit, cloudflare, startup, governance]
---

Over the last stretch of months, I have been in one of the most focused build phases of my life.

I have been splitting my time across four connected projects:

- [SpaceBot](https://spacebot.starspace.group/)
- [NebulaKit](https://nebulakit.starspace.group/)
- [Ammoura.me](https://ammoura.me/)
- [Athena for *Space DAO](https://athena.starspace.group/)

They might look like separate products on the surface, but in my mind they are part of one ecosystem.

The short version is this: I am trying to build practical, creator-first infrastructure that helps people organize communities, launch projects faster, and eventually govern shared systems in a way that is actually fair, transparent, and durable.

This post is a full update on what is shipping now, what is still rough, what I learned the hard way, and where all of this is going next.

## The Big Picture

I keep returning to the same idea: most people with strong ideas still get blocked by tooling complexity, coordination friction, and power concentration.

So I am attacking the problem from multiple angles:

- **SpaceBot** is about operational power for online communities.
- **NebulaKit** is about development velocity with real engineering discipline.
- **Ammoura** is about reducing the time from idea to online business.
- **Athena** is about long-term governance architecture so projects can scale without collapsing into chaos or centralization.

Each product solves a different layer of the stack, from "run the server" to "launch the product" to "govern the organization behind it."

## SpaceBot: From Utility Bot to Full Community Ops Platform

[SpaceBot](https://spacebot.starspace.group/) has evolved far beyond my original plan.

At first, I wanted a bot that could handle useful Discord basics cleanly: slash commands, role actions, moderation helpers, event logs, and simple automations. But once I started building it with a proper admin surface and event model, the product naturally expanded into a full operations platform.

### What SpaceBot now includes

- Custom slash commands with parameters and permission controls
- Event-driven automations with trigger/filter/action chains
- AI assistant workflows through bot interactions and dashboard tooling
- Searchable logs and server analytics
- REST API access for external integrations
- Scheduler support for recurring and one-time tasks

The key shift was this: instead of treating Discord as "just chat," I started treating a server as a programmable organization.

Once you do that, the feature roadmap becomes obvious. People need auditability. They need automation. They need role-safe delegation. They need to integrate external services without writing everything from scratch.

That is exactly where SpaceBot is headed.

### Open source and edge deployment

SpaceBot is fully open source on GitHub:

- [SpaceBot GitHub Repository](https://github.com/starspacegroup/spacebot)

And like most of my current stack, it is built around Cloudflare edge primitives for speed, low latency, and operational simplicity.

## NebulaKit: Codifying the Build System I Wanted for Years

[NebulaKit](https://nebulakit.starspace.group/) started from frustration.

I kept seeing the same pattern: people can generate code quickly now, but they still struggle to architect maintainable systems with testing discipline, production-safe defaults, and Cloudflare-native deployment patterns.

So I stopped waiting for the perfect starter and built the one I wanted.

### What NebulaKit is solving

NebulaKit is designed to shorten the path between:

1. "I have an idea"
2. "I have a working app"
3. "I can keep this app healthy for months and years"

It gives a SvelteKit + Cloudflare baseline with practical defaults for:

- Authentication
- API organization
- Theme and design system foundations
- Testing and TDD workflows
- Voice/text AI interfaces
- Real-time capabilities
- Documentation and contributor onboarding

### Why this matters now

AI can generate code quickly, but speed without structure creates technical debt at machine scale.

NebulaKit is my attempt to keep the upside of AI-assisted development while preserving engineering rigor. It is not anti-AI. It is pro-discipline.

If you want to check it out:

- [NebulaKit Site](https://nebulakit.starspace.group/)
- [NebulaKit GitHub Repository](https://github.com/starspacegroup/NebulaKit)

## Ammoura.me: Website Builder + Commerce + AI in One Flow

[Ammoura.me](https://ammoura.me/) is one of the boldest products I am currently shaping.

The idea is simple to describe but hard to execute well:

Make it possible for someone to go from zero to a high-quality online brand presence and monetization setup without fighting ten different tools.

### Vision for Ammoura

Ammoura is being built as a cohesive workflow that combines:

- Website building
- eCommerce capabilities
- AI-assisted content and design acceleration

I care a lot about this because so many creators, freelancers, and small teams get stuck in setup mode for months. They are talented, but they are blocked by platform complexity and fragmented tooling.

Ammoura is my attempt to collapse that complexity into one intentional product experience.

### Product principle: power without overwhelm

The hard part is not adding features. The hard part is balancing depth and clarity.

I want Ammoura to feel powerful on day one for advanced users, while still letting a beginner publish something they are proud of quickly.

That requires a lot of thoughtful product design, not just engineering.

Under Ammoura, I am also designing a project called **Nabu** to handle the branding and marketing organization/automation needed to bring a product or service to market and keep growing it through multimedia content and social media posts of all kinds.

## Athena: Building a Two-Token DAO Framework for *Space

This is the part I am most intellectually and ethically invested in right now.

I am actively working on Athena as the governance and mechanism design layer for *Space and potentially other aligned organizations.

- [Athena / *Space DAO](https://athena.starspace.group/)
- [Athena Whitepaper](https://athena.starspace.group/whitepaper)

### Why a two-token model?

Many DAOs have one recurring failure mode: economic capital can directly dominate governance.

That turns "decentralization" into plutocracy.

Athena is being designed around a two-token architecture intended to separate these concerns:

- **Labor / governance token**: earned through meaningful contribution and used for governance influence.
- **Economic / stake token**: tied to treasury and economic participation.

On Athena right now, this framing is represented as:

- **SpaceTime (ST)** for earned governance weight
- **SpaceMoney (SM)** for economic stake

The motivation is straightforward: work should earn voice, and capital should earn stake, but money alone should not be able to buy full political control.

### Beyond token mechanics: credible decentralization

A governance system is only as real as its power transition logic.

One thing I care about deeply is designing explicit transition pathways where founder control is reduced over time through measurable triggers, not vague promises.

That means hard questions around:

- What milestones qualify for governance transition?
- How is proposal quality measured?
- How do we prevent Sybil behavior and collusion?
- How do we preserve adaptability without centralizing emergency authority forever?

I do not claim this is solved. I do claim it is being worked on with seriousness, and I am committed to publishing the design assumptions and tradeoffs openly.

### Why this matters for organizations beyond *Space

If Athena works, it should not be limited to one brand.

I believe similar organizations, cooperatives, online communities, creator guilds, and mission-driven startups could use this framework to:

- reward actual contribution
- preserve economic participation
- avoid governance capture
- build toward transparent, auditable decision-making

That is the long game.

## How These Projects Connect

I do not see these as side quests.

I see an integrated progression:

- **SpaceBot** helps communities operate.
- **NebulaKit** helps builders ship faster with quality.
- **Ammoura** helps creators commercialize and scale.
- **Athena** helps organizations govern sustainably.

In other words: tools, infrastructure, product, governance.

This is my current map for building resilient digital organizations that can eventually bridge into physical-world impact.

## What Is Going Well

A few things are clearly working:

- Building in public creates better feedback loops than private perfection cycles.
- Cloudflare-first architecture continues to be a strong choice for my use cases.
- Tight feedback between product and engineering decisions is speeding iteration.
- Reusable patterns across projects are compounding (especially via NebulaKit).

I am also getting better at operating multiple products without losing thread continuity, mostly by forcing clear boundaries between product scope and shared infrastructure.

## What Is Still Hard

Not everything is smooth, and I want to be explicit about that.

- Context switching across product, architecture, and governance design is cognitively expensive.
- Coordination overhead grows quickly when products become interconnected.
- The governance layer requires careful communication so it stays legible and not just "crypto jargon."
- Ambition can outpace execution if I do not keep shipping priorities brutally clear.

This phase is less about "can this be built" and more about "can this be built responsibly and maintained long term."

## A Recent Detour: Migrating AgapeVerse to NebulaKit

One major sidetrack recently has been [AgapeVerse](https://agapeverse.app/), my AI poem project.

I originally built it with Deno Fresh, and it served me well for the first phase. As NebulaKit matured, I already had plans to consolidate more of my active projects onto a shared starter and architecture baseline.

That migration became more urgent when Deno Deploy announced it is sunsetting the platform configuration I was using, which meant I would have needed to do substantial updates there anyway.

So I have been spending time converting AgapeVerse from its Deno Fresh implementation to a NebulaKit-based foundation.

I am also taking this opportunity to add much-needed functionality to the original MVP, including the ability to edit poems either manually or by using additional AI prompts to refine tone, structure, or intent.

This migration has taken real focus and definitely pulled cycles away from other roadmap items, but I still think it is the right long-term move. It gives me more consistency across projects, better reuse of patterns, and a cleaner path for future features and maintenance.

In short: yes, I have been sidetracked, but it is a strategic sidetrack that should pay off across the whole ecosystem.

## What Comes Next

My near-term priorities are:

1. Continue hardening SpaceBot's automation, analytics, and integration model.
2. Keep improving NebulaKit as the default high-discipline starter for this stack.
3. Push Ammoura toward a strong end-to-end publishing and commerce workflow.
4. Expand Athena's mechanism clarity, simulations, and governance onboarding.

I am especially focused on making sure Athena is understandable to non-specialists. If governance systems cannot be understood by normal contributors, they fail their core purpose.

## Closing Thoughts

This has been one of my most intense and meaningful build periods so far.

I am not just trying to ship products. I am trying to build a coherent ecosystem where people can create, collaborate, and eventually co-govern with real transparency and agency.

If you want to follow along, explore, or contribute, here are the key links:

- [*Space](https://starspace.group/)
- [SpaceBot](https://spacebot.starspace.group/)
- [SpaceBot GitHub](https://github.com/starspacegroup/spacebot)
- [NebulaKit](https://nebulakit.starspace.group/)
- [NebulaKit GitHub](https://github.com/starspacegroup/NebulaKit)
- [Ammoura](https://ammoura.me/)
- [Athena / *Space DAO](https://athena.starspace.group/)
- [Athena Whitepaper](https://athena.starspace.group/whitepaper)

More updates soon. I am heads-down, still building.
