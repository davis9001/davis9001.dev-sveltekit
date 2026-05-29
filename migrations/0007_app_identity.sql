CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_metadata (key, value)
VALUES ('app_id', 'davis9001.dev-sveltekit')
ON CONFLICT(key) DO NOTHING;

INSERT INTO app_metadata (key, value)
VALUES ('app_name', 'davis9001.dev')
ON CONFLICT(key) DO NOTHING;