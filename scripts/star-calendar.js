// 本命星ごとの「12か月の吉方位カレンダー」画像(1080x1350 の JPEG)を9枚生成する。公式LINEの登録特典用。
// 各節月の最大吉方(年盤・月盤ともに吉)を一覧にする。方角は自宅から見るため、旅先は載せない。背景はシリーズ共通の和紙。
// 使い方: node scripts/star-calendar.js <開始の基準日 YYYY-MM-DD> <出力ディレクトリ>
// 出力: calendar-1.jpg 〜 calendar-9.jpg(数字は本命星)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const { washiLayer } = require('./washi-bg');

const W = 1080;
const H = 1350;

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FBF3E6; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
.wrap { position: absolute; inset: 0; padding: 48px 72px; display: flex; flex-direction: column; }
.kicker { align-self: flex-start; background: #1E5AA8; color: #fff; font-size: 30px; font-weight: 700; padding: 8px 24px; border-radius: 999px; }
h1 { font-size: 56px; font-weight: 900; line-height: 1.22; margin-top: 14px; }
h1 em { font-style: normal; color: #FF6B3D; }
.rows { margin-top: 22px; background: #fff; border-radius: 28px; padding: 6px 32px; box-shadow: 0 8px 24px rgba(27,42,65,0.10); }
.row { display: flex; align-items: center; gap: 20px; padding: 7px 0; border-bottom: 1px solid #EFE6D8; font-size: 31px; line-height: 1.15; }
.row:last-child { border-bottom: 0; }
.month { width: 280px; font-weight: 800; }
.month small { display: block; font-size: 20px; color: #6B7A90; font-weight: 500; }
.pill { background: #FF6B3D; color: #fff; border-radius: 999px; padding: 3px 20px; font-weight: 800; font-size: 29px; margin-right: 10px; }
.off { color: #8A97A8; font-size: 28px; }
.note { margin-top: 16px; font-size: 22px; color: #6B7A90; line-height: 1.6; }
`;

function html(star, months) {
  const rows = months.map((m) => {
    const right = m.blocked ? '<span class="off">お休み（八方塞がり）</span>'
      : m.best.length ? m.best.map((d) => `<span class="pill">${d}</span>`).join('')
        : '<span class="off">最大吉方なし</span>';
    return `<div class="row"><div class="month">${m.label}<small>${m.period}</small></div><div>${right}</div></div>`;
  }).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${washiLayer(W, H, 'rest')}
<div class="wrap">
  <div class="kicker">${months[0].label}〜${months[months.length - 1].label}</div>
  <h1><em>${star.name}</em>さんの<br>12か月吉方位カレンダー</h1>
  <div class="rows">${rows}</div>
  <div class="note">年盤・月盤ともに吉の「最大吉方」です。方角はご自宅から見て判断します。<br>あなたの家からの方角と旅先は、プロフィールの無料診断でチェックしてね🧭 @secondlife_50s</div>
</div></body></html>`;
}

async function main() {
  const [dateStr, outDir] = process.argv.slice(2);
  if (!dateStr || !outDir) {
    console.error('使い方: node scripts/star-calendar.js <開始の基準日 YYYY-MM-DD> <出力ディレクトリ>');
    process.exit(1);
  }
  const start = houi.getMonthInfo(new Date(`${dateStr}T00:00:00`));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  for (let id = 1; id <= 9; id++) {
    const months = [];
    for (let i = 0; i < 12; i++) {
      // 各節月の15日は必ず節入り後
      const h = houi.getMonthlyHoui(id, new Date(start.calendarYear, start.setsuMonth - 1 + i, 15));
      months.push({ label: h.label, period: h.period, best: h.bestDirections, blocked: h.yearBlocked || h.monthBlocked });
    }
    await tab.setContent(html(kyusei.getStar(id), months));
    const file = path.join(outDir, `calendar-${id}.jpg`);
    await tab.screenshot({ path: file, type: 'jpeg', quality: 92 });
    console.log(file);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
