'use strict';
// Kindle向け固定レイアウト(fixed-layout)EPUB3を組み立てる。
// KDPは通常のリフロー型EPUBだと漫画が崩れるため、
// ・rendition:layout = pre-paginated
// ・spine の page-progression-direction = rtl(右開き)
// ・Kindle独自メタ(book-type=comic / primary-writing-mode / zero-margin ほか)
// を明示する必要がある。
const fs = require('fs');
const path = require('path');
const { ZipWriter } = require('./zip');
const { spreadProperty } = require('./pages');
const { imageSize, MEDIA_TYPES } = require('./imagesize');

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pad(n) {
  return String(n).padStart(4, '0');
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

function fixedCss(background) {
  return `@page { margin: 0; padding: 0; }
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: ${background};
}
body { text-align: center; }
div.page {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  position: relative;
}
div.page img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
`;
}

function pageXhtml(page, href, lang) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(lang)}" lang="${esc(lang)}">
<head>
  <meta charset="utf-8"/>
  <title>${esc(page.title)}</title>
  <meta name="viewport" content="width=${page.width}, height=${page.height}"/>
  <link rel="stylesheet" type="text/css" href="../css/fixed.css"/>
</head>
<body>
  <div class="page"><img src="../${href}" alt="${esc(page.title)}" width="${page.width}" height="${page.height}"/></div>
</body>
</html>
`;
}

function navXhtml(book, entries) {
  const items = entries
    .map((e) => `      <li><a href="${e.href}">${esc(e.label)}</a></li>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(book.language)}" lang="${esc(book.language)}">
<head>
  <meta charset="utf-8"/>
  <title>目次</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目次</h1>
    <ol>
${items}
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden="hidden">
    <ol>
      <li><a epub:type="bodymatter" href="${entries.length ? entries[0].href : 'text/p0001.xhtml'}">本文</a></li>
    </ol>
  </nav>
</body>
</html>
`;
}

function tocNcx(book, entries) {
  const points = entries
    .map(
      (e, i) => `    <navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${esc(e.label)}</text></navLabel>
      <content src="${e.href}"/>
    </navPoint>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${esc(book.language)}">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${esc(book.uuid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${esc(book.title)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>
`;
}

function contentOpf(book, manifest, spine, resolution, modified) {
  const lay = book.layout || {};
  const orientation = lay.orientationLock && lay.orientationLock !== 'none' ? lay.orientationLock : 'auto';
  const meta = [];
  meta.push(`    <dc:identifier id="BookId">urn:uuid:${esc(book.uuid)}</dc:identifier>`);
  meta.push(`    <dc:title id="title">${esc(book.title)}</dc:title>`);
  if (book.titleReading) {
    meta.push(`    <meta refines="#title" property="file-as">${esc(book.titleReading)}</meta>`);
  }
  if (book.subtitle) {
    meta.push(`    <dc:title id="subtitle">${esc(book.subtitle)}</dc:title>`);
    meta.push('    <meta refines="#subtitle" property="title-type">subtitle</meta>');
  }
  meta.push(`    <dc:creator id="creator">${esc(book.author)}</dc:creator>`);
  meta.push('    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>');
  if (book.authorReading) {
    meta.push(`    <meta refines="#creator" property="file-as">${esc(book.authorReading)}</meta>`);
  }
  if (book.publisher) meta.push(`    <dc:publisher>${esc(book.publisher)}</dc:publisher>`);
  meta.push(`    <dc:language>${esc(book.language)}</dc:language>`);
  if (book.description) meta.push(`    <dc:description>${esc(book.description)}</dc:description>`);
  for (const kw of book.keywords || []) meta.push(`    <dc:subject>${esc(kw)}</dc:subject>`);
  if (book.publishedDate) meta.push(`    <dc:date>${esc(book.publishedDate)}</dc:date>`);
  meta.push(`    <meta property="dcterms:modified">${modified}</meta>`);
  if (book.series && book.series.name) {
    meta.push(`    <meta property="belongs-to-collection" id="series">${esc(book.series.name)}</meta>`);
    meta.push('    <meta refines="#series" property="collection-type">series</meta>');
    if (book.series.index) {
      meta.push(`    <meta refines="#series" property="group-position">${esc(book.series.index)}</meta>`);
    }
  }
  // EPUB3 標準の固定レイアウト指定
  meta.push('    <meta property="rendition:layout">pre-paginated</meta>');
  meta.push(`    <meta property="rendition:orientation">${esc(orientation)}</meta>`);
  meta.push(`    <meta property="rendition:spread">${esc(lay.spread || 'landscape')}</meta>`);
  // Kindle独自指定(KDPの変換器はこちらを見る)
  meta.push('    <meta name="cover" content="cover-image"/>');
  meta.push('    <meta name="fixed-layout" content="true"/>');
  meta.push('    <meta name="book-type" content="comic"/>');
  meta.push(`    <meta name="original-resolution" content="${resolution}"/>`);
  meta.push(
    `    <meta name="primary-writing-mode" content="${book.direction === 'ltr' ? 'horizontal-lr' : 'horizontal-rl'}"/>`
  );
  meta.push('    <meta name="zero-gutter" content="true"/>');
  meta.push('    <meta name="zero-margin" content="true"/>');
  if (lay.orientationLock && lay.orientationLock !== 'none') {
    meta.push(`    <meta name="orientation-lock" content="${esc(lay.orientationLock)}"/>`);
  }
  if (lay.regionMagnification) {
    meta.push('    <meta name="RegionMagnification" content="true"/>');
  }

  const manifestXml = manifest
    .map(
      (m) =>
        `    <item id="${m.id}" href="${m.href}" media-type="${m.mediaType}"${m.properties ? ` properties="${m.properties}"` : ''}/>`
    )
    .join('\n');
  const spineXml = spine
    .map((s) => `    <itemref idref="${s.idref}"${s.properties ? ` properties="${s.properties}"` : ''}/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${esc(book.language)}" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
${meta.join('\n')}
  </metadata>
  <manifest>
${manifestXml}
  </manifest>
  <spine toc="ncx" page-progression-direction="${book.direction === 'ltr' ? 'ltr' : 'rtl'}">
${spineXml}
  </spine>
</package>
`;
}

// 出力ファイル名は必ずASCIIにする。
// Kindle Previewer(Windows版)は日本語を含むファイル名を開けず、理由を示さない
// エラーで止まる。入稿前の唯一の確認手段なので、ここで詰まると本が出せない。
// KDPはアップロード時のファイル名を見ないため、ASCIIにしても実害はない。
function safeFileName(book) {
  const ascii = (s) =>
    String(s || '')
      .replace(/[^\x20-\x7E]/g, '') // 非ASCIIを落とす
      .replace(/[\\/:*?"<>|]+/g, '') // ファイル名に使えない文字
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  // 作品フォルダ名を第一候補にする。works/kodomo-nisa のように、
  // 作品を表す短いASCII名が付いていることが多い。
  const fromDir = ascii(path.basename(book.root || ''));
  if (fromDir.length >= 2) return fromDir;

  const fromTitle = ascii(book.title);
  if (fromTitle.length >= 2) return fromTitle;

  return 'book';
}

/**
 * EPUBを生成してファイルに書き出す。
 * @param {object} book project.load() の戻り値
 * @param {Array} pages pages.collect() の戻り値
 * @param {{outFile?: string}} opts
 * @returns {{file:string, bytes:number, pageCount:number, resolution:string}}
 */
function build(book, pages, opts = {}) {
  if (!pages.length) throw new Error('ページ画像が1枚もありません。');

  const zip = new ZipWriter(book.publishedDate ? new Date(book.publishedDate) : new Date());
  zip.add('mimetype', 'application/epub+zip', { store: true });
  zip.add('META-INF/container.xml', CONTAINER_XML);
  zip.add('OEBPS/css/fixed.css', fixedCss((book.layout && book.layout.background) || '#000000'));

  const manifest = [
    { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
    { id: 'ncx', href: 'toc.ncx', mediaType: 'application/x-dtbncx+xml' },
    { id: 'css', href: 'css/fixed.css', mediaType: 'text/css' },
  ];
  const spine = [];
  const navEntries = [];

  // 表紙。指定が無ければ1ページ目を表紙として流用する。
  let coverPage = null;
  if (book.coverPath && fs.existsSync(book.coverPath)) {
    const buf = fs.readFileSync(book.coverPath);
    const size = imageSize(buf);
    if (!size) throw new Error(`表紙画像を解析できません: ${book.coverPath}`);
    const ext = size.format === 'png' ? 'png' : 'jpg';
    const href = `images/cover.${ext}`;
    zip.add(`OEBPS/${href}`, buf);
    manifest.push({
      id: 'cover-image',
      href,
      mediaType: MEDIA_TYPES[size.format],
      properties: 'cover-image',
    });
    coverPage = { width: size.width, height: size.height, title: '表紙', href };
  }

  let maxW = 0;
  let maxH = 0;
  const sequence = [];
  if (coverPage) sequence.push({ kind: 'cover', ...coverPage });
  pages.forEach((p, i) => {
    if (p.unreadable) throw new Error(`画像を解析できません: ${p.name}`);
    const ext = p.ext === '.jpeg' ? '.jpg' : p.ext;
    const href = `images/p${pad(i + 1)}${ext}`;
    zip.add(`OEBPS/${href}`, fs.readFileSync(p.file));
    sequence.push({
      kind: 'page',
      width: p.width,
      height: p.height,
      title: `${i + 1}ページ`,
      href,
      mediaType: p.mediaType,
      id: `img${pad(i + 1)}`,
    });
    maxW = Math.max(maxW, p.width);
    maxH = Math.max(maxH, p.height);
  });

  sequence.forEach((item, i) => {
    if (item.kind === 'page') {
      manifest.push({ id: item.id, href: item.href, mediaType: item.mediaType });
    }
    const pageId = item.kind === 'cover' ? 'cover-page' : `page${pad(i)}`;
    const xhtmlHref = item.kind === 'cover' ? 'text/cover.xhtml' : `text/p${pad(i)}.xhtml`;
    zip.add(`OEBPS/${xhtmlHref}`, pageXhtml(item, item.href, book.language));
    manifest.push({ id: pageId, href: xhtmlHref, mediaType: 'application/xhtml+xml' });
    spine.push({
      idref: pageId,
      properties: spreadProperty(i + 1, book.direction),
    });
    if (item.kind === 'cover' || (i - (coverPage ? 1 : 0)) % 10 === 0) {
      navEntries.push({ href: xhtmlHref, label: item.title });
    }
  });

  const resolution = `${maxW || (coverPage ? coverPage.width : 0)}x${maxH || (coverPage ? coverPage.height : 0)}`;
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  zip.add('OEBPS/nav.xhtml', navXhtml(book, navEntries));
  zip.add('OEBPS/toc.ncx', tocNcx(book, navEntries));
  zip.add('OEBPS/content.opf', contentOpf(book, manifest, spine, resolution, modified));

  const buf = zip.toBuffer();
  const outFile = opts.outFile || path.join(book.outPath, `${safeFileName(book)}.epub`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);

  return { file: outFile, bytes: buf.length, pageCount: sequence.length, resolution };
}

module.exports = { build, safeFileName, esc };
