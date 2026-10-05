// リールの表紙(1080x1920 の JPEG)を「夜空 × 金 × 明朝体」デザインで作る。漫画リールなど、night-reel.js 以外のリール用。
// 引数は reel-cover.js と同じ。プロフィールの一覧では縦3:4に切り取られるため、文字と絵は中央に収める。
// 使い方: node scripts/night-cover.js <出力.jpg> <小見出し> <タイトル(\n で改行、**強調** は金色)> [絵の画像] [@アカウント名]
// 例: node scripts/night-cover.js out/cover.jpg "2026年10月の吉方位" "**七赤金星**さん\n10月は\n北西へ"
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { prepareFonts, page, shoot } = require('./night-reel');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\\n/g, '\n').replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');

async function main() {
  const [out, kicker, title, img, handle] = process.argv.slice(2);
  if (!out || !kicker || !title) {
    console.error('使い方: node scripts/night-cover.js <出力.jpg> <小見出し> <タイトル> [絵の画像] [@アカウント名]');
    process.exit(1);
  }
  await prepareFonts();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const pic = img
    ? `<div style="margin-top:44px;width:640px;height:640px;border-radius:50%;overflow:hidden;border:6px solid #E8C872;box-shadow:0 0 50px rgba(232,200,114,0.4)">
        <img src="file://${path.resolve(img)}" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
    : '';
  const html = page(`<div class="wrap"><div class="kicker">${esc(kicker)}</div>
    <h1 style="font-size:${img ? 88 : 108}px">${rich(title)}</h1>${pic}</div>
    ${handle ? `<div class="handle">${esc(handle)}</div>` : ''}`, { ring: img ? 0 : 900 });
  const browser = await chromium.launch();
  await shoot(browser, html, out, 1920);
  await browser.close();
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
