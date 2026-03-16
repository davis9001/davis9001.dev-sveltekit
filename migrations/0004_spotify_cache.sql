-- Spotify API response cache table
-- Caches the full Spotify API response in D1 so it persists across
-- worker restarts and is shared reliably across all users.

CREATE TABLE IF NOT EXISTS spotify_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);
