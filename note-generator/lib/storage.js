const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DATA_DIR = path.join(__dirname, "..", "data");
const ARTICLES_DIR = path.join(DATA_DIR, "articles");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

function ensureDirs() {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, "[]");
  }
}

function readIndex() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
}

function writeIndex(entries) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(entries, null, 2));
}

function saveArticle({ theme, tone, length, titles, markdown }) {
  ensureDirs();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const filename = `${createdAt.slice(0, 10)}_${id}.md`;

  fs.writeFileSync(path.join(ARTICLES_DIR, filename), markdown, "utf8");

  const entry = { id, theme, tone, length, titles, createdAt, filename };
  const index = readIndex();
  index.unshift(entry);
  writeIndex(index);

  return entry;
}

function listArticles() {
  return readIndex();
}

function getArticle(id) {
  const entry = readIndex().find((item) => item.id === id);
  if (!entry) return null;

  const markdown = fs.readFileSync(path.join(ARTICLES_DIR, entry.filename), "utf8");
  return { ...entry, markdown };
}

module.exports = { saveArticle, listArticles, getArticle };
