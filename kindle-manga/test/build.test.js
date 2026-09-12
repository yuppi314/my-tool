'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const project = require('../src/project');
const pagesLib = require('../src/pages');
const epub = require('../src/epub');
const validate = require('../src/validate');
const metadata = require('../src/metadata');
const { imageSize } = require('../src/imagesize');
const { makePng, makeJpegHeader, readZip } = require('./helpers');

function makeBook(overrides = {}, pageCount = 4) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindle-manga-'));
  fs.mkdirSync(path.join(dir, 'pages'));
  for (let i = 1; i <= pageCount; i++) {
    fs.writeFileSync(path.join(dir, 'pages', `${String(i).padStart(3, '0')}.png`), makePng(1600, 2432));
  }
  fs.writeFileSync(path.join(dir, 'cover.png'), makePng(1600, 2560));
  const config = Object.assign(
    {
      title: '漫画でわかるテスト',
      titleReading: 'マンガデワカルテスト',
      author: 'テスト太郎',
      authorReading: 'テストタロウ',
      description: 'あ'.repeat(300),
      keywords: ['入門', '図解', 'まんが'],
      categories: ['コミック > 教養・実用'],
      cover: 'cover.png',
      series: { name: 'テストシリーズ', index: 1 },
      price: { jpy: 500, royalty: 70 },
    },
    overrides
  );
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify(config, null, 2));
  return dir;
}

test('自然順ソート: p2 は p10 より前に来る', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindle-sort-'));
  for (const name of ['p10.png', 'p2.png', 'p1.png']) {
    fs.writeFileSync(path.join(dir, name), makePng(1600, 2432));
  }
  const pages = pagesLib.collect(dir);
  assert.deepStrictEqual(pages.map((p) => p.name), ['p1.png', 'p2.png', 'p10.png']);
});

test('PNG/JPEGの寸法をヘッダから読める', () => {
  assert.deepStrictEqual(imageSize(makePng(1600, 2432)), { format: 'png', width: 1600, height: 2432 });
  const jpeg = imageSize(makeJpegHeader(1488, 2266));
  assert.strictEqual(jpeg.format, 'jpeg');
  assert.strictEqual(jpeg.width, 1488);
  assert.strictEqual(jpeg.height, 2266);
});

test('EPUBが固定レイアウト・右開きの漫画として生成される', () => {
  const dir = makeBook();
  const book = project.load(dir);
  const pages = pagesLib.collect(book.pagesPath);
  const built = epub.build(book, pages);

  assert.ok(fs.existsSync(built.file));
  const zip = readZip(fs.readFileSync(built.file));

  // EPUB仕様: mimetypeが先頭エントリで非圧縮
  assert.strictEqual(zip.order[0], 'mimetype');
  assert.strictEqual(zip.files.mimetype.toString(), 'application/epub+zip');
  assert.ok(zip.files['META-INF/container.xml']);

  const opf = zip.files['OEBPS/content.opf'].toString();
  assert.match(opf, /rendition:layout">pre-paginated</);
  assert.match(opf, /page-progression-direction="rtl"/);
  assert.match(opf, /name="book-type" content="comic"/);
  assert.match(opf, /name="primary-writing-mode" content="horizontal-rl"/);
  assert.match(opf, /name="original-resolution" content="1600x2432"/);
  assert.match(opf, /properties="cover-image"/);
  assert.match(opf, /<dc:title id="title">漫画でわかるテスト<\/dc:title>/);
  assert.match(opf, /belongs-to-collection/);

  // 表紙1 + 本文4 = 5ページ
  assert.strictEqual(built.pageCount, 5);
  assert.strictEqual((opf.match(/<itemref /g) || []).length, 5);

  // 右開きなので先頭は右ページ、次が左ページ
  const spreads = [...opf.matchAll(/<itemref idref="([^"]+)" properties="([^"]+)"\/>/g)].map((m) => m[2]);
  assert.deepStrictEqual(spreads.slice(0, 4), [
    'page-spread-right',
    'page-spread-left',
    'page-spread-right',
    'page-spread-left',
  ]);

  // 各ページのviewportが実寸と一致している(固定レイアウトの肝)
  const first = zip.files['OEBPS/text/p0001.xhtml'].toString();
  assert.match(first, /content="width=1600, height=2432"/);
  assert.ok(zip.files['OEBPS/images/p0001.png']);
  assert.ok(zip.files['OEBPS/nav.xhtml']);
  assert.ok(zip.files['OEBPS/toc.ncx']);
});

test('左開き(ltr)指定が反映される', () => {
  const dir = makeBook({ direction: 'ltr' });
  const book = project.load(dir);
  const built = epub.build(book, pagesLib.collect(book.pagesPath));
  const opf = readZip(fs.readFileSync(built.file)).files['OEBPS/content.opf'].toString();
  assert.match(opf, /page-progression-direction="ltr"/);
  assert.match(opf, /content="horizontal-lr"/);
});

test('同じ内容なら書籍UUIDが変わらない(再ビルドで別作品扱いにならない)', () => {
  const a = project.load(makeBook());
  const b = project.load(makeBook());
  assert.strictEqual(a.uuid, b.uuid);
});

test('プリフライト: 正常な作品はエラー0件', () => {
  const dir = makeBook();
  const book = project.load(dir);
  const result = validate.run(book, pagesLib.collect(book.pagesPath));
  assert.strictEqual(result.errors, 0, JSON.stringify(result.issues, null, 2));
});

test('プリフライト: 解像度不足・表紙欠落・紹介文なしを検出する', () => {
  const dir = makeBook({ description: '', cover: 'missing.jpg' }, 0);
  fs.writeFileSync(path.join(dir, 'pages', '001.png'), makePng(600, 900));
  const book = project.load(dir);
  const result = validate.run(book, pagesLib.collect(book.pagesPath));
  const messages = result.issues.map((i) => i.message).join('\n');
  assert.match(messages, /表紙画像が見つかりません/);
  assert.match(messages, /description が空です/);
  assert.match(messages, /幅600px/);
  assert.ok(result.errors >= 3);
});

test('プリフライト: KDPのキーワード禁止表現と70%ロイヤリティの価格帯を検出する', () => {
  const dir = makeBook({ keywords: ['無料', '入門'], price: { jpy: 2000, royalty: 70 } });
  const book = project.load(dir);
  const result = validate.run(book, pagesLib.collect(book.pagesPath));
  const messages = result.issues.map((i) => i.message).join('\n');
  assert.match(messages, /禁止表現/);
  assert.match(messages, /70%ロイヤリティなのに価格が¥2000/);
});

test('KDP登録シートとチェックリストが生成される', () => {
  const dir = makeBook();
  const book = project.load(dir);
  const pages = pagesLib.collect(book.pagesPath);
  const built = epub.build(book, pages);
  const result = validate.run(book, pages);
  const files = metadata.write(book, pages, built, result);

  const sheet = fs.readFileSync(files.sheetFile, 'utf8');
  assert.match(sheet, /漫画でわかるテスト/);
  assert.match(sheet, /右から左\(日本の漫画\)/);
  assert.match(sheet, /1\. 入門/);
  assert.match(sheet, /5\. \(空き\)/); // 7枠のうち空きが明示される
  assert.match(sheet, /約¥350/); // 500円 x 70%

  const check = fs.readFileSync(files.checkFile, 'utf8');
  assert.match(check, /Kindle Previewer 3/);
  assert.strictEqual(JSON.parse(fs.readFileSync(files.jsonFile, 'utf8')).pageCount, 4);
});

test('プリフライト: 9:16の縦長ページは解像度警告を出さない', () => {
  // 幅1440pxは推奨1600pxを下回るが、長辺2560pxで解像度は足りている。
  const dir = makeBook({}, 0);
  fs.writeFileSync(path.join(dir, 'pages', '001.png'), makePng(1440, 2560));
  const book = project.load(dir);
  const result = validate.run(book, pagesLib.collect(book.pagesPath));
  const messages = result.issues.map((i) => i.message).join('\n');
  assert.doesNotMatch(messages, /1440x2560px/);

  // 幅も長辺も足りない場合は従来どおり警告する。
  const small = makeBook({}, 0);
  fs.writeFileSync(path.join(small, 'pages', '001.png'), makePng(1300, 1900));
  const sb = project.load(small);
  const sr = validate.run(sb, pagesLib.collect(sb.pagesPath));
  assert.match(sr.issues.map((i) => i.message).join('\n'), /1300x1900px/);
});

test('出力ファイル名はASCIIになる(Kindle Previewerが日本語名を開けないため)', () => {
  const asciiOnly = /^[\x20-\x7E]+$/;

  // 作品フォルダ名を優先する
  assert.strictEqual(
    epub.safeFileName({ root: '/w/works/kodomo-nisa', title: '漫画でわかるこどもNISA' }),
    'kodomo-nisa'
  );
  // フォルダ名が使えなければタイトルからASCIIを拾う
  assert.strictEqual(epub.safeFileName({ root: '/w/作品', title: 'Manga NISA' }), 'Manga-NISA');
  // どちらも使えなければ既定値
  assert.strictEqual(epub.safeFileName({ root: '/w/作品', title: '漫画' }), 'book');

  // 実際のビルドでも日本語が混ざらない
  const dir = makeBook();
  const book = project.load(dir);
  const built = epub.build(book, pagesLib.collect(book.pagesPath));
  const name = path.basename(built.file);
  assert.ok(asciiOnly.test(name), `ファイル名に非ASCIIが残っている: ${name}`);
  assert.match(name, /\.epub$/);
});
