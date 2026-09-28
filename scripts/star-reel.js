// 1つの本命星だけを取り上げる短いリール(1080x1920・約14秒・MP4)を生成する。
// フック「〇〇さん、10月はこの方角へ」→ 方位盤 → 旅先のヒント(距離・マイル・見どころ)→ 保存と無料診断への誘導。
// 吉方位がない月は、方位盤 → お休みの月の過ごし方と次の最大吉方、の順にする。背景はシリーズ共通の和紙。
// 使い方: node scripts/star-reel.js <基準日 YYYY-MM-DD> <本命星 1〜9> <出発地ID(例: tokyo)> <出力ディレクトリ>
// 出力: star-reel-<星>.mp4 / star-reel-<星>-cover.jpg
// Playwright はリポジトリの依存に含めていないため、インストール済みのものを使う
// (例: NODE_PATH=$(npm root -g) node scripts/star-reel.js 2026-10-15 5 tokyo out/)。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ffmpegPath = require('ffmpeg-static');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const travel = require('../src/lib/travel');
const content = require('../src/lib/content');
const { washiLayer } = require('./washi-bg');
const { wheelSvg } = require('./sns-reel');

const W = 1080;
const H = 1920;
const HOOK_SEC = 2.5;
const MAIN_SEC = 3.5;
const DETAIL_SEC = 5;
const END_SEC = 3;

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FBF3E6; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
.center { position: absolute; inset: 0; padding: 140px 90px; display: flex; flex-direction: column; justify-content: center; }
.kicker { align-self: flex-start; background: #1E5AA8; color: #fff; font-size: 40px; font-weight: 700; padding: 10px 28px; border-radius: 999px; }
h1 { font-size: 112px; font-weight: 900; line-height: 1.3; margin-top: 36px; white-space: pre-line; }
h1 em, .dirs em { font-style: normal; color: #FF6B3D; }
.lead { font-size: 52px; line-height: 1.6; margin-top: 44px; white-space: pre-line; }
.small { font-size: 38px; color: #6B7A90; margin-top: 36px; }
.star { font-size: 96px; font-weight: 900; color: #FF6B3D; text-align: center; }
.dirs { font-size: 76px; font-weight: 900; text-align: center; margin-top: 16px; }
.places { font-size: 46px; text-align: center; margin-top: 24px; line-height: 1.6; white-space: pre-line; }
.wheel { display: block; margin: 36px auto 0; }
.title { font-size: 72px; font-weight: 900; line-height: 1.3; white-space: pre-line; }
.title em { font-style: normal; color: #FF6B3D; }
.cards { margin-top: 44px; display: flex; flex-direction: column; gap: 28px; }
.card { background: #fff; border-radius: 28px; padding: 30px 36px; box-shadow: 0 8px 24px rgba(27,42,65,0.10); }
.card .name { font-size: 54px; font-weight: 900; display: flex; align-items: center; gap: 18px; }
.card .pill { background: #FF6B3D; color: #fff; border-radius: 999px; padding: 2px 22px; font-size: 34px; }
.card .meta { font-size: 34px; color: #1E5AA8; font-weight: 700; margin-top: 10px; }
.card .hint { font-size: 36px; line-height: 1.5; margin-top: 10px; }
.tips { margin-top: 44px; font-size: 50px; line-height: 1.8; }
.next { margin-top: 48px; font-size: 48px; font-weight: 800; line-height: 1.5; white-space: pre-line; }
.next em { font-style: normal; color: #FF6B3D; }
.handle { position: absolute; left: 0; right: 0; bottom: 180px; text-align: center; font-size: 32px; color: #6B7A90; }
`;

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${washiLayer(W, H, 'reel')}${body}</body></html>`;
}

function hookHtml(info, star, blocked) {
  const line = blocked ? `${info.setsuMonth}月は\n<em>お休みの月</em>` : `${info.setsuMonth}月は\n<em>この方角</em>へ🧭`;
  return page(`<div class="center">
  <div class="kicker">${info.label}(${info.period})</div>
  <h1><em>${star.name}</em>さん\n${line}</h1>
  <div class="lead">自分の星なら\n保存してね📌</div>
</div>`);
}

function mainHtml(info, star, h, origin, dests, next) {
  if (!h.bestDirections.length) {
    const reason = h.yearBlocked || h.monthBlocked ? '八方塞がり' : '最大吉方なし';
    return page(`<div class="center" style="padding-top:220px;justify-content:flex-start">
  <div class="star">${star.name}</div>
  ${wheelSvg([], 680)}
  <div class="dirs">今月は${reason}</div>
  <div class="places">遠出は控えめにして\n次の旅の計画と\nマイルを貯める月に✈️</div>
</div>`);
  }
  const domestic = dests.filter((d) => d.region === 'domestic').slice(0, 3).map((d) => d.name);
  const overseas = dests.find((d) => d.region === 'overseas');
  const lines = [];
  if (domestic.length) lines.push(`${origin.name}からなら\n${domestic.join('・')}`);
  if (overseas) lines.push(`海外なら${overseas.name}`);
  return page(`<div class="center" style="padding-top:220px;justify-content:flex-start">
  <div class="star">${star.name}</div>
  ${wheelSvg(h.bestDirections, 680)}
  <div class="dirs"><em>${h.bestDirections.join('・')}</em></div>
  <div class="places">${lines.join('\n') || '100km以上の登録旅先なし'}</div>
</div>`);
}

// 旅先のヒント: 国内2件+海外1件を、方位・距離・マイルの目安・見どころつきで
function detailHtml(origin, dests) {
  const picks = [...dests.filter((d) => d.region === 'domestic').slice(0, 2), ...dests.filter((d) => d.region === 'overseas').slice(0, 1)];
  const cards = picks.map((d) => `<div class="card">
    <div class="name">${d.name}<span class="pill">${d.direction}</span></div>
    <div class="meta">約${d.distanceKm.toLocaleString()}km・${d.miles}</div>
    <div class="hint">${d.hint}</div>
  </div>`).join('');
  return page(`<div class="center">
  <div class="title">${origin.name}から行くなら\n<em>こんな旅先</em>も✈️</div>
  <div class="cards">${cards}</div>
</div>`);
}

// 吉方位がない月: 過ごし方と、次に最大吉方がめぐってくる月
function restHtml(next) {
  return page(`<div class="center">
  <div class="title">お休みの月の\n<em>おすすめの過ごし方</em></div>
  <div class="tips">・近場の日帰りでリフレッシュ☕<br>・マイルを貯めて次の旅の準備✈️<br>・次の吉方位の旅をゆっくり計画📅</div>
  ${next ? `<div class="next">次の最大吉方は\n<em>${next.label}の「${next.bestDirections.join('・')}」</em></div>` : ''}
</div>`);
}

function endHtml() {
  return page(`<div class="center">
  <h1 style="font-size:92px">保存して\n<em>旅の計画</em>に✈️</h1>
  <div class="lead">自宅から見た方角は\nプロフィールのリンクの\n無料診断でチェックしてね🧭</div>
  <div class="small">年盤・月盤ともに吉の「最大吉方」/ 自宅から100km以上</div>
</div><div class="handle">@secondlife_50s</div>`);
}

async function main() {
  const [dateStr, starArg, originId, outDir] = process.argv.slice(2);
  const starId = Number(starArg);
  const origin = originId && travel.getOrigin(originId);
  if (!dateStr || !(starId >= 1 && starId <= 9) || !origin || !outDir) {
    console.error('使い方: node scripts/star-reel.js <YYYY-MM-DD> <本命星 1〜9> <出発地ID> <出力ディレクトリ>');
    process.exit(1);
  }
  const date = new Date(`${dateStr}T00:00:00`);
  const info = houi.getMonthInfo(date);
  const star = kyusei.getStar(starId);
  const h = houi.getMonthlyHoui(starId, date);
  const dests = travel.recommend(origin, h.bestDirections, 2);
  const next = h.bestDirections.length ? null : content.buildFreeResult(content.profileFromStar(starId), origin, date).nextBestMonth;
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'star-reel-'));

  const scenes = [
    { html: hookHtml(info, star, !h.bestDirections.length), sec: HOOK_SEC },
    { html: mainHtml(info, star, h, origin, dests, next), sec: MAIN_SEC },
    h.bestDirections.length && dests.length ? { html: detailHtml(origin, dests), sec: DETAIL_SEC } : { html: restHtml(next), sec: DETAIL_SEC },
    { html: endHtml(), sec: END_SEC },
  ];
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  const frames = [];
  for (let i = 0; i < scenes.length; i++) {
    await tab.setContent(scenes[i].html);
    const file = path.join(work, `scene-${i}.png`);
    await tab.screenshot({ path: file });
    frames.push(file);
  }
  const cover = path.join(outDir, `star-reel-${starId}-cover.jpg`);
  await tab.setContent(scenes[0].html);
  await tab.screenshot({ path: cover, type: 'jpeg', quality: 90 });
  await browser.close();

  const list = scenes.map((s, i) => `file '${frames[i]}'\nduration ${s.sec}`).join('\n') + `\nfile '${frames[frames.length - 1]}'\n`;
  const listFile = path.join(work, 'scenes.txt');
  fs.writeFileSync(listFile, list);
  const out = path.join(outDir, `star-reel-${starId}.mp4`);
  execFileSync(ffmpegPath, [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', listFile,
    // Instagram は音声トラック付きの動画を想定しているため、無音のトラックを付ける
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', `fps=30,scale=${W}:${H},format=yuv420p`,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
    '-c:a', 'aac', '-b:a', '128k', '-shortest',
    '-movflags', '+faststart',
    out,
  ]);
  fs.rmSync(work, { recursive: true, force: true });
  console.log([out, cover].join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
