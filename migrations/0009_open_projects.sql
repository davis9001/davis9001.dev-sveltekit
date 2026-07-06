-- Migration: Open Projects as a first-class feature
-- Extracts the 'open-projects' CMS content type into a dedicated table:
-- 1. Creates open_projects
-- 2. Copies existing CMS items (ids and timestamps preserved, legacy
--    completed_tasks merged into tasks as done)
-- 3. Seeds initial data on fresh databases only
-- 4. Removes the open-projects content type and its items from the CMS
--    (the registry entry is removed from code in the same release)

CREATE TABLE IF NOT EXISTS open_projects (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'planning', 'paused', 'blocked', 'complete')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  description TEXT NOT NULL DEFAULT '',
  primary_link TEXT,
  github_url TEXT,
  extra_links TEXT NOT NULL DEFAULT '[]', -- JSON: [{ "label": string, "href": string }]
  tasks TEXT NOT NULL DEFAULT '[]',       -- JSON: [{ "text": string, "done": boolean }]
  blockers TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_open_projects_group_sort
  ON open_projects (group_name, sort_order);

-- 2) Copy existing CMS rows (no-op on fresh databases)
INSERT INTO open_projects (
  id, group_name, name, status, priority, description,
  primary_link, github_url, extra_links, tasks, blockers, sort_order,
  created_at, updated_at
)
SELECT
  ci.id,
  COALESCE(json_extract(ci.fields, '$.group'), 'Other'),
  COALESCE(json_extract(ci.fields, '$.project_name'), ci.title),
  CASE
    WHEN json_extract(ci.fields, '$.status') IN ('active', 'planning', 'paused', 'blocked', 'complete')
    THEN json_extract(ci.fields, '$.status')
    ELSE 'active'
  END,
  CASE
    WHEN json_extract(ci.fields, '$.priority') IN ('high', 'medium', 'low')
    THEN json_extract(ci.fields, '$.priority')
    ELSE 'medium'
  END,
  COALESCE(json_extract(ci.fields, '$.description'), ''),
  json_extract(ci.fields, '$.primary_link'),
  json_extract(ci.fields, '$.github_url'),
  COALESCE(json_extract(ci.fields, '$.extra_links'), '[]'),
  -- Normalise tasks: legacy string entries become {text, done:false};
  -- legacy completed_tasks entries are appended as {text, done:true}
  COALESCE((
    SELECT json_group_array(json_object('text', t.txt, 'done', json(t.dn)))
    FROM (
      SELECT
        CASE
          WHEN j.type = 'text' THEN j.value
          ELSE COALESCE(json_extract(j.value, '$.text'), '')
        END AS txt,
        CASE
          WHEN j.type = 'object' AND json_extract(j.value, '$.done')
          THEN 'true' ELSE 'false'
        END AS dn
      FROM json_each(ci.fields, '$.tasks') j
      UNION ALL
      SELECT
        CASE
          WHEN k.type = 'text' THEN k.value
          ELSE COALESCE(json_extract(k.value, '$.text'), '')
        END,
        'true'
      FROM json_each(ci.fields, '$.completed_tasks') k
    ) t
  ), '[]'),
  COALESCE(json_extract(ci.fields, '$.blockers'), ''),
  CAST(COALESCE(json_extract(ci.fields, '$.sort_order'), 999) AS INTEGER),
  ci.created_at,
  ci.updated_at
FROM content_items ci
JOIN content_types ct ON ct.id = ci.content_type_id
WHERE ct.slug = 'open-projects';

-- 3) Seed fresh databases only (skipped when step 2 copied anything)
INSERT INTO open_projects (
  id, group_name, name, status, priority,
  primary_link, github_url, extra_links, tasks, sort_order
)
SELECT lower(hex(randomblob(16))), v.column1, v.column2, v.column3, v.column4,
       v.column5, v.column6, v.column7, v.column8, v.column9
FROM (VALUES
  ('*Space', 'starspace.group', 'active', 'high',
   'https://starspace.group/', NULL, '[]',
   '[{"text":"Rebuild with NebulaKit","done":false}]', 0),
  ('*Space', 'NebulaKit', 'active', 'high',
   'https://nebulakit.starspace.group/', 'https://github.com/starspacegroup/NebulaKit', '[]',
   '[{"text":"LLMs/Agents Use Agile and TDD","done":false}]', 1),
  ('*Space', 'Athena', 'active', 'medium',
   'https://athena.starspace.group/', NULL,
   '[{"label":"Whitepaper","href":"https://athena.starspace.group/whitepaper"}]',
   '[{"text":"v0.2 of Whitepaper","done":false}]', 2),
  ('*Space', 'SpaceBot', 'active', 'medium',
   'https://spacebot.starspace.group/', 'https://github.com/starspacegroup/spacebot', '[]',
   '[{"text":"Local Runners","done":false}]', 3),
  ('*Space', 'Ammoura', 'active', 'medium',
   'https://ammoura.me/', NULL, '[]',
   '[{"text":"Tenants","done":false}]', 4),
  ('*Space', 'Nabu', 'active', 'medium',
   NULL, NULL, '[]',
   '[{"text":"Content generation","done":false},{"text":"Content publishing","done":false}]', 5),
  ('*Space', 'Dashboard', 'active', 'medium',
   'https://dashboard.starspace.group', 'https://github.com/starspacegroup/dashboard', '[]',
   '[{"text":"Fix GitHub and Google Analytics","done":false}]', 6),
  ('*Space', 'Game', 'active', 'medium',
   'https://game.starspace.group', 'https://github.com/starspacegroup/game', '[]',
   '[{"text":"Finish end-game","done":false},{"text":"Fix glitches","done":false}]', 7),
  ('*Space', 'Guides', 'active', 'low',
   NULL, NULL, '[]',
   '[{"text":"Finish 0.1 of guides and publish","done":false}]', 8),
  ('*Space', 'Convey.land', 'planning', 'low',
   NULL, NULL, '[]',
   '[{"text":"Initialize project with NebulaKit","done":false}]', 9),
  ('Personal', 'davis9001.dev', 'active', 'high',
   'https://davis9001.dev/', 'https://github.com/starspacegroup/davis9001.dev-sveltekit', '[]',
   '[{"text":"Fix Spotify","done":false}]', 0),
  ('Personal', 'AgapeVerse', 'active', 'high',
   'https://agapeverse.app/', NULL, '[]',
   '[{"text":"Finish rebuild with SvelteKit","done":false}]', 1),
  ('Personal', 'Music (davis9001)', 'active', 'medium',
   NULL, NULL, '[]',
   '[{"text":"Create 11 songs","done":false}]', 2),
  ('Personal', 'Arizona Iced VST', 'active', 'medium',
   NULL, NULL, '[]',
   '[{"text":"Add AI feature: Describe synth/effect type and it will build it for you","done":false}]', 3),
  ('Personal', 'Abbot', 'active', 'medium',
   NULL, NULL, '[]',
   '[{"text":"Build on Linux","done":false}]', 4)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM open_projects);

-- 4) Remove the CMS remnants (junction rows cascade via FK)
DELETE FROM content_items
WHERE content_type_id IN (SELECT id FROM content_types WHERE slug = 'open-projects');

DELETE FROM content_types WHERE slug = 'open-projects';
