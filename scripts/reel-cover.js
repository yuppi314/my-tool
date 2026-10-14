// リールの表紙(カバー画像 1080x1920 の JPEG)を作る。背景はシリーズ共通の和紙。
// プロフィールの一覧では縦3:4に切り取られて表示されるため、文字と絵は中央(y 300〜1620)に収める。
// 使い方: node scripts/reel-cover.js <出力.jpg> <小見出し> <タイトル(\n で改行、**強調** はオレンジ)> [絵の画像]
// 例: node scripts/reel-cover.js out/cover.jpg "2026年10月" "七赤金星さん\n10月の\n**吉方位**🧭"
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { washiLayer } = require('./washi-bg');

const W = 1080;
const H = 1920;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\\n/g, '\n').replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');

function html(kicker, title, imgUrl) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FBF3E6; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
.box { position: absolute; left: 70px; right: 70px; top: 300px; bottom: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.kicker { background: #1E5AA8; color: #fff; font-size: 44px; font-weight: 700; padding: 10px 34px; border-radius: 999px; }
h1 { font-size: ${imgUrl ? 96 : 128}px; font-weight: 900; line-height: 1.28; margin-top: 36px; white-space: pre-line; }
h1 em { font-style: normal; color: #FF6B3D; }
.panel { margin-top: 44px; width: 760px; height: 760px; border-radius: 28px; overflow: hidden; border: 10px solid #fff; box-shadow: 0 12px 32px rgba(27,42,65,0.18); }
.panel img { width: 100%; height: 100%; object-fit: cover; display: block; }
.handle { margin-top: 40px; font-size: 34px; color: #6B7A90; }
</style></head><body>${washiLayer(W, H, 'reel')}
<div class="box">
  <div class="kicker">${esc(kicker)}</div>
  <h1>${rich(title)}</h1>
  ${imgUrl ? `<div class="panel"><img src="${imgUrl}"></div>` : ''}
  <div class="handle">@secondlife_50s</div>
</div></body></html>`;
}

async function main() {
  const [out, kicker, title, image] = process.argv.slice(2);
  if (!out || !kicker || !title) {
    console.error('使い方: node scripts/reel-cover.js <出力.jpg> <小見出し> <タイトル> [絵の画像]');
    process.exit(1);
  }
  let imgUrl = '';
  if (image) {
    const ext = path.extname(image).slice(1).toLowerCase().replace('jpg', 'jpeg');
    imgUrl = `data:image/${ext};base64,${fs.readFileSync(image).toString('base64')}`;
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  await tab.setContent(html(kicker, title, imgUrl));
  await tab.screenshot({ path: out, type: 'jpeg', quality: 92 });
  await browser.close();
  console.log(out);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
