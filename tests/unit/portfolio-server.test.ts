import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    default: {
      readdir: (...args: any[]) => mockReaddir(...args),
      readFile: (...args: any[]) => mockReadFile(...args)
    },
    readdir: (...args: any[]) => mockReaddir(...args),
    readFile: (...args: any[]) => mockReadFile(...args)
  };
});

// Import after mock setup
import { load } from '../../src/routes/portfolio/+page.server.js';

describe('Portfolio Page Server', () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
  });

  async function loadPortfolio() {
    return load({} as any);
  }

  it('should return projects array', async () => {
    mockReaddir.mockResolvedValueOnce(['test.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Test Project
summary: A test project
technologies: ["TypeScript"]
latestContribution: 2025-01-15
---
# Test Project
Content here.`);

    const result = await loadPortfolio();
    expect(result.projects).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);
    expect(result.projects.length).toBe(1);
  });

  it('should parse frontmatter title', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: My Cool Project
summary: Project summary
technologies: ["Svelte", "TypeScript"]
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.title).toBe('My Cool Project');
  });

  it('should parse frontmatter summary', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: This is a great project
technologies: []
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.summary).toBe('This is a great project');
  });

  it('should parse technologies array', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
technologies: ["TypeScript", "Svelte", "Cloudflare"]
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.technologies).toEqual(['TypeScript', 'Svelte', 'Cloudflare']);
  });

  it('should parse url field', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
url: https://example.com
technologies: []
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.url).toBe('https://example.com');
  });

  it('should parse latestContribution field', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
technologies: []
latestContribution: 2025-06-15
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.latestContribution).toBe('2025-06-15');
  });

  it('should use slug from filename', async () => {
    mockReaddir.mockResolvedValueOnce(['my-project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: My Project
summary: Summary
technologies: []
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].slug).toBe('my-project');
  });

  it('should extract content after frontmatter', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
technologies: []
---
# Hello World
This is the content.`);

    const result = await loadPortfolio();
    expect(result.projects[0].content).toContain('# Hello World');
    expect(result.projects[0].content).toContain('This is the content.');
  });

  it('should handle multiple markdown files', async () => {
    mockReaddir.mockResolvedValueOnce(['a.md', 'b.md', 'c.md'] as any);
    mockReadFile
      .mockResolvedValueOnce(`---
title: Project A
summary: First
technologies: []
latestContribution: 2025-01-01
---
A`)
      .mockResolvedValueOnce(`---
title: Project B
summary: Second
technologies: []
latestContribution: 2025-06-01
---
B`)
      .mockResolvedValueOnce(`---
title: Project C
summary: Third
technologies: []
latestContribution: 2025-03-01
---
C`);

    const result = await loadPortfolio();
    expect(result.projects.length).toBe(3);
  });

  it('should sort projects by latest contribution descending', async () => {
    mockReaddir.mockResolvedValueOnce(['old.md', 'new.md', 'mid.md'] as any);
    mockReadFile
      .mockResolvedValueOnce(`---
title: Old
summary: Old project
technologies: []
latestContribution: 2024-01-01
---
Old`)
      .mockResolvedValueOnce(`---
title: New
summary: New project
technologies: []
latestContribution: 2025-06-01
---
New`)
      .mockResolvedValueOnce(`---
title: Mid
summary: Mid project
technologies: []
latestContribution: 2025-03-01
---
Mid`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.title).toBe('New');
    expect(result.projects[1].meta.title).toBe('Mid');
    expect(result.projects[2].meta.title).toBe('Old');
  });

  it('should put projects without latestContribution at the end', async () => {
    mockReaddir.mockResolvedValueOnce(['no-date.md', 'with-date.md'] as any);
    mockReadFile
      .mockResolvedValueOnce(`---
title: No Date
summary: Project without date
technologies: []
---
No date`)
      .mockResolvedValueOnce(`---
title: Has Date
summary: Project with date
technologies: []
latestContribution: 2025-01-01
---
Has date`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.title).toBe('Has Date');
    expect(result.projects[1].meta.title).toBe('No Date');
  });

  it('should filter only .md files', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md', 'readme.txt', 'image.png'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Only md
technologies: []
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects.length).toBe(1);
  });

  it('should handle markdown without frontmatter', async () => {
    mockReaddir.mockResolvedValueOnce(['simple.md'] as any);
    mockReadFile.mockResolvedValueOnce('# Just Content\nNo frontmatter here.');

    const result = await loadPortfolio();
    expect(result.projects[0].meta.title).toBe('simple');
    expect(result.projects[0].content).toContain('# Just Content');
  });

  it('should default empty summary', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
technologies: []
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.summary).toBe('');
  });

  it('should default empty technologies array', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.technologies).toEqual([]);
  });

  it('should return empty array on readdir error', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const result = await loadPortfolio();
    expect(result.projects).toEqual([]);
  });

  it('should return empty array when no md files found', async () => {
    mockReaddir.mockResolvedValueOnce(['file.txt', 'image.png'] as any);

    const result = await loadPortfolio();
    expect(result.projects).toEqual([]);
  });

  it('should handle quoted frontmatter values', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: "Quoted Title"
summary: 'Single Quoted Summary'
technologies: ["TypeScript"]
---
Content`);

    const result = await loadPortfolio();
    expect(result.projects[0].meta.title).toBe('Quoted Title');
    expect(result.projects[0].meta.summary).toBe('Single Quoted Summary');
  });

  it('should handle invalid JSON in technologies gracefully', async () => {
    mockReaddir.mockResolvedValueOnce(['project.md'] as any);
    mockReadFile.mockResolvedValueOnce(`---
title: Project
summary: Summary
technologies: [invalid json
---
Content`);

    const result = await loadPortfolio();
    // Should fall back to string when JSON parse fails
    expect(result.projects[0].meta.technologies).toBeDefined();
  });
});
