'use strict';
// pages/ の画像を自然順に並べ、寸法とファイルサイズを付けて返す。
const fs = require('fs');
const path = require('path');
const { imageSize, MEDIA_TYPES } = require('./imagesize');

const SUPPORTED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

/** "p2.jpg" < "p10.jpg" になるよう数字部分を数値として比較する。 */
function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g;
  const ax = String(a).toLowerCase().match(re) || [];
  const bx = String(b).toLowerCase().match(re) || [];
  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const an = /^\d+$/.test(ax[i]);
    const bn = /^\d+$/.test(bx[i]);
    if (an && bn) {
      const diff = Number(ax[i]) - Number(bx[i]);
      if (diff !== 0) return diff;
    } else if (ax[i] !== bx[i]) {
      return ax[i] < bx[i] ? -1 : 1;
    }
  }
  return ax.length - bx.length;
}

/**
 * @param {string} dir 画像ディレクトリ
 * @returns {{index:number, file:string, name:string, ext:string, bytes:number,
 *            width:number, height:number, format:string, mediaType:string,
 *            landscape:boolean, unreadable:boolean}[]}
 */
function collect(dir) {
  if (!fs.existsSync(dir)) {
    const err = new Error(`ページ画像フォルダが見つかりません: ${dir}`);
    err.code = 'ENOPAGES';
    throw err;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.') && SUPPORTED_EXT.has(path.extname(f).toLowerCase()))
    .sort(naturalCompare);

  return files.map((file, i) => {
    const full = path.join(dir, file);
    const bytes = fs.statSync(full).size;
    // ヘッダだけ読めば寸法は取れるので、巨大画像でも全部はメモリに載せない。
    const fd = fs.openSync(full, 'r');
    const head = Buffer.alloc(Math.min(bytes, 256 * 1024));
    fs.readSync(fd, head, 0, head.length, 0);
    fs.closeSync(fd);
    const size = imageSize(head);
    const ext = path.extname(file).toLowerCase();
    return {
      index: i + 1,
      file: full,
      name: file,
      ext,
      bytes,
      width: size ? size.width : 0,
      height: size ? size.height : 0,
      format: size ? size.format : 'unknown',
      progressive: size ? Boolean(size.progressive) : false,
      mediaType: size ? MEDIA_TYPES[size.format] : 'application/octet-stream',
      landscape: size ? size.width > size.height : false,
      unreadable: !size,
    };
  });
}

/**
 * 見開き位置を決める。右開き(rtl)なら1ページ目は右ページ。
 * EPUB3の itemref properties に渡す値を返す。
 */
function spreadProperty(pageIndex, direction) {
  const isFirstOfPair = pageIndex % 2 === 1;
  if (direction === 'ltr') return isFirstOfPair ? 'page-spread-left' : 'page-spread-right';
  return isFirstOfPair ? 'page-spread-right' : 'page-spread-left';
}

module.exports = { collect, naturalCompare, spreadProperty, SUPPORTED_EXT };
