// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { D1Database, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types';

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
			};
		}
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				BUCKET: R2Bucket;
				QUEUE: Queue;
				TURNSTILE_SECRET_KEY: string;
				GITHUB_CLIENT_ID?: string;
				GITHUB_CLIENT_SECRET?: string;
				GITHUB_OWNER_ID?: string;
				DISCORD_CLIENT_ID?: string;
				DISCORD_CLIENT_SECRET?: string;
				SPOTIFY_CLIENT_ID?: string;
				SPOTIFY_CLIENT_SECRET?: string;
				SPOTIFY_REFRESH_TOKEN?: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache; };
		}
	}
}

export { };
