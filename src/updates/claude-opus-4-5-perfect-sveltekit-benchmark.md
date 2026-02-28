---
title: "Claude Opus 4.5 Hits 100% on SvelteBench: My AI Coding Setup for 2025"
publishedAt: 2025-11-30
summary: After months of using Claude Sonnet 4.5 with GitHub Copilot Pro+, I've switched to Opus 4.5 which just achieved a perfect 100% score on SvelteBench. Here's my recommended setup for SvelteKit developers and how I'm building an AI-powered Agile assistant called Apollo.
tags: [ai, sveltekit, github-copilot, claude, agile, development]
---

I've been building a lot with **SvelteKit** lately, and like many developers in
2025, I rely heavily on AI coding assistants to boost my productivity. For the
past several months, I've been using **GitHub Copilot Pro+** with **Claude
Sonnet 4.5** as my primary model—and it's been fantastic. But just recently,
something even better came along.

## The SvelteBench Benchmark

If you're building with SvelteKit and want to know which AI model will serve you
best, check out
[SvelteBench](https://khromov.github.io/svelte-bench/benchmark-results-merged.html)—a
comprehensive benchmark that tests how well different LLMs understand and
generate SvelteKit code. It covers everything from basic reactivity (`counter`,
`derived`, `effect`) to more advanced concepts like `snippets` and `props`.

I'd been watching this benchmark for a while. Sonnet 4.5 was doing really well,
and I thought it was at over 99% at some point—though the benchmark may have
been updated or the model may have changed slightly. Either way, it was
consistently one of the top performers.

Then **Claude Opus 4.5** dropped.

## Opus 4.5: Perfect Score

When I checked SvelteBench after the Opus 4.5 release, I was genuinely surprised
to see it hit **100% across every single test**:

- **counter** — 100%
- **derived** — 100%
- **derived-by** — 100%
- **each** — 100%
- **effect** — 100%
- **hello-world** — 100%
- **inspect** — 100%
- **props** — 100%
- **snippets** — 100%

This is remarkable. Even the `inspect` test, which the benchmark notes has
"known correctness issues," Opus 4.5 handles flawlessly. For comparison, Sonnet
4.5 still performs excellently but shows some variation in the `inspect` test
(40% Pass@1). The difference is subtle but meaningful when you're writing a lot
of Svelte code.

## My Recommendation for SvelteKit Developers

If you're serious about SvelteKit development and want the best AI assistance
available, here's my recommendation:

### 1. Get GitHub Copilot Pro+ ($40/month)

The Pro+ tier gives you access to the most capable models, including Claude Opus
4.5. While the regular Copilot is good, Pro+ with Opus 4.5 is on another level
for framework-specific code generation. The $40/month is absolutely worth it if
you're coding professionally.

### 2. Use GitHub Issues with Agile User Stories

Beyond just using AI for code generation, I've found that combining GitHub
Issues with proper Agile/SCRUM methodology dramatically improves project
organization. Structure your issues as user stories:

> **As a** [user type], **I want** [some goal], **So that** [some reason].

This format isn't just good for human collaboration—it's also excellent context
for AI assistants. When your issues are well-structured, AI tools can better
understand what you're trying to accomplish.

### 3. Leverage GitHub Projects

Organize your issues into GitHub Projects with proper sprint planning. The
combination of well-written user stories and organized project boards creates a
powerful workflow that AI assistants can tap into.

## Building Apollo: An AI Agile Assistant

Speaking of AI and Agile methodology, I've actually been building something to
help bridge this gap. **Apollo** is an AI-powered voice/text chatbot that acts
as an Agile/SCRUM assistant. It can:

- Help create new issues as properly formatted user stories
- Organize work in GitHub repositories
- Integrate with GitHub Projects for sprint planning
- Provide voice or text interaction for quick project management

You can check out Apollo at
[apollo.starspace.group](https://apollo.starspace.group), and the source code is
available at
[github.com/starspacegroup/apollo](https://github.com/starspacegroup/apollo).

The idea is to make project management as seamless as having a conversation.
Instead of context-switching between coding and project management tools, you
can just tell Apollo what needs to happen, and it handles the GitHub integration
for you.

## The Bottom Line

The AI coding landscape is evolving rapidly. Just when I thought Sonnet 4.5 was
the peak for SvelteKit development, Opus 4.5 came along and proved there's still
room to improve. If you're building with SvelteKit in 2025:

1. **Use GitHub Copilot Pro+** with Claude Opus 4.5
2. **Organize your work** with GitHub Issues and Projects
3. **Write proper user stories** to give AI better context
4. **Check benchmarks like SvelteBench** to stay informed about which models
   work best for your stack

The combination of a 100%-accurate AI model and well-organized Agile workflows
is a game-changer for productivity. Happy coding! 🚀
