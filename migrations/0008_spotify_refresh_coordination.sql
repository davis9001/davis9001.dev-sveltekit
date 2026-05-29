-- Add refresh scheduling metadata and distributed refresh lock for Spotify cache.
-- This prevents concurrent viewers/workers from stampeding Spotify and D1.

ALTER TABLE spotify_cache ADD COLUMN next_refresh_at INTEGER;

CREATE TABLE IF NOT EXISTS spotify_refresh_lock (
  key TEXT PRIMARY KEY,
  lock_until INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner TEXT NOT NULL
);
