/**
 * Tests for pure Status/Priority field mapping ($lib/github/field-mapping)
 */
import { describe, expect, it } from 'vitest';
import {
	findPriorityFieldMapping,
	findStatusFieldMapping
} from '../../src/lib/github/field-mapping';
import type { DiscoveredField } from '../../src/lib/github/queries';

describe('findStatusFieldMapping', () => {
	it('returns null when no Status field exists', () => {
		expect(findStatusFieldMapping([{ id: 'F1', name: 'Title', options: [] }])).toBeNull();
	});

	it('finds Status case-insensitively and maps canonical option names', () => {
		const fields: DiscoveredField[] = [
			{
				id: 'F_status',
				name: 'status',
				options: [
					{ id: 'O_todo', name: 'Todo' },
					{ id: 'O_active', name: 'In Progress' },
					{ id: 'O_blocked', name: 'Blocked' },
					{ id: 'O_done', name: 'Done' }
				]
			}
		];

		const mapping = findStatusFieldMapping(fields);

		expect(mapping).not.toBeNull();
		expect(mapping!.fieldId).toBe('F_status');
		expect(mapping!.optionIdByStatus).toEqual({
			planning: 'O_todo',
			active: 'O_active',
			blocked: 'O_blocked',
			complete: 'O_done'
		});
		expect(mapping!.statusByOptionName).toEqual({
			todo: 'planning',
			'in progress': 'active',
			blocked: 'blocked',
			done: 'complete'
		});
	});

	it('matches synonym variants like Backlog/Doing/Closed', () => {
		const fields: DiscoveredField[] = [
			{
				id: 'F_status',
				name: 'Status',
				options: [
					{ id: 'O1', name: 'Backlog' },
					{ id: 'O2', name: 'Doing' },
					{ id: 'O3', name: 'Closed' },
					{ id: 'O4', name: 'On Hold' }
				]
			}
		];

		const mapping = findStatusFieldMapping(fields)!;

		expect(mapping.optionIdByStatus).toEqual({
			planning: 'O1',
			active: 'O2',
			complete: 'O3',
			paused: 'O4'
		});
	});

	it('leaves unmapped statuses absent when the board has no matching option', () => {
		const fields: DiscoveredField[] = [
			{ id: 'F_status', name: 'Status', options: [{ id: 'O1', name: 'Weird Custom Name' }] }
		];

		const mapping = findStatusFieldMapping(fields)!;

		expect(mapping.optionIdByStatus).toEqual({});
		expect(mapping.statusByOptionName).toEqual({});
	});

	it('first matching option wins when synonyms could ambiguously overlap', () => {
		const fields: DiscoveredField[] = [
			{
				id: 'F_status',
				name: 'Status',
				options: [
					{ id: 'O_first', name: 'Todo' },
					{ id: 'O_second', name: 'Backlog' }
				]
			}
		];

		const mapping = findStatusFieldMapping(fields)!;

		expect(mapping.optionIdByStatus.planning).toBe('O_first');
	});
});

describe('findPriorityFieldMapping', () => {
	it('returns null when no Priority field exists', () => {
		expect(findPriorityFieldMapping([{ id: 'F1', name: 'Status', options: [] }])).toBeNull();
	});

	it('requires an exact (case-insensitive) field name match, not a substring', () => {
		expect(
			findPriorityFieldMapping([{ id: 'F1', name: 'Priority Level', options: [] }])
		).toBeNull();
	});

	it('finds Priority and maps High/Medium/Low', () => {
		const fields: DiscoveredField[] = [
			{
				id: 'F_priority',
				name: 'Priority',
				options: [
					{ id: 'O_high', name: 'High' },
					{ id: 'O_medium', name: 'Medium' },
					{ id: 'O_low', name: 'Low' }
				]
			}
		];

		const mapping = findPriorityFieldMapping(fields)!;

		expect(mapping.fieldId).toBe('F_priority');
		expect(mapping.optionIdByPriority).toEqual({
			high: 'O_high',
			medium: 'O_medium',
			low: 'O_low'
		});
		expect(mapping.priorityByOptionName).toEqual({ high: 'high', medium: 'medium', low: 'low' });
	});

	it('matches P0/P1/P2 style synonyms', () => {
		const fields: DiscoveredField[] = [
			{
				id: 'F_priority',
				name: 'priority',
				options: [
					{ id: 'O0', name: 'P0' },
					{ id: 'O1', name: 'P1' },
					{ id: 'O2', name: 'P2' }
				]
			}
		];

		const mapping = findPriorityFieldMapping(fields)!;

		expect(mapping.optionIdByPriority).toEqual({ high: 'O0', medium: 'O1', low: 'O2' });
	});
});
