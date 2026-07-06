/**
 * Open Projects for the command palette.
 *
 * The root layout seeds the palette with this server-loaded list so project
 * entries render instantly; the palette then re-fetches /api/projects every
 * time it opens to stay synchronized with the real data.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { listOpenProjects } from '$lib/services/open-projects';

export interface PaletteProject {
	name: string;
	group: string;
	status: string;
	primaryLink: string | null;
}

export const PALETTE_PROJECTS_TTL_MS = 60_000;

let cache: { data: PaletteProject[]; expires: number } | null = null;

/** Cached palette-shaped project list (per-isolate, 60s TTL) */
export async function getCachedPaletteProjects(
	db: D1Database | undefined,
	now: () => number = Date.now
): Promise<PaletteProject[]> {
	if (cache && cache.expires > now()) {
		return cache.data;
	}
	if (!db) {
		return [];
	}
	try {
		const projects = await listOpenProjects(db);
		const data = projects.map((p) => ({
			name: p.name,
			group: p.group,
			status: p.status,
			primaryLink: p.primaryLink
		}));
		cache = { data, expires: now() + PALETTE_PROJECTS_TTL_MS };
		return data;
	} catch (err) {
		console.error('Failed to load palette projects:', err);
		return [];
	}
}

/** Test hook */
export function clearPaletteProjectsCache(): void {
	cache = null;
}
