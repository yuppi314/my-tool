const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  series_title TEXT,
  genre TEXT,
  trim_size TEXT DEFAULT 'B6(コミック標準)',
  description TEXT,
  kdp_keywords TEXT,
  kdp_categories TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  aliases TEXT,
  role TEXT,
  appearance TEXT,
  personality TEXT,
  speech_style TEXT,
  notes TEXT,
  color_tag TEXT DEFAULT '#6c5ce7',
  image_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'plot',
  page_label TEXT,
  show_in_toc INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  heading TEXT,
  script TEXT,
  character_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS panels (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  w REAL NOT NULL DEFAULT 100,
  h REAL NOT NULL DEFAULT 100,
  shot_type TEXT DEFAULT '標準',
  description TEXT,
  dialogue TEXT,
  character_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS frontmatter (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('foreword', 'afterword')),
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, type)
);

CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_chapter ON scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pages_chapter ON pages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_panels_page ON panels(page_id);
`);

module.exports = db;
