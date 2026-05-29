# davis9001.dev

> A SvelteKit and Cloudflare Workers website platform focused on content publishing, portfolio presentation, and interactive features.

[![Powered by Cloudflare](https://img.shields.io/badge/Powered%20by-Cloudflare-F38020?style=flat&logo=cloudflare)](https://www.cloudflare.com/)
[![Built with SvelteKit](https://img.shields.io/badge/Built%20with-SvelteKit-FF3E00?style=flat&logo=svelte)](https://kit.svelte.dev/)
[![Built from NebulaKit](https://img.shields.io/badge/Built%20from-NebulaKit-0EA5E9?style=flat)](https://github.com/starspacegroup/nebulakit)

## About

This project is a production-ready website platform built with SvelteKit and deployed to Cloudflare's edge network. It started from [NebulaKit](https://github.com/starspacegroup/nebulakit), then extended into a custom implementation. The foundation combines static and dynamic pages, authenticated admin tooling, API endpoints, and a unified design system with accessible theming.

NebulaKit provides the baseline structure used here, including:

- SvelteKit + Cloudflare-ready project scaffolding
- Route and API organization conventions
- Authentication and admin workflow foundations
- Content and CMS-friendly architecture patterns
- Theme-aware UI structure and reusable component patterns

## How It Works

### Architecture

- **Framework**: SvelteKit with server routes and API endpoints
- **Runtime**: Cloudflare Workers
- **Data layer**: D1 (SQL), KV (configuration/cache), optional R2/Queues integrations
- **Auth**: OAuth-based sign-in flows with server-side session handling
- **Content model**: Markdown-backed content plus CMS-managed dynamic content types

### Rendering Strategy

- **Server-side rendering** for dynamic routes and authenticated areas
- **Static-friendly content delivery** for documentation/blog-style pages
- **Edge-first APIs** for low-latency interactions and integrations

### Content Flow

- Content is sourced from Markdown files and CMS-managed records.
- Route loaders resolve data at request time.
- Shared utilities normalize metadata for listing pages and detail pages.
- Admin endpoints provide CRUD operations for managed content types.

## Core Features

- Portfolio and project presentation pages
- Blog/update publishing system with slug-based routing
- Admin dashboard for configuration and content management
- AI chat interface with optional voice session support
- Command palette and keyboard-first navigation
- OAuth authentication flows and protected routes
- Responsive layout and mobile-first interaction patterns

## Design System

- **Theme system**: Light/dark themes implemented with CSS custom properties
- **Accessibility-first**: WCAG AA contrast targets and semantic markup patterns
- **Consistent spacing and typography scale**: shared design tokens in global styles
- **Component-driven UI**: reusable Svelte components for navigation, layout, and interaction

## Built From

- **[NebulaKit](https://github.com/starspacegroup/nebulakit)** — Starter foundation for SvelteKit + Cloudflare architecture, auth/admin workflows, and content-oriented project structure

## Tech Stack

- **[SvelteKit](https://kit.svelte.dev/)** — Full-stack framework
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Edge runtime (D1, KV, R2, Queues, Turnstile)
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety throughout
- **[Vite](https://vitejs.dev/)** — Build tooling
- **Auth.js** — Authentication with GitHub and Discord OAuth
- **Spotify API** — Now-playing widget on the home page

## Features

- Light/dark theming with WCAG AA contrast compliance
- Command palette for quick navigation and actions
- Edge API routes for integrations and dynamic data
- Mobile-first responsive design
- Content management capabilities for dynamic site sections
- Comprehensive automated test coverage for core systems

## Development

```bash
bun install        # Install dependencies
bun run dev        # Start dev server on port 4242
bun run build      # Production build
bun run deploy     # Build and deploy to Cloudflare Pages
```

### Testing

This project follows **Test-Driven Development** with 95%+ code coverage.

```bash
bun run test              # Run unit tests
bun run test:coverage     # Run with coverage report
bun run test:e2e          # Run Playwright E2E tests
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
