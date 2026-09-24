// Instagram カルーセル用の画像(1080x1350 の JPEG)をスライド定義から生成する。
// 使い方: node scripts/sns-images.js <slides.json> <出力ディレクトリ>
// slides.json の形式:
//   { "handle": "@account", "slides": [ { "kicker": "小見出し", "title": "見出し", "lines": ["本文1", "本文2"] }, ... ] }
// Playwright はリポジトリの依存に含めていないため、実行環境にインストール済みのものを使う
// (例: NODE_PATH=$(npm root -g) node scripts/sns-images.js ...)。
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WIDTH = 1080;
const HEIGHT = 1350; // Instagram フィードの縦長比率 4:5

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function slideHtml(slide, index, total, handle) {
  const isCover = index === 0;
  const lines = (slide.lines || []).map((l) => `<p>${escapeHtml(l)}</p>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body {
      width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; position: relative;
      font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif;
      background: radial-gradient(ellipse at top, #2a1d5c, #120b26 72%);
      color: #f5f0ff; padding: 88px; display: flex; flex-direction: column;
    }
    .frame { position: absolute; inset: 36px; border: 2px solid rgba(242, 193, 78, 0.45); border-radius: 28px; }
    .compass { position: absolute; right: -120px; bottom: -120px; width: 620px; height: 620px; opacity: 0.08; }
    main { flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative; }
    .kicker { color: #f2c14e; font-size: 40px; font-weight: 700; letter-spacing: 4px; }
    h1 { font-size: ${isCover ? 104 : 76}px; line-height: 1.3; margin-top: 28px; color: #ffe9b3; white-space: pre-line; }
    .body { margin-top: 64px; display: flex; flex-direction: column; gap: 32px; }
    .body p { font-size: ${isCover ? 46 : 44}px; line-height: 1.55; border-left: 8px solid #f2c14e; padding-left: 28px; white-space: pre-line; }
    footer { display: flex; justify-content: space-between; font-size: 32px; color: #c9c0e8; position: relative; }
  </style></head><body>
    <div class="frame"></div>
    <svg class="compass" viewBox="-100 -100 200 200" fill="#f2c14e">
      <polygon points="0,-100 14,-14 100,0 14,14 0,100 -14,14 -100,0 -14,-14" />
      <polygon points="0,-60 8,-8 60,0 8,8 0,60 -8,8 -60,0 -8,-8" transform="rotate(45)" />
    </svg>
    <main>
      <div class="kicker">${escapeHtml(slide.kicker || '')}</div>
      <h1>${escapeHtml(slide.title || '')}</h1>
      <div class="body">${lines}</div>
    </main>
    <footer><span>${escapeHtml(handle || '')}</span><span>${index + 1} / ${total}</span></footer>
  </body></html>`;
}

async function main() {
  const [input, outDir] = process.argv.slice(2);
  if (!input || !outDir) {
    console.error('使い方: node scripts/sns-images.js <slides.json> <出力ディレクトリ>');
    process.exit(1);
  }
  const spec = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(spec.slides) || spec.slides.length < 1 || spec.slides.length > 10) {
    throw new Error('slides は1〜10枚で指定してください(Instagram カルーセルの上限は10枚)。');
  }
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const files = [];
  for (let i = 0; i < spec.slides.length; i++) {
    await page.setContent(slideHtml(spec.slides[i], i, spec.slides.length, spec.handle));
    const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    files.push(file);
  }
  await browser.close();
  console.log(files.join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
