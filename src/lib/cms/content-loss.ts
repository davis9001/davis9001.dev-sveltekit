/**
 * Write-path guard against saves that silently destroy authored markup.
 *
 * The CMS body editor is TipTap. Anything its schema cannot model is not
 * merely dropped on save — it is flattened into prose, so the save reports
 * success and the post keeps a plausible length. That is how both chart
 * figures in taking-on-client-websites-again were destroyed on 2026-08-08
 * and stayed wrong in public for five days.
 *
 * richtext-preserved-block-extension.ts fixes the shapes we know about. This is the net underneath
 * it: a save that reduces the count of any hard-to-recreate element is
 * refused, naming what would be lost, unless the caller explicitly opts in.
 * It catches the cases nobody has thought of yet, which is the point — the
 * failure mode is silence, and silence is what this converts into an error.
 *
 * Deliberately NOT guarded: <img>, headings, lists, paragraphs. Those are
 * modelled by the editor, deleting them is ordinary editing, and guarding
 * them would train the override into a reflex.
 */

import type { ContentFieldDefinition } from './types';

export interface GuardedElement {
	/** Stable key for the element class */
	key: string;
	/** Singular human label used in the refusal message */
	label: string;
	/** Matches an opening tag / marker occurrence in sanitized HTML */
	pattern: string;
}

/**
 * Elements a WYSIWYG round-trip can destroy invisibly. Each is authored by
 * hand, expensive to recreate, and has no visible "deleted" moment in the
 * editor for the author to notice.
 */
export const GUARDED_ELEMENTS: GuardedElement[] = [
	// Charts and illustrations. Preserved by PreservedBlock, guarded anyway so a
	// regression in that extension surfaces as a refused save, not a lost chart.
	{ key: 'svg', label: 'inline SVG', pattern: '<svg[\\s>]' },
	{ key: 'figure', label: 'figure', pattern: '<figure[\\s>]' },
	{ key: 'figcaption', label: 'figure caption', pattern: '<figcaption[\\s>]' },
	// Not modelled by StarterKit: a table round-trips to a single paragraph.
	{ key: 'table', label: 'table', pattern: '<table[\\s>]' },
	// Svelte embeds survive the editor, but losing one silently is still bad.
	{ key: 'embed', label: 'Svelte embed', pattern: 'data-svelte-embed=' }
];

/** A single element class whose count fell between two versions of a field. */
export interface ContentLoss {
	field: string;
	key: string;
	label: string;
	before: number;
	after: number;
}

/** Count each guarded element in a sanitized HTML string. */
export function countGuardedElements(html: unknown): Record<string, number> {
	const counts: Record<string, number> = {};
	const source = typeof html === 'string' ? html : '';
	for (const element of GUARDED_ELEMENTS) {
		// Fresh RegExp per call — a shared /g/ instance carries lastIndex between
		// calls and would undercount on every other invocation.
		counts[element.key] = (source.match(new RegExp(element.pattern, 'gi')) ?? []).length;
	}
	return counts;
}

/**
 * Compare incoming richtext fields against what is currently stored.
 *
 * Only fields present in BOTH are compared: a field absent from the incoming
 * payload is a partial update, not a deletion. Returns every element class
 * whose count fell, so the caller can name all of them at once.
 */
export function detectContentLoss(
	existingFields: Record<string, unknown> | null | undefined,
	incomingFields: Record<string, unknown> | null | undefined,
	definitions: ContentFieldDefinition[]
): ContentLoss[] {
	if (!existingFields || !incomingFields) return [];

	const losses: ContentLoss[] = [];

	for (const definition of definitions) {
		if (definition.type !== 'richtext') continue;

		const before = existingFields[definition.name];
		const after = incomingFields[definition.name];
		if (typeof before !== 'string' || typeof after !== 'string') continue;

		const beforeCounts = countGuardedElements(before);
		const afterCounts = countGuardedElements(after);

		for (const element of GUARDED_ELEMENTS) {
			const was = beforeCounts[element.key];
			const now = afterCounts[element.key];
			if (now < was) {
				losses.push({
					field: definition.name,
					key: element.key,
					label: element.label,
					before: was,
					after: now
				});
			}
		}
	}

	return losses;
}

/** Human-readable refusal naming exactly what would have been lost. */
export function describeContentLoss(losses: ContentLoss[]): string {
	const parts = losses.map((loss) => {
		const lost = loss.before - loss.after;
		const plural = lost === 1 ? loss.label : `${loss.label}s`;
		return `${lost} ${plural} from "${loss.field}"`;
	});

	return (
		`This save would remove ${parts.join(', ')}. ` +
		`Confirm to save anyway, or reload the page to discard the change — ` +
		`nothing has been written, the stored version is untouched.`
	);
}
