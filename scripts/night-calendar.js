// 本命星ごとの「12か月の吉方位カレンダー」を「夜空 × 金 × 明朝体」デザインで生成する。公式LINE・Kindle読者の登録特典用。
// 各節月の最大吉方(年盤・月盤ともに吉)を一覧にする。方角は自宅から見るため、旅先は載せない。
// 使い方: node scripts/night-calendar.js <開始の基準日 YYYY-MM-DD> <出力ディレクトリ> [@アカウント名]
// (例: 2027年の立春からの1年分 → node scripts/night-calendar.js 2027-02-15 out/calendar-2027 @secondlife_50s)
// 出力: calendar-1.jpg 〜 calendar-9.jpg(数字は本命星)と、9枚を1つにまとめた calendar-all.pdf
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const { prepareFonts, page, shoot, W } = require('./night-reel');

const H = 1350;

const STYLE = `<style>
.cal { position: absolute; inset: 0; padding: 60px 80px; display: flex; flex-direction: column; align-items: center; }
.rows { margin-top: 26px; width: 100%; border: 2px solid rgba(232,200,114,0.7); border-radius: 24px; padding: 6px 32px; background: rgba(11,18,51,0.85); }
.row { display: flex; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(232,200,114,0.25); font-size: 32px; }
.row:last-child { border-bottom: 0; }
.month { width: 430px; text-align: left; font-weight: 700; white-space: nowrap; }
.month small { font-size: 22px; opacity: 0.65; font-weight: 500; margin-left: 14px; }
.dirs { flex: 1; text-align: left; white-space: nowrap; }
.pill { display: inline-block; border: 2px solid #E8C872; color: #E8C872; border-radius: 999px; padding: 0 16px; font-weight: 800; font-size: 28px; margin-right: 8px; }
.off { opacity: 0.55; font-size: 28px; }
.foot { margin-top: 18px; font-size: 22px; line-height: 1.7; opacity: 0.8; text-align: center; }
</style>`;

function html(star, months, handle) {
  const rows = months.map((m) => {
    const right = m.blocked ? '<span class="off">お休み(八方塞がり)</span>'
      : m.best.length ? m.best.map((d) => `<span class="pill">${d}</span>`).join('')
        : '<span class="off">最大吉方なし</span>';
    return `<div class="row"><div class="month">${m.label}<small>${m.period}</small></div><div class="dirs">${right}</div></div>`;
  }).join('');
  return page(`${STYLE}<div class="cal">
  <div class="kicker" style="font-size:30px">${months[0].label} 〜 ${months[months.length - 1].label}</div>
  <h1 style="font-size:58px;margin-top:18px;line-height:1.3"><em>${star.name}</em>さんの\n12か月 吉方位カレンダー</h1>
  <div class="rows">${rows}</div>
  <div class="foot">年盤・月盤ともに吉の「最大吉方」です。方角はご自宅から見て判断します。<br>
  ※九星気学に基づく傾向です。旅先は公式LINEの無料診断で${handle ? ` ${handle}` : ''}</div>
</div>`, { h: H, ring: 0 });
}

async function main() {
  const [dateStr, outDir, handle] = process.argv.slice(2);
  if (!dateStr || !outDir) {
    console.error('使い方: node scripts/night-calendar.js <開始の基準日 YYYY-MM-DD> <出力ディレクトリ> [@アカウント名]');
    process.exit(1);
  }
  const start = houi.getMonthInfo(new Date(`${dateStr}T00:00:00`));
  await prepareFonts();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const files = [];
  for (let id = 1; id <= 9; id++) {
    const months = [];
    for (let i = 0; i < 12; i++) {
      // 各節月の15日は必ず節入り後
      const h = houi.getMonthlyHoui(id, new Date(start.calendarYear, start.setsuMonth - 1 + i, 15));
      months.push({ label: h.label, period: h.period, best: h.bestDirections, blocked: h.yearBlocked || h.monthBlocked });
    }
    const file = path.join(outDir, `calendar-${id}.jpg`);
    await shoot(browser, html(kyusei.getStar(id), months, handle), file, H);
    files.push(path.resolve(file));
    console.log(file);
  }

  // 9枚を1ページずつ並べた PDF(LINEでまとめて送れるように)
  const pdfPage = await browser.newPage();
  const doc = `<!doctype html><html><head><style>@page { size: ${W}px ${H}px; margin: 0 } body { margin: 0 }
    img { display: block; width: ${W}px; height: ${H}px; page-break-after: always }</style></head>
    <body>${files.map((f) => `<img src="file://${f}">`).join('')}</body></html>`;
  const docFile = path.resolve(outDir, 'calendar-all.html');
  fs.writeFileSync(docFile, doc);
  await pdfPage.goto(`file://${docFile}`, { waitUntil: 'load' });
  await pdfPage.pdf({ path: path.join(outDir, 'calendar-all.pdf'), width: `${W}px`, height: `${H}px`, printBackground: true });
  fs.rmSync(docFile);
  await browser.close();
  console.log(path.join(outDir, 'calendar-all.pdf'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
