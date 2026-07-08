/**
 * Tests for pure GitHub URL parsing ($lib/github/url)
 */
import { describe, expect, it } from 'vitest';
import { parseProjectUrl, parseRepoUrl } from '../../src/lib/github/url';

describe('parseProjectUrl', () => {
	it('parses an org project URL', () => {
		expect(parseProjectUrl('https://github.com/orgs/starspacegroup/projects/3')).toEqual({
			ownerType: 'orgs',
			owner: 'starspacegroup',
			number: 3
		});
	});

	it('parses a user project URL', () => {
		expect(parseProjectUrl('https://github.com/users/davis9001/projects/5')).toEqual({
			ownerType: 'users',
			owner: 'davis9001',
			number: 5
		});
	});

	it('tolerates a trailing slash and surrounding whitespace', () => {
		expect(parseProjectUrl('  https://github.com/orgs/starspacegroup/projects/3/  ')).toEqual({
			ownerType: 'orgs',
			owner: 'starspacegroup',
			number: 3
		});
	});

	it('is case-insensitive on scheme and owner-type segment', () => {
		expect(parseProjectUrl('HTTPS://github.com/ORGS/starspacegroup/projects/3')).toEqual({
			ownerType: 'orgs',
			owner: 'starspacegroup',
			number: 3
		});
	});

	it('returns null for a repo URL', () => {
		expect(parseProjectUrl('https://github.com/starspacegroup/NebulaKit')).toBeNull();
	});

	it('returns null for garbage input', () => {
		expect(parseProjectUrl('not a url')).toBeNull();
		expect(parseProjectUrl('')).toBeNull();
	});
});

describe('parseRepoUrl', () => {
	it('parses a repo URL', () => {
		expect(parseRepoUrl('https://github.com/starspacegroup/NebulaKit')).toEqual({
			owner: 'starspacegroup',
			repo: 'NebulaKit'
		});
	});

	it('strips a trailing .git and slash', () => {
		expect(parseRepoUrl('https://github.com/starspacegroup/NebulaKit.git/')).toEqual({
			owner: 'starspacegroup',
			repo: 'NebulaKit'
		});
	});

	it('returns null for a project URL', () => {
		expect(parseRepoUrl('https://github.com/orgs/starspacegroup/projects/3')).toBeNull();
	});

	it('returns null for garbage input', () => {
		expect(parseRepoUrl('not a url')).toBeNull();
	});
});
