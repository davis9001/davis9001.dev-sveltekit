import { describe, expect, it } from 'vitest';
import { buildProject } from '../../src/lib/utils/portfolio';

/**
 * Tests for Portfolio Project Detail Page Server Logic
 *
 * Since the route uses import.meta.glob (resolved at build time),
 * we test the same logic the load function performs: looking up a
 * project by slug from the modules map and building it.
 */

// Helper that mirrors the route's load function logic
function loadProject(slug: string, modules: Record<string, string> = {}) {
  const key = `/src/projects/${slug}.md`;
  const raw = modules[key];

  if (!raw) {
    const err = new Error(`Project "${slug}" not found`) as any;
    err.status = 404;
    throw err;
  }

  return { project: buildProject(slug, raw) };
}

describe('Portfolio Project Detail Server', () => {
  it('should load a project by slug', () => {
    const modules = {
      '/src/projects/test-project.md': `---
title: Test Project
summary: A test project description
url: https://example.com
technologies: ["TypeScript", "Svelte"]
latestContribution: 2025-06-01
---
# Test Project
This is the content.`
    };

    const result = loadProject('test-project', modules);
    expect(result.project).toBeDefined();
    expect(result.project.slug).toBe('test-project');
    expect(result.project.meta.title).toBe('Test Project');
  });

  it('should parse frontmatter title', () => {
    const modules = {
      '/src/projects/my-portfolio-item.md': `---
title: My Portfolio Item
summary: Summary
technologies: []
---
Content`
    };

    const result = loadProject('my-portfolio-item', modules);
    expect(result.project.meta.title).toBe('My Portfolio Item');
  });

  it('should parse frontmatter summary', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Detailed summary of the project
technologies: []
---
Content`
    };

    const result = loadProject('project', modules);
    expect(result.project.meta.summary).toBe('Detailed summary of the project');
  });

  it('should parse url field', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
url: https://starspace.group
technologies: []
---
Content`
    };

    const result = loadProject('project', modules);
    expect(result.project.meta.url).toBe('https://starspace.group');
  });

  it('should parse technologies array', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: ["Deno", "Fresh", "Tailwind"]
---
Content`
    };

    const result = loadProject('project', modules);
    expect(result.project.meta.technologies).toEqual(['Deno', 'Fresh', 'Tailwind']);
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

    const result = loadProject('project', modules);
    expect(result.project.meta.latestContribution).toBe('2025-06-15');
  });

  it('should extract markdown content', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
technologies: []
---
# Hello World
This is the project content.

## Features
- Feature 1
- Feature 2`
    };

    const result = loadProject('project', modules);
    expect(result.project.content).toContain('# Hello World');
    expect(result.project.content).toContain('This is the project content.');
    expect(result.project.content).toContain('## Features');
  });

  it('should use slug as title if title is missing', () => {
    const modules = {
      '/src/projects/fallback-slug.md': `---
summary: No title
technologies: []
---
Content`
    };

    const result = loadProject('fallback-slug', modules);
    expect(result.project.meta.title).toBe('fallback-slug');
  });

  it('should default empty summary when missing', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
technologies: []
---
Content`
    };

    const result = loadProject('project', modules);
    expect(result.project.meta.summary).toBe('');
  });

  it('should default empty technologies when missing', () => {
    const modules = {
      '/src/projects/project.md': `---
title: Project
summary: Summary
---
Content`
    };

    const result = loadProject('project', modules);
    expect(result.project.meta.technologies).toEqual([]);
  });

  it('should throw 404 when project file not found', () => {
    try {
      loadProject('nonexistent', {});
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(404);
      expect(err.message).toContain('nonexistent');
    }
  });

  it('should handle CRLF line endings', () => {
    const modules = {
      '/src/projects/crlf.md': "---\r\ntitle: CRLF Project\r\nsummary: Windows\r\ntechnologies: [\"TypeScript\"]\r\n---\r\nContent"
    };

    const result = loadProject('crlf', modules);
    expect(result.project.meta.title).toBe('CRLF Project');
    expect(result.project.meta.technologies).toEqual(['TypeScript']);
  });

  it('should handle multi-line arrays', () => {
    const modules = {
      '/src/projects/multi.md': `---
title: Multi
summary: Summary
technologies: [
  "A",
  "B",
  "C",
]
latestContribution: 2025-01-01
---
Content`
    };

    const result = loadProject('multi', modules);
    expect(result.project.meta.technologies).toEqual(['A', 'B', 'C']);
    expect(result.project.meta.latestContribution).toBe('2025-01-01');
  });

  it('should handle markdown without frontmatter', () => {
    const modules = {
      '/src/projects/no-frontmatter.md': '# Just Content\nNo frontmatter here.'
    };

    const result = loadProject('no-frontmatter', modules);
    expect(result.project.meta.title).toBe('no-frontmatter');
    expect(result.project.content).toContain('# Just Content');
  });
});
