// 家事の引き継ぎ表(LINE連携)のテーブル。吉方位ツールと同じ SQLite ファイルに kaji_ 接頭辞で置く。
const db = require('../db');

db.exec(`
CREATE TABLE IF NOT EXISTS kaji_families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  reward_text TEXT,
  reward_xp INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kaji_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  line_user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES kaji_families(id)
);

CREATE TABLE IF NOT EXISTS kaji_chores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  steps TEXT NOT NULL,
  tip TEXT,
  xp INTEGER NOT NULL DEFAULT 20,
  is_meal INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (family_id) REFERENCES kaji_families(id)
);

CREATE TABLE IF NOT EXISTS kaji_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  chore_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  bonus TEXT NOT NULL DEFAULT '[]',
  at TEXT NOT NULL,
  FOREIGN KEY (chore_id) REFERENCES kaji_chores(id),
  FOREIGN KEY (member_id) REFERENCES kaji_members(id)
);

CREATE TABLE IF NOT EXISTS kaji_thanks (
  log_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  PRIMARY KEY (log_id, member_id)
);

CREATE TABLE IF NOT EXISTS kaji_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  by_member INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'done', 'cancelled')),
  taken_by INTEGER,
  xp INTEGER NOT NULL DEFAULT 15,
  at TEXT NOT NULL,
  done_at TEXT
);

-- 「ごちそうさま」から片付けまでの30分タイマー。サーバーが再起動しても期限切れを拾えるよう DB に置く。
CREATE TABLE IF NOT EXISTS kaji_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  started_by INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  done_at TEXT,
  done_by INTEGER,
  notified_at TEXT
);

CREATE INDEX IF NOT EXISTS kaji_logs_family ON kaji_logs (family_id, at);
CREATE INDEX IF NOT EXISTS kaji_meals_open ON kaji_meals (done_at, notified_at, deadline_at);
`);

module.exports = db;
