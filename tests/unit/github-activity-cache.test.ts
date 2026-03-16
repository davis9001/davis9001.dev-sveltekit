import type { D1Database } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGitHubActivityCache,
  getGitHubActivityCacheStale,
  setGitHubActivityCache,
  GITHUB_ACTIVITY_CACHE_TTL_MS
} from '../../src/lib/services/github-activity-cache';

/**
 * Creates a mock D1Database that stores rows in a simple in-memory map.
 * Supports the subset of D1 API used by the github-activity-cache service:
 *   db.prepare(sql).bind(...).first()
 *   db.prepare(sql).bind(...).run()
 */
function createMockDB(rows: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [key, row] of Object.entries(rows)) {
    store.set(key, row);
  }

  const db = {
    prepare: vi.fn((sql: string) => {
      return {
        bind: vi.fn((...args: unknown[]) => {
          return {
            first: vi.fn(async () => {
              const key = args[0] as string;
              return store.get(key) ?? null;
            }),
            run: vi.fn(async () => {
              if (
                sql.trim().toUpperCase().startsWith('INSERT') ||
                sql.trim().toUpperCase().startsWith('REPLACE')
              ) {
                const key = args[0] as string;
                const data = args[1] as string;
                const cachedAt = args[2] as number;
                store.set(key, { key, data, cached_at: cachedAt });
              }
              return { success: true };
            })
          };
        })
      };
    })
  };

  return db;
}

const sampleActivityData = [
  { date: '2025-03-14', count: 5, level: 2, pmRatio: 0.6 },
  { date: '2025-03-15', count: 3, level: 1, pmRatio: -1 },
  { date: '2025-03-16', count: 0, level: 0, pmRatio: -1 }
];

describe('GitHub Activity Cache Service (D1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGitHubActivityCache', () => {
    it('should return null when no cached data exists', async () => {
      const db = createMockDB();
      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return cached data when it is fresh (within 5 minutes)', async () => {
      const cachedAt = Date.now() - 60_000; // 1 minute ago
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toEqual(sampleActivityData);
    });

    it('should return null when cached data is stale (older than 5 minutes)', async () => {
      const cachedAt = Date.now() - GITHUB_ACTIVITY_CACHE_TTL_MS - 1000;
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when exactly at the 5-minute boundary', async () => {
      const cachedAt = Date.now() - GITHUB_ACTIVITY_CACHE_TTL_MS;
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      // At exactly the boundary, age === TTL, which is NOT less than TTL
      expect(result).toBeNull();
    });

    it('should return null when D1 throws an error', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error('D1 unavailable'))
          }))
        }))
      };

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no data column', async () => {
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          cached_at: Date.now()
          // missing data
        }
      });

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no cached_at column', async () => {
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData)
          // missing cached_at
        }
      });

      const result = await getGitHubActivityCache(db as unknown as D1Database);
      expect(result).toBeNull();
    });
  });

  describe('setGitHubActivityCache', () => {
    it('should store data in D1 with timestamp', async () => {
      const db = createMockDB();
      const now = Date.now();

      await setGitHubActivityCache(db as unknown as D1Database, sampleActivityData);

      expect(db.prepare).toHaveBeenCalledTimes(1);
      const sql = db.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('REPLACE');
      expect(sql).toContain('github_activity_cache');

      const bindCall = db.prepare.mock.results[0].value.bind;
      expect(bindCall).toHaveBeenCalledWith(
        'github-activity:full-response',
        JSON.stringify(sampleActivityData),
        expect.any(Number)
      );

      // Verify the timestamp is reasonable
      const calledTimestamp = bindCall.mock.calls[0][2] as number;
      expect(calledTimestamp).toBeGreaterThanOrEqual(now);
      expect(calledTimestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should not throw when D1 write fails', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn().mockRejectedValue(new Error('D1 write failed'))
          }))
        }))
      };

      await expect(
        setGitHubActivityCache(db as unknown as D1Database, sampleActivityData)
      ).resolves.toBeUndefined();
    });

    it('should not cache empty array data', async () => {
      const db = createMockDB();

      await setGitHubActivityCache(db as unknown as D1Database, []);

      // Should NOT write to D1 when data is empty
      expect(db.prepare).not.toHaveBeenCalled();
    });

    it('should not cache non-array data', async () => {
      const db = createMockDB();

      await setGitHubActivityCache(db as unknown as D1Database, 'not-an-array' as unknown as unknown[]);

      // Should NOT write to D1 when data is not an array
      expect(db.prepare).not.toHaveBeenCalled();
    });
  });

  describe('cache TTL constant', () => {
    it('should be 5 minutes in milliseconds', () => {
      expect(GITHUB_ACTIVITY_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('getGitHubActivityCacheStale', () => {
    it('should return null when no cached data exists', async () => {
      const db = createMockDB();
      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return cached data when it is fresh', async () => {
      const cachedAt = Date.now() - 60_000; // 1 minute ago
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleActivityData);
    });

    it('should return cached data even when stale (older than 5 minutes)', async () => {
      const cachedAt = Date.now() - GITHUB_ACTIVITY_CACHE_TTL_MS - 60_000; // 6 minutes ago
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleActivityData);
    });

    it('should return cached data even when very old (hours old)', async () => {
      const cachedAt = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          data: JSON.stringify(sampleActivityData),
          cached_at: cachedAt
        }
      });

      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toEqual(sampleActivityData);
    });

    it('should return null when D1 throws an error', async () => {
      const db = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error('D1 unavailable'))
          }))
        }))
      };

      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });

    it('should return null when row has no data column', async () => {
      const db = createMockDB({
        'github-activity:full-response': {
          key: 'github-activity:full-response',
          cached_at: Date.now()
          // missing data
        }
      });

      const result = await getGitHubActivityCacheStale(db as unknown as D1Database);
      expect(result).toBeNull();
    });
  });
});
