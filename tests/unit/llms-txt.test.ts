/**
 * Tests for llms.txt endpoint (https://llmstxt.org/)
 */
import { describe, it, expect, vi } from 'vitest';

const blogRow = {
	slug: 'why-dirac-is-my-hostname',
	title: 'Why Dirac is My Hostname',
	summary: 'A post about a hostname.',
	published_at: '2026-06-26 00:00:00'
};

const projectRow = {
	id: 'p1',
	group_name: '*Space',
	name: 'NebulaKit',
	status: 'active',
	priority: 'high',
	description: 'A toolkit for space things.',
	primary_link: 'https://nebulakit.example',
	github_url: null,
	extra_links: '[]',
	tasks: '[]',
	blockers: '',
	sort_order: 0,
	created_at: '2026-01-01',
	updated_at: '2026-01-02'
};

function makeEvent(
	rows: { blog?: Array<Record<string, unknown>>; projects?: Array<Record<string, unknown>> } = {}
) {
	const blogAll = vi.fn().mockResolvedValue({ results: rows.blog || [] });
	const projectsAll = vi.fn().mockResolvedValue({ results: rows.projects || [] });
	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn().mockReturnThis(),
			all: sql.includes('open_projects') ? projectsAll : blogAll
		}))
	};
	return { platform: { env: { DB: db } } } as any;
}

describe('llms.txt endpoint', () => {
	it('should return a plain-text index with the correct content type', async () => {
		const { GET } = await import('../../src/routes/llms.txt/+server');
		const response = await GET(makeEvent());

		expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

		const body = await response.text();
		expect(body).toContain('# davis9001.dev');
		expect(body).toContain('## Blog');
		expect(body).toContain('## Portfolio');
		expect(body).toContain('## Open Projects');
		expect(body).toContain('https://davis9001.dev/projects');
		expect(body).toContain('https://davis9001.dev/api/projects');
	});

	it('should include published blog posts', async () => {
		const { GET } = await import('../../src/routes/llms.txt/+server');
		const response = await GET(makeEvent({ blog: [blogRow] }));
		const body = await response.text();

		expect(body).toContain(
			'[Why Dirac is My Hostname](https://davis9001.dev/blog/why-dirac-is-my-hostname)'
		);
	});

	it('should include open projects when the database is available', async () => {
		const { GET } = await import('../../src/routes/llms.txt/+server');
		const response = await GET(makeEvent({ projects: [projectRow] }));
		const body = await response.text();

		expect(body).toContain('NebulaKit (*Space): active — A toolkit for space things.');
	});

	it('should omit the description separator for projects without one', async () => {
		const { GET } = await import('../../src/routes/llms.txt/+server');
		const response = await GET(
			makeEvent({ projects: [{ ...projectRow, name: 'Bare', description: '' }] })
		);
		const body = await response.text();

		expect(body).toContain('Bare (*Space): active\n');
	});

	it('should fall back gracefully without a database', async () => {
		const { GET } = await import('../../src/routes/llms.txt/+server');
		const response = await GET({ platform: undefined } as any);
		const body = await response.text();

		expect(body).toContain('No published posts yet.');
		expect(body).toContain('See /api/projects for the current list.');
		expect(body).toContain('# davis9001.dev');
	});
});
