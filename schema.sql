-- Mini Sakura City — D1 schema
-- wrangler d1 execute sakura-city --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  date TEXT,
  track_id TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_images (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  key TEXT NOT NULL,
  caption TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  key TEXT,
  url TEXT,
  scope TEXT NOT NULL DEFAULT 'both',
  is_default INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_memory ON memory_images(memory_id);
CREATE INDEX IF NOT EXISTS idx_memories_sort ON memories(sort);
