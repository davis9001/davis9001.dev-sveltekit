import { describe, expect, it } from 'vitest';
import {
  parseFrontmatter,
  sortPostsByDate,
  formatBlogDate,
  getReadingTime,
  processRawPosts,
  type BlogPost,
  type BlogPostMeta
} from '../../src/lib/utils/blog';

describe('Blog Utilities', () => {
  describe('parseFrontmatter', () => {
    it('should parse simple frontmatter with title, publishedAt, and summary', () => {
      const markdown = `---
title: My First Post
publishedAt: 2025-01-28
summary: This is a summary of my first post.
---

# Hello World

This is the content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.title).toBe('My First Post');
      expect(result.meta.publishedAt).toBe('2025-01-28');
      expect(result.meta.summary).toBe('This is a summary of my first post.');
      expect(result.content).toContain('# Hello World');
      expect(result.content).toContain('This is the content.');
    });

    it('should parse quoted frontmatter values', () => {
      const markdown = `---
title: "Claude Opus 4.5 Hits 100% on SvelteBench: My AI Coding Setup for 2025"
publishedAt: 2025-11-30
summary: After months of using Claude Sonnet 4.5 with GitHub Copilot Pro+, I've switched to Opus 4.5.
---

Content here.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.title).toBe(
        "Claude Opus 4.5 Hits 100% on SvelteBench: My AI Coding Setup for 2025"
      );
      expect(result.meta.publishedAt).toBe('2025-11-30');
    });

    it('should parse inline array tags', () => {
      const markdown = `---
title: Test Post
publishedAt: 2025-10-16
summary: A test post.
tags: [ai, coding, llm, agents]
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.tags).toEqual(['ai', 'coding', 'llm', 'agents']);
    });

    it('should parse multiline array tags', () => {
      const markdown = `---
title: Test Post
publishedAt: 2025-10-22
summary: A test post with multiline tags.
tags: [
  wildlife,
  nature,
  crows,
]
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.tags).toEqual(['wildlife', 'nature', 'crows']);
    });

    it('should handle ISO date formats', () => {
      const markdown = `---
title: Test Post
publishedAt: 2025-03-18T18:00:00Z
summary: A test.
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.publishedAt).toBe('2025-03-18T18:00:00Z');
    });

    it('should handle description field (used as summary fallback)', () => {
      const markdown = `---
title: Test Post
description: A description field.
publishedAt: 2025-02-17T14:00:00Z
summary: The actual summary.
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.summary).toBe('The actual summary.');
      expect(result.meta.description).toBe('A description field.');
    });

    it('should return empty content when no frontmatter present', () => {
      const markdown = `# Just Content

No frontmatter here.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.title).toBe('');
      expect(result.meta.publishedAt).toBe('');
      expect(result.meta.summary).toBe('');
      expect(result.content).toContain('# Just Content');
    });

    it('should handle empty tags when no tags provided', () => {
      const markdown = `---
title: No Tags Post
publishedAt: 2025-01-01
summary: No tags here.
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.tags).toEqual([]);
    });

    it('should handle frontmatter with emoji in title', () => {
      const markdown = `---
title: Can Threatening Teardown Fix a Computer? 😂
publishedAt: 2025-02-11T08:30:00Z
summary: A post about fixing computers.
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.title).toContain('Fix a Computer?');
      expect(result.meta.publishedAt).toBe('2025-02-11T08:30:00Z');
    });

    it('should trim content properly', () => {
      const markdown = `---
title: Trim Test
publishedAt: 2025-01-01
summary: Test trimming.
---

Content starts here.`;

      const result = parseFrontmatter(markdown);
      expect(result.content).toBe('Content starts here.');
    });

    it('should handle multiline summary values', () => {
      const markdown = `---
title: Test
publishedAt: 2025-01-01
summary: This is a long summary that spans one line.
---

Content.`;

      const result = parseFrontmatter(markdown);
      expect(result.meta.summary).toBe('This is a long summary that spans one line.');
    });
  });

  describe('sortPostsByDate', () => {
    it('should sort posts by date in descending order (newest first)', () => {
      const posts: BlogPostMeta[] = [
        {
          slug: 'old-post',
          title: 'Old Post',
          publishedAt: '2025-01-01',
          summary: 'Old',
          tags: []
        },
        {
          slug: 'new-post',
          title: 'New Post',
          publishedAt: '2025-12-01',
          summary: 'New',
          tags: []
        },
        {
          slug: 'mid-post',
          title: 'Mid Post',
          publishedAt: '2025-06-15',
          summary: 'Mid',
          tags: []
        }
      ];

      const sorted = sortPostsByDate(posts);
      expect(sorted[0].slug).toBe('new-post');
      expect(sorted[1].slug).toBe('mid-post');
      expect(sorted[2].slug).toBe('old-post');
    });

    it('should handle ISO datetime formats alongside date-only formats', () => {
      const posts: BlogPostMeta[] = [
        {
          slug: 'date-only',
          title: 'Date Only',
          publishedAt: '2025-03-01',
          summary: 'A',
          tags: []
        },
        {
          slug: 'iso-datetime',
          title: 'ISO DateTime',
          publishedAt: '2025-03-01T18:00:00Z',
          summary: 'B',
          tags: []
        }
      ];

      const sorted = sortPostsByDate(posts);
      // ISO datetime should be later on the same date
      expect(sorted[0].slug).toBe('iso-datetime');
      expect(sorted[1].slug).toBe('date-only');
    });

    it('should handle empty array', () => {
      const sorted = sortPostsByDate([]);
      expect(sorted).toEqual([]);
    });

    it('should not mutate the original array', () => {
      const posts: BlogPostMeta[] = [
        {
          slug: 'a',
          title: 'A',
          publishedAt: '2025-01-01',
          summary: 'A',
          tags: []
        },
        {
          slug: 'b',
          title: 'B',
          publishedAt: '2025-12-01',
          summary: 'B',
          tags: []
        }
      ];

      const sorted = sortPostsByDate(posts);
      expect(posts[0].slug).toBe('a');
      expect(sorted[0].slug).toBe('b');
    });
  });

  describe('formatBlogDate', () => {
    it('should format a date-only string', () => {
      const result = formatBlogDate('2025-01-28');
      expect(result).toContain('2025');
      expect(result).toContain('January');
      expect(result).toContain('28');
    });

    it('should format an ISO datetime string', () => {
      const result = formatBlogDate('2025-03-18T18:00:00Z');
      expect(result).toContain('2025');
      expect(result).toContain('March');
    });

    it('should return empty string for invalid date', () => {
      const result = formatBlogDate('');
      expect(result).toBe('');
    });

    it('should return empty string for null/undefined-like values', () => {
      const result = formatBlogDate('');
      expect(result).toBe('');
    });
  });

  describe('getReadingTime', () => {
    it('should return 1 min for short content', () => {
      const result = getReadingTime('Hello world, this is a short post.');
      expect(result).toBe(1);
    });

    it('should estimate reading time based on word count', () => {
      // ~200 words per minute is standard
      const words = Array(600).fill('word').join(' ');
      const result = getReadingTime(words);
      expect(result).toBe(3);
    });

    it('should return at least 1 minute for any content', () => {
      const result = getReadingTime('Hi');
      expect(result).toBe(1);
    });

    it('should handle empty string', () => {
      const result = getReadingTime('');
      expect(result).toBe(1);
    });
  });

  describe('processRawPosts', () => {
    it('should process raw module map into sorted blog posts', () => {
      const modules: Record<string, string> = {
        '/src/updates/old-post.md': `---
title: Old Post
publishedAt: 2025-01-01
summary: An old post.
---

Old content.`,
        '/src/updates/new-post.md': `---
title: New Post
publishedAt: 2025-12-01
summary: A new post.
tags: [ai, coding]
---

New content.`
      };

      const posts = processRawPosts(modules);
      expect(posts).toHaveLength(2);
      expect(posts[0].slug).toBe('new-post');
      expect(posts[0].title).toBe('New Post');
      expect(posts[0].tags).toEqual(['ai', 'coding']);
      expect(posts[0].content).toBe('New content.');
      expect(posts[1].slug).toBe('old-post');
    });

    it('should handle empty modules', () => {
      const posts = processRawPosts({});
      expect(posts).toEqual([]);
    });

    it('should extract slug from file path', () => {
      const modules: Record<string, string> = {
        '/src/updates/my-great-post.md': `---
title: My Great Post
publishedAt: 2025-06-15
summary: Great stuff.
---

Content.`
      };

      const posts = processRawPosts(modules);
      expect(posts[0].slug).toBe('my-great-post');
    });

    it('should support custom base path', () => {
      const modules: Record<string, string> = {
        '/custom/path/test-post.md': `---
title: Test
publishedAt: 2025-01-01
summary: Test.
---

Content.`
      };

      const posts = processRawPosts(modules, '/custom/path/');
      expect(posts[0].slug).toBe('test-post');
    });
  });
});
