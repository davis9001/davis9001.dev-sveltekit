import { describe, expect, it } from 'vitest';
import { buildProject } from '../../src/lib/utils/portfolio';
import type { Project } from '../../src/lib/utils/portfolio';

/**
 * Tests for Portfolio List Page Server Logic
 *
 * Since the route uses import.meta.glob (resolved at build time),
 * we test the same logic the load function performs: parsing modules,
 * building projects, and sorting by latestContribution.
 */

// Helper that mirrors the route's load function logic
function loadPortfolio(modules: Record<string, string>) {
  const projects: Project[] = Object.entries(modules).map(([path, raw]) => {
    const slug = path.replace('/src/projects/', '').replace('.md', '');
    return buildProject(slug, raw);
  });

  projects.sort((a, b) => {
    if (!a.meta.latestContribution) return 1;
    if (!b.meta.latestContribution) return -1;
    return new Date(b.meta.latestContribution).getTime() - new Date(a.meta.latestContribution).getTime();
  });

  return { projects };
}

describe('Portfolio Page Server', () => {
  it('should return projects array', () => {
    const modules = {
      '/src/projects/test.md': `---
title: Test Project
summary: A test project
technologies: ["TypeScript"]
latestContribution: 2025-01-15
---
# Test Project
Content here.`
    };

    const result = loadPortfolio(modules);
    expect(result.projects).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);
    expect(result.projects.length).toBe(1);
  });

  it('should parse frontmatter title', () => {
    const modules = {
      '/src/projects/project.md': `---
title: My Cool Project
summary: Project summary
technologies: ["Svelte", "TypeScript"]
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('My Cool Project');
  });

  it('should parse frontmatter summary', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: This is a great project
technologies: []
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.summary).toBe('This is a great project');
  });

  it('should parse technologies array', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: ["TypeScript", "Svelte", "Cloudflare"]
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.technologies).toEqual(['TypeScript', 'Svelte', 'Cloudflare']);
  });

  it('should parse url field', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
url: https://example.com
technologies: []
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.url).toBe('https://example.com');
  });

  it('should parse latestContribution field', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: []
latestContribution: 2025-06-15
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.latestContribution).toBe('2025-06-15');
  });

  it('should use slug from filename', () => {
    const modules = {
      '/src/projects/my-project.md': `---
title: My Project
summary: Summary
technologies: []
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].slug).toBe('my-project');
  });

  it('should extract content after frontmatter', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: []
---
# Hello World
This is the content.`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].content).toContain('# Hello World');
    expect(result.projects[0].content).toContain('This is the content.');
  });

  it('should handle multiple markdown files', () => {
    const modules = {
      '/src/projects/a.md': `---
title: Project A
summary: First
technologies: []
latestContribution: 2025-01-01
---
A`,
      '/src/projects/b.md': `---
title: Project B
summary: Second
technologies: []
latestContribution: 2025-06-01
---
B`,
      '/src/projects/c.md': `---
title: Project C
summary: Third
technologies: []
latestContribution: 2025-03-01
---
C`
    };

    const result = loadPortfolio(modules);
    expect(result.projects.length).toBe(3);
  });

  it('should sort projects by latest contribution descending', () => {
    const modules = {
      '/src/projects/old.md': `---
title: Old
summary: Old project
technologies: []
latestContribution: 2024-01-01
---
Old`,
      '/src/projects/new.md': `---
title: New
summary: New project
technologies: []
latestContribution: 2025-06-01
---
New`,
      '/src/projects/mid.md': `---
title: Mid
summary: Mid project
technologies: []
latestContribution: 2025-03-01
---
Mid`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('New');
    expect(result.projects[1].meta.title).toBe('Mid');
    expect(result.projects[2].meta.title).toBe('Old');
  });

  it('should put projects without latestContribution at the end', () => {
    const modules = {
      '/src/projects/no-date.md': `---
title: No Date
summary: Project without date
technologies: []
---
No date`,
      '/src/projects/with-date.md': `---
title: Has Date
summary: Project with date
technologies: []
latestContribution: 2025-01-01
---
Has date`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('Has Date');
    expect(result.projects[1].meta.title).toBe('No Date');
  });

  it('should handle empty modules', () => {
    const result = loadPortfolio({});
    expect(result.projects).toEqual([]);
  });

  it('should handle markdown without frontmatter', () => {
    const modules = {
      '/src/projects/simple.md': '# Just Content\nNo frontmatter here.'
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('simple');
    expect(result.projects[0].content).toContain('# Just Content');
  });

  it('should default empty summary', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
technologies: []
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.summary).toBe('');
  });

  it('should default empty technologies array', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.technologies).toEqual([]);
  });

  it('should handle quoted frontmatter values', () => {
    const modules = {
      '/src/projects/project.md': `---
title: "Quoted Title"
summary: 'Single Quoted Summary'
technologies: ["TypeScript"]
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('Quoted Title');
    expect(result.projects[0].meta.summary).toBe('Single Quoted Summary');
  });

  it('should handle invalid JSON in technologies gracefully', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: [invalid json
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.technologies).toBeDefined();
  });

  it('should parse url field for screenshot derivation', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
url: https://example.com
technologies: ["TypeScript"]
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.url).toBe('https://example.com');
  });

  it('should have undefined url when not provided', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: []
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.url).toBeUndefined();
  });

  it('should handle CRLF line endings', () => {
    const modules = {
      '/src/projects/project.md': "---\r\ntitle: CRLF Project\r\nsummary: Windows line endings\r\ntechnologies: [\"TypeScript\"]\r\nlatestContribution: 2025-06-01\r\n---\r\nContent with CRLF"
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('CRLF Project');
    expect(result.projects[0].meta.summary).toBe('Windows line endings');
    expect(result.projects[0].meta.technologies).toEqual(['TypeScript']);
    expect(result.projects[0].content).toContain('Content with CRLF');
  });

  it('should parse multi-line YAML arrays', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Multi Array
summary: Has multi-line tech array
technologies: [
  "Deno",
  "Deno Fresh",
  "Tailwind",
]
latestContribution: 2025-03-01
---
Content`
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('Multi Array');
    expect(result.projects[0].meta.technologies).toEqual(['Deno', 'Deno Fresh', 'Tailwind']);
    expect(result.projects[0].meta.latestContribution).toBe('2025-03-01');
  });

  it('should parse multi-line arrays with CRLF', () => {
    const modules = {
      '/src/projects/project.md': "---\r\ntitle: CRLF Array\r\nsummary: Multi-line array with CRLF\r\ntechnologies: [\r\n  \"SvelteKit\",\r\n  \"Tailwind\",\r\n]\r\nlatestContribution: 2025-04-01\r\n---\r\nContent"
    };

    const result = loadPortfolio(modules);
    expect(result.projects[0].meta.title).toBe('CRLF Array');
    expect(result.projects[0].meta.technologies).toEqual(['SvelteKit', 'Tailwind']);
    expect(result.projects[0].meta.latestContribution).toBe('2025-04-01');
  });
});
