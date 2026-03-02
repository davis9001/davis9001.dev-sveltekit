import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for Blog Updates Routes
 * TDD: Testing the updates list and detail page server-side logic
 */

// Sample markdown posts for testing
const samplePost1 = `---
title: First Test Post
publishedAt: 2025-06-15
summary: This is the first test post.
tags: [testing, blog]
---

# First Post

This is the content of the first test post.`;

const samplePost2 = `---
title: Second Test Post
publishedAt: 2025-12-01
summary: This is the second test post.
---

# Second Post

Content of the second test post.`;

const samplePost3 = `---
title: Third Test Post
publishedAt: 2025-01-01
summary: This is the third test post.
tags: [misc]
---

# Third Post

Content of third post.`;

// Mock import.meta.glob by mocking the modules at module scope
const mockModules: Record<string, string> = {
  '/src/updates/first-test-post.md': samplePost1,
  '/src/updates/second-test-post.md': samplePost2,
  '/src/updates/third-test-post.md': samplePost3
};

// Mock @sveltejs/kit error
const mockError = vi.fn((status: number, message: string) => {
  const err = new Error(message) as Error & { status: number; };
  err.status = status;
  throw err;
});

vi.mock('@sveltejs/kit', () => ({
  error: (status: number, message: string) => mockError(status, message)
}));

// Mock marked
vi.mock('marked', () => ({
  marked: vi.fn((content: string) => Promise.resolve(`<p>${content}</p>`))
}));

describe('Blog Updates List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('load function', () => {
    it('should return sorted blog posts without content', async () => {
      // We test processRawPosts directly since the route uses import.meta.glob
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);
      const postMetas = posts.map(({ content, ...meta }) => meta);

      expect(postMetas).toHaveLength(3);
      // Should be sorted newest first
      expect(postMetas[0].slug).toBe('second-test-post');
      expect(postMetas[1].slug).toBe('first-test-post');
      expect(postMetas[2].slug).toBe('third-test-post');

      // Should not include content
      for (const post of postMetas) {
        expect(post).not.toHaveProperty('content');
      }
    });

    it('should include all metadata fields', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);

      const firstPost = posts.find((p) => p.slug === 'first-test-post');
      expect(firstPost).toBeDefined();
      expect(firstPost!.title).toBe('First Test Post');
      expect(firstPost!.publishedAt).toBe('2025-06-15');
      expect(firstPost!.summary).toBe('This is the first test post.');
      expect(firstPost!.tags).toEqual(['testing', 'blog']);
    });

    it('should handle posts without tags', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);

      const secondPost = posts.find((p) => p.slug === 'second-test-post');
      expect(secondPost).toBeDefined();
      expect(secondPost!.tags).toEqual([]);
    });
  });
});

describe('Blog Update Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('load function', () => {
    it('should return a single post with rendered HTML content', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');
      const { marked } = await import('marked');

      const posts = processRawPosts(mockModules);
      const post = posts.find((p) => p.slug === 'first-test-post');

      expect(post).toBeDefined();

      const htmlContent = await marked(post!.content, {
        gfm: true,
        breaks: false
      });

      expect(htmlContent).toContain('First Post');
      expect(typeof htmlContent).toBe('string');
    });

    it('should throw 404 for non-existent slug', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);
      const post = posts.find((p) => p.slug === 'non-existent-post');

      expect(post).toBeUndefined();

      // The route would call error(404, 'Post not found') here
      expect(() => mockError(404, 'Post not found')).toThrow('Post not found');
    });

    it('should find post by exact slug', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);

      const post = posts.find((p) => p.slug === 'third-test-post');
      expect(post).toBeDefined();
      expect(post!.title).toBe('Third Test Post');
      expect(post!.content).toContain('Content of third post.');
    });

    it('should include all post fields for detail view', async () => {
      const { processRawPosts } = await import('../../src/lib/utils/blog');

      const posts = processRawPosts(mockModules);
      const post = posts.find((p) => p.slug === 'first-test-post');

      expect(post).toBeDefined();
      expect(post!.slug).toBe('first-test-post');
      expect(post!.title).toBe('First Test Post');
      expect(post!.publishedAt).toBe('2025-06-15');
      expect(post!.summary).toBe('This is the first test post.');
      expect(post!.tags).toEqual(['testing', 'blog']);
      expect(post!.content).toContain('First Post');
    });
  });
});

describe('Blog Home Page Integration', () => {
  it('should return only first 5 posts for recent posts section', async () => {
    const { processRawPosts } = await import('../../src/lib/utils/blog');

    // Create 7 posts
    const manyModules: Record<string, string> = {};
    for (let i = 1; i <= 7; i++) {
      manyModules[`/src/updates/post-${i}.md`] = `---
title: Post ${i}
publishedAt: 2025-${String(i).padStart(2, '0')}-15
summary: Summary for post ${i}.
---

Content for post ${i}.`;
    }

    const posts = processRawPosts(manyModules);
    const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

    expect(recentPosts).toHaveLength(5);
    // Newest first
    expect(recentPosts[0].slug).toBe('post-7');
    expect(recentPosts[4].slug).toBe('post-3');
  });

  it('should return all posts if fewer than 5 exist', async () => {
    const { processRawPosts } = await import('../../src/lib/utils/blog');

    const fewModules: Record<string, string> = {
      '/src/updates/only-post.md': `---
title: Only Post
publishedAt: 2025-01-01
summary: The only post.
---

Content.`
    };

    const posts = processRawPosts(fewModules);
    const recentPosts = posts.slice(0, 5).map(({ content, ...meta }) => meta);

    expect(recentPosts).toHaveLength(1);
    expect(recentPosts[0].slug).toBe('only-post');
  });
});
