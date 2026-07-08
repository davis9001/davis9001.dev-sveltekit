/**
 * Pure mapping between this app's Status/Priority enums and a GitHub
 * Projects v2 board's actual field/option names. No fetch/DB.
 *
 * Matching is case-insensitive against a synonym table per value, so a
 * board using "Todo"/"In Progress"/"Done" style names works the same as one
 * using "Planning"/"Active"/"Complete" — additive, not a rewrite, when new
 * synonyms are needed later.
 */

import type { ProjectPriority, ProjectStatus } from '$lib/projects/types';
import type { DiscoveredField } from './queries';

const STATUS_SYNONYMS: Record<ProjectStatus, string[]> = {
	planning: ['planning', 'todo', 'to do', 'backlog'],
	active: ['active', 'in progress', 'in-progress', 'doing'],
	paused: ['paused', 'on hold'],
	blocked: ['blocked'],
	complete: ['complete', 'done', 'closed']
};

const PRIORITY_SYNONYMS: Record<ProjectPriority, string[]> = {
	high: ['high', 'urgent', 'p0'],
	medium: ['medium', 'p1'],
	low: ['low', 'p2']
};

export interface StatusFieldMapping {
	fieldId: string;
	optionIdByStatus: Partial<Record<ProjectStatus, string>>;
	statusByOptionName: Record<string, ProjectStatus>;
}

export interface PriorityFieldMapping {
	fieldId: string;
	optionIdByPriority: Partial<Record<ProjectPriority, string>>;
	priorityByOptionName: Record<string, ProjectPriority>;
}

function buildMapping<TValue extends string>(
	field: DiscoveredField,
	synonyms: Record<TValue, string[]>
): { optionIdByValue: Partial<Record<TValue, string>>; valueByOptionName: Record<string, TValue> } {
	const optionIdByValue: Partial<Record<TValue, string>> = {};
	const valueByOptionName: Record<string, TValue> = {};

	for (const option of field.options) {
		const lowerName = option.name.toLowerCase();
		for (const value of Object.keys(synonyms) as TValue[]) {
			if (optionIdByValue[value]) continue; // first match wins
			if (synonyms[value].includes(lowerName)) {
				optionIdByValue[value] = option.id;
				valueByOptionName[lowerName] = value;
			}
		}
	}

	return { optionIdByValue, valueByOptionName };
}

/** Find the board's built-in "Status" single-select field and map its options */
export function findStatusFieldMapping(fields: DiscoveredField[]): StatusFieldMapping | null {
	const field = fields.find((f) => f.name.toLowerCase() === 'status');
	if (!field) return null;

	const { optionIdByValue, valueByOptionName } = buildMapping(field, STATUS_SYNONYMS);
	return {
		fieldId: field.id,
		optionIdByStatus: optionIdByValue,
		statusByOptionName: valueByOptionName
	};
}

/** Find a custom "Priority" single-select field, if the board has one. Absence is not an error. */
export function findPriorityFieldMapping(fields: DiscoveredField[]): PriorityFieldMapping | null {
	const field = fields.find((f) => f.name.toLowerCase() === 'priority');
	if (!field) return null;

	const { optionIdByValue, valueByOptionName } = buildMapping(field, PRIORITY_SYNONYMS);
	return {
		fieldId: field.id,
		optionIdByPriority: optionIdByValue,
		priorityByOptionName: valueByOptionName
	};
}
