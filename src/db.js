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

-- 本音診断(相手をどう思っているかの心理テスト)の回答と判定結果
CREATE TABLE IF NOT EXISTS honne_results (
  id TEXT PRIMARY KEY,
  relation TEXT,
  target_label TEXT,
  email TEXT,
  answers TEXT NOT NULL,
  scores TEXT NOT NULL,
  type_id TEXT NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- orders は kind ('birth' = 生年月日診断 / 'honne' = 本音診断) で参照先テーブルを切り替える。
-- そのため diagnosis_id には外部キー制約を張らない。
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnosis_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'birth',
  stripe_session_id TEXT,
  amount INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// 既存DBへのマイグレーション(本音診断の追加で orders に kind 列が必要になった)
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('orders', 'kind', "TEXT NOT NULL DEFAULT 'birth'");

module.exports = db;
