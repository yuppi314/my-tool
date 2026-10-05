// ストーリーズのハイライト表紙(1080x1920 の JPEG)を「夜空 × 金 × 明朝体」デザインで作る。
// プロフィールでは中央が丸く切り取られるため、記号と文字は中央の円の中に収める。
// 使い方: node scripts/night-highlight.js <出力ディレクトリ> <記号:文字> [<記号:文字> ...]
// 例: node scripts/night-highlight.js out/ "🌙:はじめて" "🧭:今月の吉方位" "✈️:マイル術"
// 出力: highlight-01.jpg, highlight-02.jpg, ...
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { prepareFonts, page, shoot } = require('./night-reel');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function main() {
  const [outDir, ...items] = process.argv.slice(2);
  if (!outDir || !items.length) {
    console.error('使い方: node scripts/night-highlight.js <出力ディレクトリ> <記号:文字> [<記号:文字> ...]');
    process.exit(1);
  }
  await prepareFonts();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (let i = 0; i < items.length; i++) {
    const [icon, label] = items[i].split(':');
    const size = label.length > 5 ? 64 : 84;
    const html = page(`<div class="wrap">
      <div style="font-size:200px;line-height:1">${esc(icon)}</div>
      <div style="font-size:${size}px;font-weight:800;color:#E8C872;margin-top:36px;letter-spacing:0.06em">${esc(label)}</div>
    </div>`, { ring: 760, chara: false });
    const file = path.join(outDir, `highlight-${String(i + 1).padStart(2, '0')}.jpg`);
    await shoot(browser, html, file, 1920);
    console.log(file);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
