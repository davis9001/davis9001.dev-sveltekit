# davis9001.dev

> Personal website, portfolio, and blog of Davis Monaghan — Software and Community Architect.

[![Powered by Cloudflare](https://img.shields.io/badge/Powered%20by-Cloudflare-F38020?style=flat&logo=cloudflare)](https://www.cloudflare.com/)
[![Built with SvelteKit](https://img.shields.io/badge/Built%20with-SvelteKit-FF3E00?style=flat&logo=svelte)](https://kit.svelte.dev/)

## About

[davis9001.dev](https://davis9001.dev) is my personal corner of the internet — a portfolio, dev blog, and playground for creative experiments. It's built with SvelteKit using [NebulaKit](https://github.com/starspacegroup/nebulakit) as the starting template, and runs on Cloudflare's edge network.

## What's on the Site

### Portfolio

A showcase of projects I've built, including:

- **[starspace.group](https://starspace.group)** — Digital coworking community landing page
- **[game.starspace.group](https://game.starspace.group)** — Multiplayer browser game
- **[Trill Symbiont](https://trill-symbiont.starspace.group)** — Generative ambient music tool using the Web Audio API
- **[AgapeVerse](https://agapeverse.app)** — AI-powered love poem generator
- **[robbieschroeder.com](https://robbieschroeder.com)** — Artist/musician portfolio (freelance)
- Open-source contributions to [Deno docs](https://docs.deno.com) and [Deno Fresh](https://fresh.deno.dev/docs) (dark theme)
- Sample sites for restaurants and therapists

### Blog

Posts on software engineering, open-source contributions, AI trends, creative coding, and occasional observations about crows in Maine.

### Chat

An AI chat interface with voice support and conversation history.

### Life of a Stranger

An interactive art installation experiment.

## Tech Stack

- **[SvelteKit](https://kit.svelte.dev/)** — Full-stack framework
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Edge runtime (D1, KV, R2, Queues, Turnstile)
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety throughout
- **[Vite](https://vitejs.dev/)** — Build tooling
- **Auth.js** — Authentication with GitHub and Discord OAuth
- **Spotify API** — Now-playing widget on the home page

## Features

- Light/dark theme with WCAG AA contrast compliance
- Command palette (Ctrl/Cmd + K)
- Animated crow characters and ASCII art grid on the landing page
- GitHub activity feed
- Mobile-first responsive design
- Content management system for blog posts and dynamic content

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server on port 4242
npm run build      # Production build
npm run deploy     # Build and deploy to Cloudflare Pages
```

### Testing

This project follows **Test-Driven Development** with 95%+ code coverage.

```bash
npm run test              # Run unit tests
npm run test:coverage     # Run with coverage report
npm run test:e2e          # Run Playwright E2E tests
```

## Project Structure

```
src/
├── lib/
│   ├── components/       # Svelte UI components
│   ├── cms/              # Content management
│   ├── services/         # Business logic
│   ├── stores/           # Svelte stores
│   ├── types/            # TypeScript types
│   └── utils/            # Helpers
├── routes/               # SvelteKit pages and API endpoints
├── projects/             # Portfolio project markdown files
└── updates/              # Blog post markdown files
migrations/               # Cloudflare D1 database migrations
```

## License

MIT
