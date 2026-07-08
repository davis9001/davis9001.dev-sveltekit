-- Migration: GitHub Projects v2 sync for open_projects
-- Adds per-project GitHub Projects v2 board linkage and sync bookkeeping.
-- Task-level GitHub identity (githubItemId, githubIssueId, githubIssueNumber,
-- updatedAt) lives inside the existing `tasks` JSON column — no new column
-- needed for those, since tasks are already a JSON blob rewritten wholesale.

ALTER TABLE open_projects ADD COLUMN github_project_url TEXT;
ALTER TABLE open_projects ADD COLUMN github_project_id TEXT;
ALTER TABLE open_projects ADD COLUMN github_sync_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE open_projects ADD COLUMN github_last_synced_at TEXT;
ALTER TABLE open_projects ADD COLUMN github_last_sync_error TEXT;
ALTER TABLE open_projects ADD COLUMN github_priority_field_found INTEGER NOT NULL DEFAULT 0;
