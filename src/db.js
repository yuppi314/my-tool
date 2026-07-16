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
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id TEXT PRIMARY KEY,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  activity_level INTEGER NOT NULL,
  target_kg REAL NOT NULL,
  period_days INTEGER NOT NULL DEFAULT 30,
  name TEXT,
  email TEXT,
  bmr REAL NOT NULL,
  tdee REAL NOT NULL,
  target_calories REAL NOT NULL,
  safety_level TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnosis_id TEXT NOT NULL,
  log_date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (diagnosis_id) REFERENCES diagnoses(id),
  UNIQUE (diagnosis_id, log_date)
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnosis_id TEXT NOT NULL,
  log_date TEXT NOT NULL,
  food_key TEXT NOT NULL,
  food_name TEXT NOT NULL,
  grams REAL,
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  carb_g REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (diagnosis_id) REFERENCES diagnoses(id)
);
`);

module.exports = db;
