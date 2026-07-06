/**
 * Open Projects — admin API request validation
 *
 * Turns an untrusted JSON body into a clean OpenProjectInput.
 * Throws { status: 400 } style errors via the provided fail callback so the
 * route layer decides how errors surface.
 */

import {
	PROJECT_PRIORITIES,
	PROJECT_STATUSES,
	type OpenProjectInput,
	type ProjectPriority,
	type ProjectStatus
} from './types';
import { normalizeExtraLinks, normalizeTasks } from './utils';

export type ValidationResult =
	| { ok: true; input: OpenProjectInput }
	| { ok: false; message: string };

/**
 * Validate and coerce a request body into an OpenProjectInput.
 * Only keys present in the body end up in the result, so the same function
 * serves POST (with requireIdentity) and PUT (partial patch).
 */
export function validateProjectInput(
	body: unknown,
	options: { requireIdentity?: boolean } = {}
): ValidationResult {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, message: 'Invalid JSON body' };
	}

	const raw = body as Record<string, unknown>;
	const input: OpenProjectInput = {};

	if ('group' in raw) {
		if (typeof raw.group !== 'string' || !raw.group.trim()) {
			return { ok: false, message: 'group must be a non-empty string' };
		}
		input.group = raw.group.trim();
	}
	if ('name' in raw) {
		if (typeof raw.name !== 'string' || !raw.name.trim()) {
			return { ok: false, message: 'name must be a non-empty string' };
		}
		input.name = raw.name.trim();
	}

	if (options.requireIdentity) {
		if (input.group === undefined) return { ok: false, message: 'group is required' };
		if (input.name === undefined) return { ok: false, message: 'name is required' };
	}

	if ('status' in raw) {
		if (!PROJECT_STATUSES.includes(raw.status as ProjectStatus)) {
			return { ok: false, message: 'Invalid status' };
		}
		input.status = raw.status as ProjectStatus;
	}
	if ('priority' in raw) {
		if (!PROJECT_PRIORITIES.includes(raw.priority as ProjectPriority)) {
			return { ok: false, message: 'Invalid priority' };
		}
		input.priority = raw.priority as ProjectPriority;
	}

	if ('description' in raw) {
		input.description = typeof raw.description === 'string' ? raw.description : '';
	}
	if ('blockers' in raw) {
		input.blockers = typeof raw.blockers === 'string' ? raw.blockers : '';
	}
	if ('primaryLink' in raw) {
		input.primaryLink =
			typeof raw.primaryLink === 'string' && raw.primaryLink.trim() ? raw.primaryLink.trim() : null;
	}
	if ('githubUrl' in raw) {
		input.githubUrl =
			typeof raw.githubUrl === 'string' && raw.githubUrl.trim() ? raw.githubUrl.trim() : null;
	}
	if ('extraLinks' in raw) {
		input.extraLinks = normalizeExtraLinks(raw.extraLinks);
	}
	if ('tasks' in raw) {
		input.tasks = normalizeTasks(raw.tasks);
	}
	if ('sortOrder' in raw) {
		if (typeof raw.sortOrder !== 'number' || !Number.isFinite(raw.sortOrder)) {
			return { ok: false, message: 'sortOrder must be a number' };
		}
		input.sortOrder = raw.sortOrder;
	}

	return { ok: true, input };
}

/** Validate a bulk reorder body: { updates: [{ id, sortOrder }] } */
export function validateReorderInput(
	body: unknown
): { ok: true; updates: { id: string; sortOrder: number }[] } | { ok: false; message: string } {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, message: 'Invalid JSON body' };
	}

	const updates = (body as Record<string, unknown>).updates;
	if (!Array.isArray(updates) || updates.length === 0) {
		return { ok: false, message: 'updates must be a non-empty array' };
	}

	const clean: { id: string; sortOrder: number }[] = [];
	for (const u of updates) {
		const entry = u as Record<string, unknown>;
		if (
			!entry ||
			typeof entry.id !== 'string' ||
			!entry.id ||
			typeof entry.sortOrder !== 'number' ||
			!Number.isFinite(entry.sortOrder)
		) {
			return { ok: false, message: 'each update needs an id and a numeric sortOrder' };
		}
		clean.push({ id: entry.id, sortOrder: entry.sortOrder });
	}

	return { ok: true, updates: clean };
}
