'use strict';
// 貼り付け用プロンプト(paste/pNN.txt)から、ページ画像を一括生成する。
//
// 手作業でChatGPTに1枚ずつ貼っていた工程を置き換える。前回40ページを手で回した
// ときは、ページの抜け・同じ絵の二重保存・拡張子だけPNGのWebP混入が起きた。
// 番号とプロンプトの対応をコードで固定すれば、この種のずれは起こらない。
//
// 画像生成APIは課金される。生成前に必ず枚数と見積りを表示し、
// 既にあるページは黙って飛ばす(--force で上書き)。
const fs = require('fs');
const path = require('path');

const ENDPOINT_GENERATE = 'https://api.openai.com/v1/images/generations';
const ENDPOINT_EDIT = 'https://api.openai.com/v1/images/edits';

// gpt-image-1 が返せる寸法。9:16は無いので、縦長は2:3になる。
// 本文を9:16で組む場合、生成画像をそのまま使うと比率が合わない。
const SIZES = {
  portrait: '1024x1536',
  square: '1024x1024',
  landscape: '1536x1024',
};

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

/**
 * paste/ からページ番号つきプロンプトを集める。
 * ファイル名は p1.txt / p01.txt / cover2.txt のいずれでもよい。
 * 数字を持つものだけをページとして扱い、自然順に並べる。
 */
function collectPrompts(pasteDir, opts = {}) {
  if (!fs.existsSync(pasteDir)) throw new Error(`プロンプトのフォルダがありません: ${pasteDir}`);
  const only = parsePageSelector(opts.only);

  const prompts = [];
  for (const name of fs.readdirSync(pasteDir)) {
    if (!name.endsWith('.txt')) continue;
    const m = /^p0*(\d+)\.txt$/i.exec(name);
    if (!m) continue;
    const page = Number(m[1]);
    if (only && !only.has(page)) continue;
    prompts.push({
      page,
      file: path.join(pasteDir, name),
      text: fs.readFileSync(path.join(pasteDir, name), 'utf8').trim(),
    });
  }
  prompts.sort((a, b) => a.page - b.page);
  return prompts;
}

/**
 * "3" / "3-7" / "3,9,12-14" をページ番号の集合に変換する。
 * 指定が無いときは null(=全ページ)。
 */
function parsePageSelector(spec) {
  if (spec === undefined || spec === null || spec === true || spec === '') return null;
  const set = new Set();
  for (const part of String(spec).split(',')) {
    const range = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (from > to) throw new Error(`ページ指定の順序が逆です: ${part.trim()}`);
      for (let i = from; i <= to; i++) set.add(i);
      continue;
    }
    const one = /^\s*(\d+)\s*$/.exec(part);
    if (!one) throw new Error(`ページ指定を解釈できません: ${part.trim()}`);
    set.add(Number(one[1]));
  }
  return set;
}

/**
 * キャラクターシートを集める。プロンプト側が「添付のキャラシート」を前提に
 * 書かれているため、これが無いと毎ページで顔が変わる。
 */
function collectReferences(pasteDir) {
  if (!fs.existsSync(pasteDir)) return [];
  return fs
    .readdirSync(pasteDir)
    .filter((n) => /^char_.+\.(png|jpe?g)$/i.test(n))
    .sort()
    .map((n) => ({ name: n, path: path.join(pasteDir, n) }));
}

function outputPath(mangaDir, page) {
  return path.join(mangaDir, `P${String(page).padStart(2, '0')}.jpg`);
}

/**
 * APIに投げる本文を組み立てる。参照画像があるかどうかで
 * エンドポイントと本文の形が変わる。
 */
function buildRequest(prompt, references, opts = {}) {
  const size = SIZES[opts.orientation || 'portrait'];
  if (!size) throw new Error(`向きの指定が不正です: ${opts.orientation}`);
  const quality = opts.quality || 'high';

  if (!references.length) {
    return {
      url: ENDPOINT_GENERATE,
      json: { model: 'gpt-image-1', prompt, size, quality, n: 1 },
    };
  }

  const form = new FormData();
  form.set('model', 'gpt-image-1');
  form.set('prompt', prompt);
  form.set('size', size);
  form.set('quality', quality);
  for (const ref of references) {
    const type = /\.png$/i.test(ref.path) ? 'image/png' : 'image/jpeg';
    form.append('image[]', new Blob([fs.readFileSync(ref.path)], { type }), ref.name);
  }
  return { url: ENDPOINT_EDIT, form };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1ページ分を生成してPNGのBufferを返す。
 * 混雑と一時障害は指数バックオフで再試行する。生成は課金されるので、
 * 再試行の回数は抑えめにしてある。
 */
async function generateOne(prompt, references, opts = {}) {
  const { apiKey, fetchImpl = fetch, maxAttempts = 4 } = opts;
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません。');

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const req = buildRequest(prompt, references, opts);
    const init = { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` } };
    if (req.json) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(req.json);
    } else {
      init.body = req.form;
    }

    let res;
    try {
      res = await fetchImpl(req.url, init);
    } catch (err) {
      lastError = new Error(`通信に失敗しました: ${err.message}`);
      if (attempt === maxAttempts) break;
      await sleep(2000 * 2 ** (attempt - 1));
      continue;
    }

    if (res.ok) {
      const body = await res.json();
      const b64 = body && body.data && body.data[0] && body.data[0].b64_json;
      if (!b64) throw new Error('APIの応答に画像が含まれていません。');
      return Buffer.from(b64, 'base64');
    }

    const detail = await res.text().catch(() => '');
    lastError = new Error(`APIがHTTP ${res.status}を返しました。${detail.slice(0, 300)}`);
    if (!RETRYABLE.has(res.status) || attempt === maxAttempts) break;
    await sleep(2000 * 2 ** (attempt - 1));
  }
  throw lastError;
}

/**
 * 全ページを順に生成する。既にあるページは飛ばす。
 * 途中で落ちても、成功した分はディスクに残る。
 * @returns {Promise<{generated:number[], skipped:number[], failed:Array}>}
 */
async function run(book, opts = {}) {
  const pasteDir = opts.pasteDir || path.join(book.root, 'paste');
  const mangaDir = opts.mangaDir || path.join(book.root, 'manga');
  const prompts = collectPrompts(pasteDir, opts);
  if (!prompts.length) throw new Error(`${pasteDir} に pNN.txt が見つかりません。`);

  const references = collectReferences(pasteDir);
  fs.mkdirSync(mangaDir, { recursive: true });

  const generated = [];
  const skipped = [];
  const failed = [];

  for (const item of prompts) {
    const dest = outputPath(mangaDir, item.page);
    if (fs.existsSync(dest) && !opts.force) {
      skipped.push(item.page);
      if (opts.onProgress) opts.onProgress({ page: item.page, status: 'skipped' });
      continue;
    }
    if (opts.onProgress) opts.onProgress({ page: item.page, status: 'start' });
    try {
      const png = await generateOne(item.text, references, opts);
      fs.writeFileSync(dest, png);
      generated.push(item.page);
      if (opts.onProgress) opts.onProgress({ page: item.page, status: 'done', bytes: png.length });
    } catch (err) {
      failed.push({ page: item.page, message: err.message });
      if (opts.onProgress) opts.onProgress({ page: item.page, status: 'failed', message: err.message });
      if (opts.stopOnError) break;
    }
  }

  return { generated, skipped, failed, references: references.map((r) => r.name) };
}

module.exports = {
  run,
  collectPrompts,
  collectReferences,
  parsePageSelector,
  buildRequest,
  generateOne,
  outputPath,
  SIZES,
};
