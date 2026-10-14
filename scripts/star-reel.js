// 1つの本命星だけを取り上げるリール(1080x1920・約20秒・MP4)を生成する。画面どうしはクロスフェードでつなぐ。
// 吉方位がある月: フック → 星の特徴 → 方位盤 → 旅先を1か所ずつ(最大3か所) → 旅のポイント → 保存と無料診断への誘導。
// 吉方位がない月: フック → 星の特徴 → 方位盤 → お休みの月の過ごし方 → 次の最大吉方 → 誘導。背景はシリーズ共通の和紙。
// 使い方: node scripts/star-reel.js <基準日 YYYY-MM-DD> <本命星 1〜9> <出発地ID(例: tokyo)> <出力ディレクトリ> [最初の絵] [最後の絵]
// 絵(ミチ先生とハルさんのイラストなど)を渡すと、フックと締めの画面に入れて見た目を華やかにする。
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
const FADE = 0.35;

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FBF3E6; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
.center { position: absolute; inset: 0; padding: 140px 90px; display: flex; flex-direction: column; justify-content: center; }
.mid { align-items: center; text-align: center; }
.kicker { align-self: flex-start; background: #1E5AA8; color: #fff; font-size: 40px; font-weight: 700; padding: 10px 28px; border-radius: 999px; }
.mid .kicker { align-self: center; }
h1 { font-size: 112px; font-weight: 900; line-height: 1.3; margin-top: 36px; white-space: pre-line; }
h1 em, .dirs em, .title em, .big em { font-style: normal; color: #FF6B3D; }
.lead { font-size: 52px; line-height: 1.6; margin-top: 44px; white-space: pre-line; }
.small { font-size: 38px; color: #6B7A90; margin-top: 36px; }
.star { font-size: 96px; font-weight: 900; color: #FF6B3D; text-align: center; }
.dirs { font-size: 76px; font-weight: 900; text-align: center; margin-top: 16px; }
.places { font-size: 46px; text-align: center; margin-top: 24px; line-height: 1.6; white-space: pre-line; }
.wheel { display: block; margin: 36px auto 0; }
.title { font-size: 76px; font-weight: 900; line-height: 1.3; white-space: pre-line; }
.big { font-size: 64px; font-weight: 800; line-height: 1.5; margin-top: 40px; white-space: pre-line; }
.chip { display: inline-block; background: #fff; border: 4px solid #FF6B3D; color: #FF6B3D; border-radius: 999px; padding: 10px 34px; font-size: 48px; font-weight: 800; margin: 12px 8px 0; }
.dest { background: #fff; border-radius: 36px; padding: 56px 52px; box-shadow: 0 12px 32px rgba(27,42,65,0.12); margin-top: 48px; }
.dest .num { font-size: 40px; color: #6B7A90; font-weight: 700; }
.dest .name { font-size: 96px; font-weight: 900; margin-top: 12px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.dest .pill { background: #FF6B3D; color: #fff; border-radius: 999px; padding: 4px 30px; font-size: 48px; }
.dest .meta { font-size: 44px; color: #1E5AA8; font-weight: 700; margin-top: 28px; line-height: 1.5; }
.dest .hint { font-size: 50px; line-height: 1.6; margin-top: 28px; }
.list { margin-top: 44px; font-size: 52px; line-height: 1.9; }
.pic { margin-top: 48px; width: 820px; height: 820px; border-radius: 28px; overflow: hidden; border: 10px solid #fff; box-shadow: 0 12px 32px rgba(27,42,65,0.18); align-self: center; }
.pic img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pic.sm { width: 640px; height: 640px; margin-top: 36px; }
.handle { position: absolute; left: 0; right: 0; bottom: 180px; text-align: center; font-size: 32px; color: #6B7A90; }
`;

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${washiLayer(W, H, 'reel')}${body}</body></html>`;
}

function hookHtml(info, star, blocked, img) {
  const line = blocked ? `${info.setsuMonth}月は\n<em>お休みの月</em>` : `${info.setsuMonth}月は\n<em>この方角</em>へ🧭`;
  if (img) {
    return page(`<div class="center" style="padding-top:150px;justify-content:flex-start">
  <div class="kicker">${info.label}(${info.period})</div>
  <h1 style="font-size:96px;margin-top:24px"><em>${star.name}</em>さん\n${line}</h1>
  <div class="pic"><img src="${img}"></div>
</div>`);
  }
  return page(`<div class="center">
  <div class="kicker">${info.label}(${info.period})</div>
  <h1><em>${star.name}</em>さん\n${line}</h1>
  <div class="lead">自分の星なら\n保存してね📌</div>
</div>`);
}

// 星の特徴(データにあるキーワードだけを使う)
function starHtml(star) {
  const chips = star.keyword.split('・').map((k) => `<span class="chip">${k}</span>`).join('');
  return page(`<div class="center mid">
  <div class="kicker">${star.element}の星</div>
  <div class="title" style="margin-top:36px"><em>${star.name}</em>さんは</div>
  <div style="margin-top:28px">${chips}</div>
  <div class="big">そんなあなたの\n今月の吉方位は…？</div>
</div>`);
}

function wheelHtml(star, h) {
  if (!h.bestDirections.length) {
    const reason = h.yearBlocked || h.monthBlocked ? '八方塞がり' : '最大吉方なし';
    return page(`<div class="center" style="padding-top:240px;justify-content:flex-start">
  <div class="star">${star.name}</div>
  ${wheelSvg([], 720)}
  <div class="dirs">今月は${reason}</div>
</div>`);
  }
  return page(`<div class="center" style="padding-top:240px;justify-content:flex-start">
  <div class="star">${star.name}</div>
  ${wheelSvg(h.bestDirections, 720)}
  <div class="dirs"><em>${h.bestDirections.join('・')}</em></div>
  <div class="places">年盤・月盤の両方で吉の「最大吉方」</div>
</div>`);
}

// 旅先を1か所ずつ大きく: 方位・距離・マイルの目安・見どころ
function destHtml(origin, d, i, n) {
  const where = d.region === 'overseas' ? '海外なら' : `${origin.name}から行くなら`;
  return page(`<div class="center">
  <div class="title">${where}</div>
  <div class="dest">
    <div class="num">旅先 ${i + 1} / ${n}</div>
    <div class="name">${d.name}<span class="pill">${d.direction}</span></div>
    <div class="meta">約${d.distanceKm.toLocaleString()}km\n${d.miles}</div>
    <div class="hint">${d.hint}</div>
  </div>
</div>`);
}

function pointsHtml(info) {
  return page(`<div class="center">
  <div class="title">吉方位旅の<em>ポイント</em>✈️</div>
  <div class="list">📅 ${info.period}の間に出発<br>📍 自宅から100km以上が目安<br>🧭 方角は自宅の場所で変わります</div>
</div>`);
}

function restHtml() {
  return page(`<div class="center">
  <div class="title">お休みの月の\n<em>おすすめの過ごし方</em></div>
  <div class="list">☕ 近場の日帰りでリフレッシュ<br>✈️ マイルを貯めて次の旅の準備<br>📅 次の吉方位の旅をゆっくり計画</div>
</div>`);
}

function nextHtml(next) {
  const body = next
    ? `<div class="big" style="font-size:72px">次の最大吉方は\n<em>${next.label}の「${next.bestDirections.join('・')}」</em></div><div class="lead">今から計画しておくと\n旅がもっと楽しみに✨</div>`
    : '<div class="big">次の吉方位の月まで\nゆっくり準備を✨</div>';
  return page(`<div class="center mid">${body}</div>`);
}

function endHtml(img) {
  if (img) {
    return page(`<div class="center" style="padding-top:170px;justify-content:flex-start">
  <h1 style="font-size:84px;margin-top:0">保存して<em>旅の計画</em>に✈️</h1>
  <div class="lead" style="margin-top:24px;font-size:46px">自宅から見た方角は\nプロフィールのリンクの\n無料診断でチェックしてね🧭</div>
  <div class="pic sm"><img src="${img}"></div>
</div><div class="handle">@secondlife_50s</div>`);
  }
  return page(`<div class="center">
  <h1 style="font-size:92px">保存して\n<em>旅の計画</em>に✈️</h1>
  <div class="lead">自宅から見た方角は\nプロフィールのリンクの\n無料診断でチェックしてね🧭</div>
  <div class="small">年盤・月盤ともに吉の「最大吉方」/ 自宅から100km以上</div>
</div><div class="handle">@secondlife_50s</div>`);
}

function buildScenes(info, star, h, origin, dests, next, imgs) {
  const scenes = [
    { html: hookHtml(info, star, !h.bestDirections.length, imgs[0]), sec: 2.5 },
    { html: starHtml(star), sec: 2.5 },
    { html: wheelHtml(star, h), sec: 3 },
  ];
  const picks = [...dests.filter((d) => d.region === 'domestic').slice(0, 2), ...dests.filter((d) => d.region === 'overseas').slice(0, 1)];
  if (h.bestDirections.length && picks.length) {
    picks.forEach((d, i) => scenes.push({ html: destHtml(origin, d, i, picks.length), sec: 3 }));
    scenes.push({ html: pointsHtml(info), sec: 2.5 });
  } else {
    scenes.push({ html: restHtml(), sec: 3 }, { html: nextHtml(next), sec: 3 });
  }
  scenes.push({ html: endHtml(imgs[1]), sec: 3 });
  return scenes;
}

// 静止画をクロスフェードでつないで MP4 にする(無音の音声トラック付き)
function encode(frames, scenes, out) {
  const args = ['-y', '-loglevel', 'error'];
  frames.forEach((f, i) => args.push('-loop', '1', '-t', String(scenes[i].sec + (i < frames.length - 1 ? FADE : 0)), '-i', f));
  args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  const filters = frames.map((_, i) => `[${i}:v]fps=30,scale=${W}:${H},format=yuv420p,setsar=1[v${i}]`);
  let last = 'v0';
  let offset = 0;
  for (let i = 1; i < frames.length; i++) {
    offset += scenes[i - 1].sec;
    const label = i === frames.length - 1 ? 'vout' : `x${i}`;
    filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[${label}]`);
    last = label;
  }
  args.push('-filter_complex', filters.join(';'), '-map', `[${last}]`, '-map', `${frames.length}:a`,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out);
  execFileSync(ffmpegPath, args);
}

async function main() {
  const [dateStr, starArg, originId, outDir, hookImg, endImg] = process.argv.slice(2);
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

  const dataUrl = (p) => {
    if (!p) return '';
    const ext = path.extname(p).slice(1).toLowerCase().replace('jpg', 'jpeg');
    return `data:image/${ext};base64,${fs.readFileSync(p).toString('base64')}`;
  };
  const scenes = buildScenes(info, star, h, origin, dests, next, [dataUrl(hookImg), dataUrl(endImg)]);
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

  const out = path.join(outDir, `star-reel-${starId}.mp4`);
  encode(frames, scenes, out);
  fs.rmSync(work, { recursive: true, force: true });
  const sec = scenes.reduce((a, s) => a + s.sec, 0);
  console.log([out, cover, `長さ: 約${sec.toFixed(1)}秒`].join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
