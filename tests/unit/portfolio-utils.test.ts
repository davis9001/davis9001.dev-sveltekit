import { describe, expect, it } from 'vitest';
import { safeFilename, parseFrontmatter, buildProject } from '../../src/lib/utils/portfolio';

describe('safeFilename', () => {
  it('should strip https protocol and replace non-word chars', () => {
    expect(safeFilename('https://game.starspace.group')).toBe(
      '/portfolio-screenshot/game_starspace_group.webp'
    );
  });

  it('should strip http protocol', () => {
    expect(safeFilename('http://example.com')).toBe(
      '/portfolio-screenshot/example_com.webp'
    );
  });

  it('should handle URLs with paths', () => {
    expect(safeFilename('https://docs.deno.com')).toBe(
      '/portfolio-screenshot/docs_deno_com.webp'
    );
  });

  it('should handle URLs with trailing slash', () => {
    expect(safeFilename('https://example.com/')).toBe(
      '/portfolio-screenshot/example_com_.webp'
    );
  });

  it('should handle URLs with subdomains', () => {
    expect(safeFilename('https://fresh.deno.dev/docs')).toBe(
      '/portfolio-screenshot/fresh_deno_dev_docs.webp'
    );
  });

  it('should handle URLs with hyphens', () => {
    expect(safeFilename('https://el-toreo-main-website.vercel.app')).toBe(
      '/portfolio-screenshot/el_toreo_main_website_vercel_app.webp'
    );
  });

  it('should collapse consecutive non-word chars', () => {
    expect(safeFilename('https://psychologist.svelte.pages.dev/')).toBe(
      '/portfolio-screenshot/psychologist_svelte_pages_dev_.webp'
    );
  });

  it('should return .webp extension', () => {
    const result = safeFilename('https://example.com');
    expect(result).toMatch(/\.webp$/);
  });

  it('should always start with /portfolio-screenshot/', () => {
    const result = safeFilename('https://any-url.example.org');
    expect(result).toMatch(/^\/portfolio-screenshot\//);
  });
});

describe('parseFrontmatter', () => {
  it('should parse basic frontmatter', () => {
    const md = `---
title: Test Project
summary: A test project
technologies: ["TypeScript"]
---
# Content`;

    const { meta, content } = parseFrontmatter(md);
    expect(meta.title).toBe('Test Project');
    expect(meta.summary).toBe('A test project');
    expect(meta.technologies).toEqual(['TypeScript']);
    expect(content).toContain('# Content');
  });

  it('should return empty meta when no frontmatter', () => {
    const md = '# Just Content\nNo frontmatter here.';
    const { meta, content } = parseFrontmatter(md);
    expect(meta).toEqual({});
    expect(content).toContain('# Just Content');
  });

  it('should handle CRLF line endings', () => {
    const md = "---\r\ntitle: CRLF Project\r\nsummary: Windows\r\ntechnologies: [\"TypeScript\"]\r\n---\r\nContent";
    const { meta } = parseFrontmatter(md);
    expect(meta.title).toBe('CRLF Project');
    expect(meta.summary).toBe('Windows');
    expect(meta.technologies).toEqual(['TypeScript']);
  });

  it('should parse multi-line arrays', () => {
    const md = `---
title: Multi
technologies: [
  "Deno",
  "Fresh",
  "Tailwind",
]
latestContribution: 2025-03-01
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.technologies).toEqual(['Deno', 'Fresh', 'Tailwind']);
    expect(meta.latestContribution).toBe('2025-03-01');
  });

  it('should parse multi-line arrays with CRLF', () => {
    const md = "---\r\ntitle: Test\r\ntechnologies: [\r\n  \"A\",\r\n  \"B\",\r\n]\r\nlatestContribution: 2025-01-01\r\n---\r\nContent";
    const { meta } = parseFrontmatter(md);
    expect(meta.technologies).toEqual(['A', 'B']);
    expect(meta.latestContribution).toBe('2025-01-01');
  });

  it('should handle quoted values with double quotes', () => {
    const md = `---
title: "Quoted Title"
summary: Plain summary
technologies: []
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.title).toBe('Quoted Title');
  });

  it('should handle quoted values with single quotes', () => {
    const md = `---
title: 'Single Quoted'
summary: Summary
technologies: []
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.title).toBe('Single Quoted');
  });

  it('should handle empty technologies array', () => {
    const md = `---
title: Test
technologies: []
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.technologies).toEqual([]);
  });

  it('should parse url field', () => {
    const md = `---
title: Test
url: https://example.com
technologies: []
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.url).toBe('https://example.com');
  });

  it('should handle invalid JSON in array gracefully', () => {
    const md = `---
title: Test
technologies: [invalid json
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.technologies).toBeDefined();
  });

  it('should handle multi-line array with invalid JSON fallback', () => {
    const md = `---
title: Test
technologies: [
  not valid json,
  at all
]
---
Content`;

    const { meta } = parseFrontmatter(md);
    // Falls through both JSON.parse attempts; stored as string
    expect(meta.technologies).toBeDefined();
  });

  it('should preserve content after frontmatter', () => {
    const md = `---
title: Test
technologies: []
---
# Hello World
This is **bold** content.

And a paragraph.`;

    const { content } = parseFrontmatter(md);
    expect(content).toContain('# Hello World');
    expect(content).toContain('This is **bold** content.');
    expect(content).toContain('And a paragraph.');
  });

  it('should handle frontmatter with all fields', () => {
    const md = `---
title: Full Project
summary: Complete summary text
url: https://example.com
technologies: ["TypeScript", "Svelte", "Cloudflare"]
latestContribution: 2025-06-15
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.title).toBe('Full Project');
    expect(meta.summary).toBe('Complete summary text');
    expect(meta.url).toBe('https://example.com');
    expect(meta.technologies).toEqual(['TypeScript', 'Svelte', 'Cloudflare']);
    expect(meta.latestContribution).toBe('2025-06-15');
  });

  it('should handle multi-line array without trailing comma', () => {
    const md = `---
title: Test
technologies: [
  "A",
  "B"
]
---
Content`;

    const { meta } = parseFrontmatter(md);
    expect(meta.technologies).toEqual(['A', 'B']);
  });
});

describe('buildProject', () => {
  it('should build a project from slug and markdown', () => {
    const md = `---
title: My Project
summary: A great project
url: https://example.com
technologies: ["TypeScript", "Svelte"]
latestContribution: 2025-06-15
---
# Content here`;

    const project = buildProject('my-project', md);
    expect(project.slug).toBe('my-project');
    expect(project.meta.title).toBe('My Project');
    expect(project.meta.summary).toBe('A great project');
    expect(project.meta.url).toBe('https://example.com');
    expect(project.meta.technologies).toEqual(['TypeScript', 'Svelte']);
    expect(project.meta.latestContribution).toBe('2025-06-15');
    expect(project.content).toContain('# Content here');
  });

  it('should use slug as title when title is missing', () => {
    const md = `---
summary: No title
technologies: []
---
Content`;

    const project = buildProject('fallback-slug', md);
    expect(project.meta.title).toBe('fallback-slug');
  });

  it('should default empty summary', () => {
    const md = `---
title: Project
technologies: []
---
Content`;

    const project = buildProject('project', md);
    expect(project.meta.summary).toBe('');
  });

  it('should default empty technologies array', () => {
    const md = `---
title: Project
summary: Summary
---
Content`;

    const project = buildProject('project', md);
    expect(project.meta.technologies).toEqual([]);
  });

  it('should handle markdown without frontmatter', () => {
    const md = '# Just content\nNo frontmatter.';
    const project = buildProject('simple', md);
    expect(project.meta.title).toBe('simple');
    expect(project.meta.summary).toBe('');
    expect(project.meta.technologies).toEqual([]);
    expect(project.content).toContain('# Just content');
  });

  it('should handle CRLF markdown', () => {
    const md = "---\r\ntitle: CRLF\r\nsummary: Win\r\ntechnologies: [\"TS\"]\r\n---\r\nContent";
    const project = buildProject('crlf', md);
    expect(project.meta.title).toBe('CRLF');
    expect(project.meta.technologies).toEqual(['TS']);
  });

  it('should handle multi-line arrays', () => {
    const md = `---
title: Multi
technologies: [
  "A",
  "B",
]
latestContribution: 2025-01-01
---
Content`;

    const project = buildProject('multi', md);
    expect(project.meta.technologies).toEqual(['A', 'B']);
    expect(project.meta.latestContribution).toBe('2025-01-01');
  });

  it('should leave url undefined when not provided', () => {
    const md = `---
title: No URL
technologies: []
---
Content`;

    const project = buildProject('no-url', md);
    expect(project.meta.url).toBeUndefined();
  });
});
