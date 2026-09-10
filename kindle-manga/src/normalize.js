'use strict';
// 画像の一括整形(任意機能)。sharp が入っている場合のみ有効。
// 生成AIで作った画像はサイズがバラバラ・PNGで巨大・見開きが1枚、という状態になりがちなので、
// Kindleの仕様に合わせて揃える。
const fs = require('fs');
const path = require('path');

function loadSharp() {
  try {
    // eslint-disable-next-line global-require
    return require('sharp');
  } catch (e) {
    return null;
  }
}

const PRESETS = {
  // 幅x高さ。Kindle固定レイアウト漫画でよく使われる値。
  hd: { width: 1600, height: 2560 },
  b6: { width: 1488, height: 2266 }, // 一般的な日本のコミックス比率(1:1.52)
  standard: { width: 1200, height: 1920 },
};

/**
 * @param {Array} pages pages.collect() の結果
 * @param {string} outDir 出力先
 * @param {{preset?:string, width?:number, height?:number, grayscale?:boolean,
 *          quality?:number, splitSpreads?:boolean, direction?:string}} opts
 */
async function normalize(pages, outDir, opts = {}) {
  const sharp = loadSharp();
  if (!sharp) {
    const err = new Error(
      'normalize には sharp が必要です。`npm install sharp` を実行してください(EPUB生成自体は sharp 無しで動きます)。'
    );
    err.code = 'ENOSHARP';
    throw err;
  }

  const preset = PRESETS[opts.preset || 'b6'] || PRESETS.b6;
  const width = opts.width || preset.width;
  const height = opts.height || preset.height;
  const quality = opts.quality || 88;
  const rtl = (opts.direction || 'rtl') !== 'ltr';

  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  let counter = 0;

  for (const page of pages) {
    const inputs = [];
    if (opts.splitSpreads && page.landscape) {
      // 見開き1枚を2ページへ分割。右開きなら「右半分が先」。
      const half = Math.floor(page.width / 2);
      const right = { left: half, top: 0, width: page.width - half, height: page.height };
      const left = { left: 0, top: 0, width: half, height: page.height };
      inputs.push(...(rtl ? [right, left] : [left, right]));
    } else {
      inputs.push(null);
    }

    for (const crop of inputs) {
      counter += 1;
      const outFile = path.join(outDir, `${String(counter).padStart(4, '0')}.jpg`);
      let img = sharp(page.file, { failOn: 'none' });
      if (crop) img = img.extract(crop);
      img = img.resize({
        width,
        height,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 },
        withoutEnlargement: false,
      });
      if (opts.grayscale) img = img.grayscale();
      await img
        .jpeg({ quality, progressive: false, chromaSubsampling: '4:4:4', mozjpeg: false })
        .toFile(outFile);
      results.push({ from: page.name, to: path.basename(outFile), split: Boolean(crop) });
    }
  }

  return { outDir, count: counter, results, width, height };
}

module.exports = { normalize, PRESETS, loadSharp };
