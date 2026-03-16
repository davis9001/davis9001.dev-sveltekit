-- GitHub Activity API response cache table
-- Caches the full GitHub activity API response in D1 so it persists across
-- worker restarts and is shared reliably across all users.
-- New visitors see cached data instantly; the cache refreshes every 5 minutes.

CREATE TABLE IF NOT EXISTS github_activity_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);
