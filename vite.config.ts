import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Vite marks optimized dep chunks as immutable, but their ?v= generation
// changes on every dep re-optimization. Any cache between the tunnel and the
// browser (Cloudflare edge, browser disk) can then serve chunks from mixed
// generations — two Svelte runtimes load at once and hydration crashes to a
// black screen. Force no-store for requests arriving via the tunnel host;
// localhost keeps normal caching.
function tunnelNoStore(tunnelHost: string | undefined): Plugin {
	return {
		name: 'tunnel-no-store',
		apply: 'serve',
		configureServer(server) {
			if (!tunnelHost) return;
			server.middlewares.use((req, res, next) => {
				if (req.headers.host === tunnelHost) {
					const setHeader = res.setHeader.bind(res);
					res.setHeader = (name, value) =>
						String(name).toLowerCase() === 'cache-control'
							? setHeader('Cache-Control', 'no-store')
							: setHeader(name, value);
					res.setHeader('Cache-Control', 'no-store');
				}
				next();
			});
		}
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [tunnelNoStore(env.DEV_TUNNEL_HOST), sveltekit(), svelteTesting()],
		server: {
			// The dev tunnel hostname is secret (this repo is public) — set
			// DEV_TUNNEL_HOST in .env.local to expose the dev server through it
			allowedHosts: env.DEV_TUNNEL_HOST ? [env.DEV_TUNNEL_HOST] : []
		},
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
			exclude: ['node_modules', 'tests/e2e/**'],
			environment: 'happy-dom',
			globals: true,
			setupFiles: ['./tests/setup.ts'],
			coverage: {
				provider: 'v8',
				// 'json-summary' emits coverage/coverage-summary.json, which the CI
				// coverage-threshold step reads via jq. Without it that step fails on
				// every run — including fully green ones — because the file is absent.
				reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
				exclude: [
					'node_modules/',
					'tests/',
					'*.config.{js,ts}',
					'**/*.d.ts',
					'**/*.test.{js,ts}',
					'**/*.spec.{js,ts}',
					'.svelte-kit/',
					'build/',
					'scripts/',
					'static/',
					// Svelte components contain UI logic that's hard to unit test branches
					// These are tested via E2E tests for user interaction flows
					'**/*.svelte',
					// Page route type files that just define load types
					'src/routes/**/+page.ts',
					// Hooks are tested implicitly through integration tests
					'src/hooks.server.ts'
				],
				// Matches the 95% hard floor in CLAUDE.md. These were 90 while the
				// doc said 95, so the written rule enforced nothing.
				thresholds: {
					lines: 95,
					functions: 95,
					branches: 95,
					statements: 95
				}
			},
			poolOptions: {
				threads: {
					singleThread: true
				}
			},
			teardownTimeout: 5000
		}
	};
});
