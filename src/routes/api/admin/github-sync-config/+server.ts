/**
 * GitHub sync PAT storage — owner-only.
 * GET    → { configured: boolean, maskedToken: string | null }
 * PUT    → { success: true } (validates the token against GitHub before saving)
 * DELETE → { success: true }
 *
 * Owner-only (not the usual isOwner||isAdmin admin gate): this token can
 * create/close issues and mutate boards across any repo it can reach —
 * broader blast radius than the other admin-managed credentials.
 */
import { GithubApiError } from '$lib/github/client';
import { GITHUB_SYNC_PAT_KV_KEY, type StoredGithubPat } from '$lib/github/config';
import { fetchViewerLogin } from '$lib/github/queries';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function requireOwner(locals: App.Locals): void {
	if (!locals.user?.isOwner) {
		throw error(403, 'Owner access required');
	}
}

function maskToken(token: string): string {
	return `••••${token.slice(-4)}`;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	requireOwner(locals);

	if (!platform?.env?.KV) {
		return json({ configured: false, maskedToken: null });
	}

	const raw = await platform.env.KV.get(GITHUB_SYNC_PAT_KV_KEY);
	if (!raw) {
		return json({ configured: false, maskedToken: null });
	}

	const stored = JSON.parse(raw) as StoredGithubPat;
	return json({ configured: true, maskedToken: maskToken(stored.token), login: stored.login });
};

export const PUT: RequestHandler = async ({ locals, platform, request }) => {
	requireOwner(locals);

	if (!platform?.env?.KV) {
		throw error(500, 'KV not available');
	}

	const body = await request.json().catch(() => null);
	const token = (body as { token?: unknown } | null)?.token;
	if (typeof token !== 'string' || !token.trim()) {
		throw error(400, 'token is required');
	}

	let login: string;
	try {
		login = await fetchViewerLogin(token.trim());
	} catch (err) {
		const message =
			err instanceof GithubApiError ? err.message : 'Failed to validate token with GitHub';
		throw error(400, message);
	}

	const stored: StoredGithubPat = {
		token: token.trim(),
		login,
		updatedAt: new Date().toISOString()
	};
	await platform.env.KV.put(GITHUB_SYNC_PAT_KV_KEY, JSON.stringify(stored));

	return json({ success: true, login });
};

export const DELETE: RequestHandler = async ({ locals, platform }) => {
	requireOwner(locals);

	if (platform?.env?.KV) {
		await platform.env.KV.delete(GITHUB_SYNC_PAT_KV_KEY);
	}

	return json({ success: true });
};
