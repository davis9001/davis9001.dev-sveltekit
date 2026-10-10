// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type {
	D1Database,
	IncomingRequestCfProperties,
	KVNamespace,
	Queue,
	R2Bucket
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				login: string;
				email: string;
				name?: string;
				avatarUrl?: string;
				isOwner: boolean;
				isAdmin?: boolean;
				/** Honoured by stats-guard as a tier above owner; never set here. */
				isSuperAdmin?: boolean;
				/** Per-admin stats grant (migration 0017), refreshed on every request. */
				canViewStats?: boolean;
			};
			/** Set by the CMS content route so the page-view hook can attribute the
			 *  view to an item without a second lookup (docs/ADMIN_STATS.md). */
			viewedContentId?: string;
		}
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				BUCKET: R2Bucket;
				QUEUE: Queue;
				TURNSTILE_SECRET_KEY: string;
				EXPECTED_DB_APP_ID?: string;
				GITHUB_CLIENT_ID?: string;
				GITHUB_CLIENT_SECRET?: string;
				GITHUB_OWNER_ID?: string;
				GITHUB_OWNER_USERNAME?: string;
				DISCORD_CLIENT_ID?: string;
				DISCORD_CLIENT_SECRET?: string;
				SPOTIFY_CLIENT_ID?: string;
				SPOTIFY_CLIENT_SECRET?: string;
				SPOTIFY_REDIRECT_URI?: string;
				SPOTIFY_REFRESH_TOKEN?: string;
				DISCORD_WEBHOOK_URL?: string;
				GH_API_TOKEN?: string;
				/** Shared bearer secret for /api/cron/* scheduler endpoints. */
				CRON_SECRET?: string;
			};
			/** Cloudflare request metadata. `cf.country` is the edge-provided ISO
			 *  3166-1 alpha-2 code used by page-view stats — undefined locally. */
			cf?: IncomingRequestCfProperties;
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache; };
		}
	}

	/** Google Analytics globals, present only after the optional GA tag is
	 *  installed by `src/lib/components/GoogleAnalytics.svelte`. */
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

export { };
