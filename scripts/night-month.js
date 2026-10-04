// 1か月分の投稿素材を「夜空 × 金 × 明朝体」デザインでまとめて出力する。
// - 9つの本命星それぞれのリール(MP4)・リール表紙・フィード画像(night-reel.js と同じもの)
// - カルーセルの1枚目にする「9つの星の吉方位まとめ」画像(cover.jpg)
// - Instagram / Threads / LINE にそのまま貼れる文面(captions.md)
// 吉方位はすべて src/lib/houi.js の計算結果から作る(推測で書かないため)。
// 使い方: node scripts/night-month.js <基準日 YYYY-MM-DD(その節月に含まれる日)> <出力ディレクトリ> [@アカウント名]
// (例: NODE_PATH=$(npm root -g) node scripts/night-month.js 2026-11-15 sns-out/night/2026-11 @secondlife_50s)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const { prepareFonts, renderStar, page, shoot, DIRECTION_LUCK, DISCLAIMER } = require('./night-reel');

const HASHTAGS = '#九星気学 #吉方位 #吉方位旅行 #開運 #開運旅 #今月の運勢 #50代の暮らし #50代からの人生';

function summarize(date) {
  return Array.from({ length: 9 }, (_, i) => {
    const id = i + 1;
    const h = houi.getMonthlyHoui(id, date);
    const status = h.yearBlocked || h.monthBlocked ? '八方塞がり' : h.bestDirections.length ? h.bestDirections.join('・') : '最大吉方なし';
    return { id, name: kyusei.getStar(id).name, dirs: h.bestDirections, status };
  });
}

function coverHtml(info, rows, handle) {
  const list = rows
    .map((r) => `<div class="row"><span class="nm">${r.name}</span><span class="${r.dirs.length ? 'gold' : 'rest'}">${r.status}</span><span class="pg">${r.id + 1}枚目</span></div>`)
    .join('');
  const style = `<style>.rows{margin-top:40px;width:100%}.row{display:flex;align-items:center;justify-content:space-between;font-size:44px;
    padding:8px 8px;border-bottom:1px solid rgba(232,200,114,0.3)}.nm{width:300px;text-align:left}.rest{opacity:0.6;font-size:38px}
    .gold{font-weight:800}.pg{font-size:28px;opacity:0.6;width:110px;text-align:right}</style>`;
  return page(`${style}<div class="wrap" style="padding:0 110px"><div class="kicker" style="font-size:34px">九星気学で見る ${info.label}(${info.period})</div>
    <h1 style="font-size:84px;margin-top:30px">あなたの星の<em>吉方位</em></h1>
    <div class="rows">${list}</div>
    <div class="lead" style="font-size:34px;margin-top:24px">自分の星のページを保存してね</div></div>
    ${handle ? `<div class="handle" style="bottom:80px">${handle}</div>` : ''}<div class="note" style="bottom:40px">${DISCLAIMER}</div>`, { h: 1350, ring: 0 });
}

function luckText(dirs) {
  return dirs.map((d) => `${d}…${DIRECTION_LUCK[d].join('・')}`).join('\n');
}

function captions(info, rows) {
  const lucky = rows.filter((r) => r.dirs.length);
  const rest = rows.filter((r) => !r.dirs.length);
  const out = [];
  out.push(`# ${info.label}(${info.period})の投稿文\n`);
  out.push('> 吉方位は src/lib/houi.js の計算結果。投稿前に流派の確認が必要な場合は先にチェックすること。\n');

  out.push('## Instagram カルーセル(cover.jpg → night-post-1〜9.jpg)\n');
  out.push('```');
  out.push(`【保存版】九星気学で見る ${info.label}の吉方位
(${info.period})

${lucky.map((r) => `${r.name}… ${r.status}`).join('\n')}
${rest.map((r) => `${r.name}… ${r.status}`).join('\n')}

あなたの星は何枚目?
自分の星のページを保存して、旅の計画に使ってね🌙

※方位は「ご自宅から見て」決まります。
あなたの家から見た本当の吉方位と旅先は、
プロフィールの公式LINEで無料診断できます。

${HASHTAGS}`);
  out.push('```\n');

  out.push('## Instagram リール(星ごと)\n');
  for (const r of rows) {
    out.push(`### ${r.name}(night-reel-${r.id}.mp4)\n`);
    out.push('```');
    if (r.dirs.length) {
      out.push(`${r.name}さんの${info.label}の吉方位は「${r.status}」🌙
(${info.period})

${luckText(r.dirs)}

年盤・月盤の両方で吉となる「最大吉方」です。
ご自宅から見た方位と旅先は、プロフィールの公式LINEで無料診断できます。

#${r.name} ${HASHTAGS}`);
    } else {
      out.push(`${r.name}さんの${info.label}は「${r.status}」🌙
(${info.period})

遠出よりも、部屋を整えて次の旅を計画する月。
動かないことも開運行動です。

次にいつ吉方位が巡るかは、プロフィールの公式LINEでお知らせしています。

#${r.name} ${HASHTAGS}`);
    }
    out.push('```\n');
  }

  out.push('## Threads\n');
  out.push('```');
  out.push(`${info.period}の九星気学の${info.setsuMonth}月。

${lucky.map((r) => `${r.name}さん → ${r.status}`).join('\n')}

暦の1日ではなく、節入りの日から月が切り替わります。
自分の星の吉方位、知っていましたか?`);
  out.push('```\n');
  if (rest.length) {
    out.push('```');
    out.push(`${rest.map((r) => r.name).join('・')}さん。
${info.label}は吉方位がお休みの月です。

悪い月ではなく「整える月」。
・部屋の片付け
・次の旅の計画とマイルの準備
これだけで十分です。

次にいつ吉方位が巡るかは、LINEでお知らせしています。`);
    out.push('```\n');
  }

  out.push('## LINE 配信(節入り当日)\n');
  out.push('```');
  out.push(`今日から九星気学の${info.setsuMonth}月です🌙
(${info.period})

${rows.map((r) => `・${r.name} … ${r.status}`).join('\n')}

方位はご自宅の場所で旅先が変わります。
ご自宅から見た方位と旅先は、こちらで無料診断👇
(吉方位ツールのURL)`);
  out.push('```\n');
  return out.join('\n');
}

async function main() {
  const [dateStr, outDir, handle] = process.argv.slice(2);
  if (!dateStr || !outDir) {
    console.error('使い方: node scripts/night-month.js <YYYY-MM-DD> <出力ディレクトリ> [@アカウント名]');
    process.exit(1);
  }
  const date = new Date(`${dateStr}T00:00:00`);
  const info = houi.getMonthInfo(date);
  const rows = summarize(date);
  await prepareFonts();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  await shoot(browser, coverHtml(info, rows, handle), path.join(outDir, 'cover.jpg'), 1350);
  for (const r of rows) {
    console.log(await renderStar(browser, date, r.id, outDir, handle));
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'captions.md'), captions(info, rows));
  console.log(path.join(outDir, 'captions.md'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
