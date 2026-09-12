'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const generate = require('../src/generate');
const { makePng } = require('./helpers');

function makeWork(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindle-gen-'));
  fs.mkdirSync(path.join(dir, 'paste'));
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, 'paste', name), body);
  }
  return dir;
}

function okResponse(b64) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [{ b64_json: b64 }] }),
  };
}

function errResponse(status) {
  return { ok: false, status, text: async () => `{"error":"status ${status}"}` };
}

test('プロンプトはページ番号順に集まり、桁揃えの有無を吸収する', () => {
  const dir = makeWork({ 'p10.txt': 'ten', 'p2.txt': 'two', 'p01.txt': 'one', 'cover2.txt': '表紙' });
  const got = generate.collectPrompts(path.join(dir, 'paste'));
  assert.deepStrictEqual(got.map((p) => p.page), [1, 2, 10]);
  assert.strictEqual(got[0].text, 'one');
  // cover2.txt はページではないので混ざらない(混ざると番号がずれる)
  assert.ok(!got.some((p) => p.text === '表紙'));
});

test('ページ指定は単体・範囲・並記を解釈する', () => {
  assert.deepStrictEqual([...generate.parsePageSelector('7')], [7]);
  assert.deepStrictEqual([...generate.parsePageSelector('3-5')], [3, 4, 5]);
  assert.deepStrictEqual([...generate.parsePageSelector('19,24')], [19, 24]);
  assert.deepStrictEqual([...generate.parsePageSelector(' 2 , 8-9 ')], [2, 8, 9]);
  assert.strictEqual(generate.parsePageSelector(undefined), null);
  // --only を値なしで渡すと true が来る。全ページ扱いにする。
  assert.strictEqual(generate.parsePageSelector(true), null);
  assert.throws(() => generate.parsePageSelector('5-3'), /順序が逆/);
  assert.throws(() => generate.parsePageSelector('abc'), /解釈できません/);
});

test('--only で指定したページだけ集める', () => {
  const dir = makeWork({ 'p01.txt': 'a', 'p02.txt': 'b', 'p03.txt': 'c' });
  const got = generate.collectPrompts(path.join(dir, 'paste'), { only: '1,3' });
  assert.deepStrictEqual(got.map((p) => p.page), [1, 3]);
});

test('キャラクターシートは char_ で始まる画像だけを拾う', () => {
  const dir = makeWork({ 'p01.txt': 'a' });
  const paste = path.join(dir, 'paste');
  for (const n of ['char_KANA.png', 'char_AYUMI.png', 'crop_KANA.png', 'README.txt']) {
    fs.writeFileSync(path.join(paste, n), n.endsWith('.png') ? makePng(8, 8) : 'x');
  }
  assert.deepStrictEqual(
    generate.collectReferences(paste).map((r) => r.name),
    ['char_AYUMI.png', 'char_KANA.png']
  );
});

test('参照画像の有無でエンドポイントと本文の形が変わる', () => {
  const plain = generate.buildRequest('えをかいて', []);
  assert.match(plain.url, /\/images\/generations$/);
  assert.strictEqual(plain.json.model, 'gpt-image-1');
  assert.strictEqual(plain.json.size, generate.SIZES.portrait);

  const dir = makeWork({});
  const ref = path.join(dir, 'paste', 'char_KANA.png');
  fs.writeFileSync(ref, makePng(8, 8));
  const withRef = generate.buildRequest('えをかいて', [{ name: 'char_KANA.png', path: ref }]);
  assert.match(withRef.url, /\/images\/edits$/);
  assert.ok(withRef.form instanceof FormData);
  assert.strictEqual(withRef.form.get('prompt'), 'えをかいて');
  assert.strictEqual(withRef.form.getAll('image[]').length, 1);
});

test('向きの指定が不正なら生成前に止まる', () => {
  assert.throws(() => generate.buildRequest('x', [], { orientation: 'tall' }), /向きの指定/);
});

test('混雑(429)は再試行し、成功すれば画像を返す', async () => {
  const b64 = makePng(4, 4).toString('base64');
  let calls = 0;
  const png = await generate.generateOne('x', [], {
    apiKey: 'sk-test',
    maxAttempts: 3,
    fetchImpl: async () => {
      calls++;
      return calls < 3 ? errResponse(429) : okResponse(b64);
    },
  });
  assert.strictEqual(calls, 3);
  assert.ok(png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
});

test('プロンプト不備(400)は再試行せず即座に失敗する', async () => {
  let calls = 0;
  await assert.rejects(
    generate.generateOne('x', [], {
      apiKey: 'sk-test',
      fetchImpl: async () => {
        calls++;
        return errResponse(400);
      },
    }),
    /HTTP 400/
  );
  // 課金される操作なので、直らないエラーで回数を使い切らないこと
  assert.strictEqual(calls, 1);
});

test('APIキーが無ければ通信する前に止まる', async () => {
  await assert.rejects(
    generate.generateOne('x', [], {
      fetchImpl: async () => {
        throw new Error('ここには来ないはず');
      },
    }),
    /OPENAI_API_KEY/
  );
});

test('既にあるページは飛ばし、失敗しても成功分は残る', async () => {
  const dir = makeWork({ 'p01.txt': 'a', 'p02.txt': 'b', 'p03.txt': 'c' });
  const manga = path.join(dir, 'manga');
  fs.mkdirSync(manga);
  fs.writeFileSync(generate.outputPath(manga, 1), 'できあがっている');

  const b64 = makePng(4, 4).toString('base64');
  const res = await generate.run(
    { root: dir },
    {
      apiKey: 'sk-test',
      maxAttempts: 1,
      fetchImpl: async (url, init) => {
        const body = JSON.parse(init.body);
        return body.prompt === 'b' ? okResponse(b64) : errResponse(400);
      },
    }
  );

  assert.deepStrictEqual(res.skipped, [1]);
  assert.deepStrictEqual(res.generated, [2]);
  assert.deepStrictEqual(res.failed.map((f) => f.page), [3]);
  // 飛ばしたページは書き換えられていない
  assert.strictEqual(fs.readFileSync(generate.outputPath(manga, 1), 'utf8'), 'できあがっている');
  assert.ok(fs.existsSync(generate.outputPath(manga, 2)));
  assert.ok(!fs.existsSync(generate.outputPath(manga, 3)));
});

test('--force なら既存ページも作り直す', async () => {
  const dir = makeWork({ 'p01.txt': 'a' });
  const manga = path.join(dir, 'manga');
  fs.mkdirSync(manga);
  fs.writeFileSync(generate.outputPath(manga, 1), 'ふるい');

  const b64 = makePng(4, 4).toString('base64');
  const res = await generate.run(
    { root: dir },
    { apiKey: 'sk-test', force: true, fetchImpl: async () => okResponse(b64) }
  );
  assert.deepStrictEqual(res.generated, [1]);
  assert.notStrictEqual(fs.readFileSync(generate.outputPath(manga, 1), 'utf8'), 'ふるい');
});
