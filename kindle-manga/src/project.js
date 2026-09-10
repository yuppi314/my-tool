'use strict';
// book.json の読み込み・既定値の補完。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_NAME = 'book.json';

const DEFAULTS = {
  title: '',
  titleReading: '',
  subtitle: '',
  author: '',
  authorReading: '',
  publisher: '',
  language: 'ja',
  description: '',
  keywords: [],
  categories: [],
  series: null, // { name, index }
  direction: 'rtl', // 日本の漫画は右開き
  pagesDir: 'pages',
  cover: 'cover.jpg',
  outDir: 'dist',
  layout: {
    orientationLock: 'portrait',
    spread: 'landscape',
    regionMagnification: true,
    background: '#000000',
  },
  price: { jpy: 500, royalty: 70 },
  publishedDate: '',
  uuid: '',
};

function deepMerge(base, override) {
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const [key, value] of Object.entries(override || {})) {
    if (value === undefined) continue;
    const canMerge =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key]);
    out[key] = canMerge ? deepMerge(base[key], value) : value;
  }
  return out;
}

function configPath(dir) {
  return path.join(dir, CONFIG_NAME);
}

function load(dir) {
  const file = configPath(dir);
  if (!fs.existsSync(file)) {
    const err = new Error(`${file} が見つかりません。先に "kindle-manga init ${dir}" を実行してください。`);
    err.code = 'ENOCONFIG';
    throw err;
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${file} のJSONが壊れています: ${e.message}`);
  }
  const book = deepMerge(DEFAULTS, raw);
  book.root = path.resolve(dir);
  book.pagesPath = path.resolve(dir, book.pagesDir);
  book.coverPath = book.cover ? path.resolve(dir, book.cover) : '';
  book.outPath = path.resolve(dir, book.outDir);
  if (!book.uuid) book.uuid = deriveUuid(book);
  return book;
}

/** タイトル+著者から安定したUUIDを作る(再ビルドしてもIDが変わらないように)。 */
function deriveUuid(book) {
  const hash = crypto
    .createHash('sha1')
    .update(`${book.title} ${book.author} ${book.subtitle}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

function save(dir, book) {
  const clone = Object.assign({}, book);
  for (const key of ['root', 'pagesPath', 'coverPath', 'outPath']) delete clone[key];
  fs.writeFileSync(configPath(dir), JSON.stringify(clone, null, 2) + '\n', 'utf8');
}

module.exports = { load, save, configPath, deriveUuid, DEFAULTS, CONFIG_NAME };
