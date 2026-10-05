// 文字中心のカルーセル(1080x1350 の JPEG)を「夜空 × 金 × 明朝体」デザインで生成する。マイル術・吉方位旅の豆知識など用。
// slides.json の形式は sns-images.js と同じ:
//   { "handle": "@account", "slides": [ { "kicker": "小見出し", "title": "見出し", "lines": ["本文1", "本文2"] }, ... ] }
// 1枚目は表紙として大きく、2枚目以降は本文を左寄せの箇条で見せる。
// 使い方: node scripts/night-slides.js <slides.json> <出力ディレクトリ>
// 出力: slide-01.jpg, slide-02.jpg, ...
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { prepareFonts, page, shoot, DISCLAIMER } = require('./night-reel');

const H = 1350;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 「**強調**」を金色にする
const rich = (s) => esc(s).replace(/\*\*([\s\S]+?)\*\*/g, '<em>$1</em>');

const STYLE = `<style>
.body { margin-top: 44px; width: 100%; text-align: left; }
.body p { font-size: 44px; line-height: 1.65; padding: 14px 0 14px 34px; border-left: 4px solid #E8C872; margin-top: 18px; white-space: pre-line; }
.body p em { font-style: normal; color: #E8C872; }
.pageno { position: absolute; right: 70px; bottom: 60px; font-size: 26px; opacity: 0.6; }
</style>`;

function slideHtml(slide, i, total, handle) {
  const foot = `${handle ? `<div class="handle" style="bottom:80px">${esc(handle)}</div>` : ''}`;
  if (i === 0) {
    const lines = (slide.lines || []).map(rich).join('\n');
    return page(`${STYLE}<div class="wrap">${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
      <h1 style="font-size:92px">${rich(slide.title || '')}</h1>
      ${lines ? `<div class="lead" style="font-size:44px">${lines}</div>` : ''}
      <div class="lead" style="font-size:32px;opacity:0.75;margin-top:50px">保存して見返してね →</div></div>${foot}`, { h: H, ring: 900 });
  }
  const body = (slide.lines || []).map((l) => `<p>${rich(l)}</p>`).join('');
  const last = i === total - 1;
  return page(`${STYLE}<div class="wrap" style="justify-content:flex-start;padding-top:120px">
    ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
    <h1 style="font-size:72px;margin-top:34px">${rich(slide.title || '')}</h1>
    <div class="body">${body}</div></div>${foot}<div class="pageno">${i + 1} / ${total}</div>
    ${last ? `<div class="note" style="bottom:40px">${DISCLAIMER}</div>` : ''}`, { h: H, ring: 0 });
}

async function main() {
  const [jsonPath, outDir] = process.argv.slice(2);
  if (!jsonPath || !outDir) {
    console.error('使い方: node scripts/night-slides.js <slides.json> <出力ディレクトリ>');
    process.exit(1);
  }
  const { handle, slides } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  await prepareFonts();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (let i = 0; i < slides.length; i++) {
    const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.jpg`);
    await shoot(browser, slideHtml(slides[i], i, slides.length, handle), file, H);
    console.log(file);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
