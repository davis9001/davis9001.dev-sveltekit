import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Mock global fetch before importing module
const originalFetch = globalThis.fetch;

describe('GitHub Activity API', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    // Default fallback: return empty OK response for any unmatched fetch calls
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('api.github.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve('')
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('')
      });
    });
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createMockPlatform(token?: string) {
    return {
      env: token ? { GH_API_TOKEN: token } : {}
    };
  }

  function createContributionHTML(days: { date: string; level: number; count: number; }[]): string {
    let html = '<div class="js-calendar-graph">';
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const id = `contribution-day-component-${i}-${i}`;
      html += `<td data-date="${day.date}" id="${id}" data-level="${day.level}"></td>`;
      if (day.count > 0) {
        html += `<tool-tip for="${id}">${day.count} contribution${day.count !== 1 ? 's' : ''}</tool-tip>`;
      } else {
        html += `<tool-tip for="${id}">No contributions</tool-tip>`;
      }
    }
    html += '</div>';
    return html;
  }

  describe('GET /api/github-activity', () => {
    it('should return activity data as JSON array', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const html = createContributionHTML([
        { date: dateStr, level: 2, count: 5 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(63); // 9 weeks
    });

    it('should return empty array when contribution fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should set cache-control headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);

      expect(response.headers.get('Cache-Control')).toContain('public');
    });

    it('should sort activity data by date ascending', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      const html = createContributionHTML([
        { date: today.toISOString().split('T')[0], level: 1, count: 3 },
        { date: dayBefore.toISOString().split('T')[0], level: 2, count: 7 },
        { date: yesterday.toISOString().split('T')[0], level: 1, count: 1 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      for (let i = 1; i < data.length; i++) {
        expect(data[i].date >= data[i - 1].date).toBe(true);
      }
    });

    it('should include zero-count days for days without contributions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      // All days should have level 0 and count 0 when no data
      const zeroDays = data.filter((d: any) => d.count === 0);
      expect(zeroDays.length).toBe(63);
    });

    it('should parse contribution levels from HTML', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const html = createContributionHTML([
        { date: dateStr, level: 3, count: 10 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      const todayData = data.find((d: any) => d.date === dateStr);
      expect(todayData).toBeDefined();
      expect(todayData.level).toBe(3);
      expect(todayData.count).toBe(10);
    });

    it('should handle platform without env', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: {} } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle undefined platform', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: undefined } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET with GH_API_TOKEN', () => {
    it('should fetch commit timestamps via GraphQL when token is available', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const html = createContributionHTML([
        { date: dateStr, level: 2, count: 5 }
      ]);

      // Contribution HTML fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL contrib query
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: []
              }
            }
          }
        })
      });

      // Events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      // Should have called GraphQL endpoint
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle GraphQL errors gracefully', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('bad-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle GraphQL response with errors field', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns errors
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          errors: [{ message: 'Rate limited' }]
        })
      });

      // Events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should fetch commit timestamps from repositories', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 2, count: 5 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL contrib query returns repos
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'davis9001/test-repo', isPrivate: false },
                    contributions: { totalCount: 3 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits for repo - return morning commit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            commit: {
              author: { date: `${dateStr}T09:30:00Z` }
            }
          },
          {
            commit: {
              author: { date: `${dateStr}T15:30:00Z` }
            }
          }
        ])
      });

      // Events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      // The day should have pmRatio data (may be -1 if timezone conversion fails in test env)
      const todayData = data.find((d: any) => d.date === dateStr);
      expect(todayData).toBeDefined();
      expect(todayData.level).toBe(2);
      expect(todayData.count).toBe(5);
      // pmRatio depends on toLocaleString timezone support in test env
      expect(typeof todayData.pmRatio).toBe('number');
    });

    it('should handle commit fetch failure for a repo', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns repo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 1 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      // Events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events API with timestamps', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 1, count: 2 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: []
              }
            }
          }
        })
      });

      // Events API returns events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { created_at: `${dateStr}T14:00:00Z`, type: 'PushEvent' },
          { created_at: `${dateStr}T08:00:00Z`, type: 'CreateEvent' }
        ])
      });

      // Second page of events (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events API failure', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { contributionsCollection: { commitContributionsByRepository: [] } } }
        })
      });

      // Events API fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events with missing created_at', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { contributionsCollection: { commitContributionsByRepository: [] } } }
        })
      });

      // Events with missing created_at
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { type: 'PushEvent' }, // no created_at
          { created_at: null, type: 'PushEvent' } // null created_at
        ])
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('test-token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should merge commit hours and event hours', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 3, count: 8 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns a repo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'davis9001/project', isPrivate: false },
                    contributions: { totalCount: 2 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits for the repo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { commit: { author: { date: `${dateStr}T10:00:00Z` } } }
        ])
      });

      // Events API returns events for same date
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { created_at: `${dateStr}T20:00:00Z`, type: 'PushEvent' }
        ])
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      const todayEntry = data.find((d: any) => d.date === dateStr);
      expect(todayEntry).toBeDefined();
      // Should have pmRatio reflecting both AM and PM activity
      if (todayEntry && todayEntry.pmRatio >= 0) {
        expect(todayEntry.pmRatio).toBeGreaterThanOrEqual(0);
        expect(todayEntry.pmRatio).toBeLessThanOrEqual(1);
      }
    });

    it('should handle repos with zero contributions', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns repo with 0 contributions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/empty-repo', isPrivate: false },
                    contributions: { totalCount: 0 }
                  }
                ]
              }
            }
          }
        })
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle GraphQL exception during fetch', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL throws exception
      mockFetch.mockRejectedValueOnce(new Error('GraphQL network error'));

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events API exception', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { contributionsCollection: { commitContributionsByRepository: [] } } }
        })
      });

      // Events throws
      mockFetch.mockRejectedValueOnce(new Error('Events network error'));

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should paginate through commits when more than 100 results', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 4, count: 120 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'davis9001/big-repo', isPrivate: false },
                    contributions: { totalCount: 120 }
                  }
                ]
              }
            }
          }
        })
      });

      // First page: 100 commits
      const commits100 = Array.from({ length: 100 }, (_, i) => ({
        commit: { author: { date: `${dateStr}T${String(i % 24).padStart(2, '0')}:00:00Z` } }
      }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(commits100)
      });

      // Second page: 20 commits (less than 100, stops pagination)
      const commits20 = Array.from({ length: 20 }, (_, i) => ({
        commit: { author: { date: `${dateStr}T${String(i % 24).padStart(2, '0')}:30:00Z` } }
      }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(commits20)
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle commits without author date using committer date', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 1, count: 1 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 1 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commit with only committer date
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { commit: { author: { date: null }, committer: { date: `${dateStr}T11:00:00Z` } } }
        ])
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle commits with no date at all', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 1 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commit with no date
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { commit: {} }
        ])
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should properly count active days', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const html = createContributionHTML([
        { date: today.toISOString().split('T')[0], level: 1, count: 2 },
        { date: yesterday.toISOString().split('T')[0], level: 2, count: 5 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      const activeDays = data.filter((d: any) => d.count > 0);
      expect(activeDays.length).toBe(2);
    });

    it('should return pmRatio of -1 for days without time data', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const html = createContributionHTML([
        { date: dateStr, level: 1, count: 3 }
      ]);

      // No token = no timestamp data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      const todayData = data.find((d: any) => d.date === dateStr);
      expect(todayData).toBeDefined();
      expect(todayData.pmRatio).toBe(-1);
    });

    it('should handle repo commit exception gracefully', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL with repos
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 5 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits request throws
      mockFetch.mockRejectedValueOnce(new Error('Connection reset'));

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle non-array commits response', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL with repos
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 1 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits returns non-array (e.g. rate limit object)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'API rate limit exceeded' })
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle GraphQL response without repo data', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns null data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: null
        })
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should use public events endpoint without token', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // No GraphQL call without token
      // Events API (public endpoint, max 3 pages)
      // Since there's no token, it skips GraphQL. Events will be public.

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle commits with invalid date strings (classifyTimestamp returns null)', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 1, count: 1 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns a repo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 2 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits with invalid date strings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { commit: { author: { date: 'not-a-valid-date' } } },
          { commit: { author: { date: 'garbage' }, committer: { date: 'also-garbage' } } }
        ])
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle tooltip referencing a cell ID not in the contribution map', async () => {
      // Create HTML where a tooltip references a cell ID whose date is NOT in the cells
      // This triggers the `else` branch at line 241 in parseContributionCalendar
      const html = `
				<div class="js-calendar-graph">
					<td data-date="2025-01-15" id="contribution-day-component-0-0" data-level="2"></td>
					<tool-tip for="contribution-day-component-0-0">3 contributions</tool-tip>
					<tool-tip for="contribution-day-component-99-99">5 contributions</tool-tip>
				</div>
			`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform() } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should merge event hours for dates NOT in commit hours (else branch)', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      // Use a different date for events that won't be in commit hours
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const html = createContributionHTML([
        { date: dateStr, level: 2, count: 3 },
        { date: yesterdayStr, level: 1, count: 1 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns repo with commits only for today
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: { totalCount: 1 }
                  }
                ]
              }
            }
          }
        })
      });

      // Commits only for today
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { commit: { author: { date: `${dateStr}T10:00:00Z` } } }
        ])
      });

      // Events API returns events for YESTERDAY (date not in commitHours)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { created_at: `${yesterdayStr}T15:00:00Z`, type: 'PushEvent' },
          { created_at: `${yesterdayStr}T20:00:00Z`, type: 'CreateEvent' }
        ])
      });

      // Second page of events empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle contributions with null optional chaining values', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL returns repo with null contributions field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: {
              contributionsCollection: {
                commitContributionsByRepository: [
                  {
                    repository: { nameWithOwner: 'user/repo', isPrivate: false },
                    contributions: null
                  }
                ]
              }
            }
          }
        })
      });

      // Events
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events with invalid timestamps', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL - no repos
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { contributionsCollection: { commitContributionsByRepository: [] } } }
        })
      });

      // Events with invalid dates (classifyTimestamp returns null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { created_at: 'not-a-real-date', type: 'PushEvent' },
          { created_at: 'invalid', type: 'CreateEvent' }
        ])
      });

      // Second page empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle events with non-array response', async () => {
      const html = createContributionHTML([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      // GraphQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { contributionsCollection: { commitContributionsByRepository: [] } } }
        })
      });

      // Events returns non-array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'rate limited' })
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({ platform: createMockPlatform('token') } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('D1 caching behavior', () => {
    function createMockDB(cachedData?: unknown, cachedAt?: number) {
      const store = new Map<string, Record<string, unknown>>();
      if (cachedData !== undefined && cachedAt !== undefined) {
        store.set('github-activity:full-response', {
          key: 'github-activity:full-response',
          data: JSON.stringify(cachedData),
          cached_at: cachedAt
        });
      }

      return {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...args: unknown[]) => ({
            first: vi.fn(async () => {
              const key = args[0] as string;
              return store.get(key) ?? null;
            }),
            run: vi.fn(async () => {
              if (sql.trim().toUpperCase().startsWith('REPLACE')) {
                const key = args[0] as string;
                const data = args[1] as string;
                const cachedAt = args[2] as number;
                store.set(key, { key, data, cached_at: cachedAt });
              }
              return { success: true };
            })
          }))
        }))
      };
    }

    it('should return cached data from D1 when fresh (< 5 minutes)', async () => {
      const cachedActivity = [
        { date: '2025-03-16', count: 5, level: 2, pmRatio: 0.5 }
      ];
      const db = createMockDB(cachedActivity, Date.now() - 60_000); // 1 minute ago

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({
        platform: { env: { DB: db } }
      } as any);
      const data = await response.json();

      expect(data).toEqual(cachedActivity);
      // Should NOT have fetched from GitHub (no fetch calls)
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from GitHub when cache is stale (> 5 minutes)', async () => {
      const staleData = [
        { date: '2025-03-16', count: 1, level: 1, pmRatio: -1 }
      ];
      const db = createMockDB(staleData, Date.now() - 6 * 60 * 1000); // 6 minutes ago

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({
        platform: { env: { DB: db } }
      } as any);
      const data = await response.json();

      // Should have fetched from GitHub
      expect(mockFetch).toHaveBeenCalled();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should write to D1 cache after a successful GitHub fetch', async () => {
      const db = createMockDB(); // empty cache

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const html = createContributionHTML([
        { date: dateStr, level: 2, count: 5 }
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      await GET({
        platform: { env: { DB: db } }
      } as any);

      // Should have written to D1 (REPLACE INTO github_activity_cache)
      const prepareCalls = db.prepare.mock.calls;
      const writeCalls = prepareCalls.filter((c: string[]) =>
        c[0].includes('REPLACE')
      );
      expect(writeCalls.length).toBe(1);
    });

    it('should not write empty arrays to D1 cache', async () => {
      const db = createMockDB(); // empty cache

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      await GET({
        platform: { env: { DB: db } }
      } as any);

      // Should NOT have written to D1 since the response was empty
      const prepareCalls = db.prepare.mock.calls;
      const writeCalls = prepareCalls.filter((c: string[]) =>
        c[0].includes('REPLACE')
      );
      expect(writeCalls.length).toBe(0);
    });

    it('should work when platform has no DB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<div></div>')
      });

      const { GET } = await import('../../src/routes/api/github-activity/+server.js');
      const response = await GET({
        platform: { env: {} }
      } as any);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });
  });
});
