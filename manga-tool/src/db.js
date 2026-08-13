const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    premise TEXT NOT NULL,
    art_style TEXT NOT NULL DEFAULT '',
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS panel_images (
    scenario_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    panel_number INTEGER NOT NULL,
    provider TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    image_data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (scenario_id, page_number, panel_number)
  );
`);

module.exports = db;
