const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT,
  birthdate TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id TEXT PRIMARY KEY,
  birthdate TEXT NOT NULL,
  name TEXT,
  email TEXT,
  honmei_star INTEGER NOT NULL,
  kin INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnosis_id TEXT NOT NULL,
  stripe_session_id TEXT,
  amount INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (diagnosis_id) REFERENCES diagnoses(id)
);

-- 個人事業主 開業支援ツール(自分専用)
CREATE TABLE IF NOT EXISTS kaigyo_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT,
  address TEXT,
  business_name TEXT,
  business_type TEXT,
  industry_keyword TEXT,
  prefecture TEXT,
  start_date TEXT,
  resign_date TEXT,
  previous_status TEXT,
  wants_blue_tax_return INTEGER NOT NULL DEFAULT 0,
  has_family_employee INTEGER NOT NULL DEFAULT 0,
  has_employee INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kaigyo_tasks (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  where_to_submit TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  memo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kaigyo_documents (
  doc_type TEXT PRIMARY KEY,
  form_data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subsidy_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subsidy_id TEXT NOT NULL UNIQUE,
  title TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'considering',
  memo TEXT,
  cached_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;
