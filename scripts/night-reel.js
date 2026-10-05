// 「夜空 × 金 × 明朝体」デザインの星別リール(1080x1920・約18秒・MP4)と、フィード用画像(1080x1350)を生成する。
// 紺の星空の背景に金の輪と明朝体の文字で、占いアカウントらしい上品な見た目にする(和紙ベージュのシリーズとは別デザイン)。
// 構成: フック → 星の性質 → 今月の最大吉方 → 方位ごとの運気 → 吉方位旅のポイント → 保存とLINEへの誘導。
// 出発地は指定しない(方位は見る人の自宅で決まるため、具体的な旅先はLINEの無料診断で案内する)。
// 使い方: node scripts/night-reel.js <基準日 YYYY-MM-DD> <本命星 1〜9> <出力ディレクトリ> [@アカウント名]
// 出力: night-reel-<星>.mp4 / night-reel-<星>-cover.jpg / night-post-<星>.jpg
// Playwright はリポジトリの依存に含めていないため、インストール済みのものを使う
// (例: NODE_PATH=$(npm root -g) node scripts/night-reel.js 2026-10-15 8 out/ @secondlife_50s)。
// 明朝体は初回だけ Google Fonts から Shippori Mincho B1 を ~/.cache/night-reel-fonts に保存する(ネットワーク接続が必要)。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');

const W = 1080;
const H = 1920;
const FADE = 0.4;
const GOLD = '#E8C872';

const FONT_DIR = path.join(os.homedir(), '.cache', 'night-reel-fonts');
const FONT_WEIGHTS = [500, 800];
let FONT = '';

// Google Fonts をブラウザ経由で読むと文字ごとに分割され、漢字だけゴシックで描かれることがある。
// ブラウザ以外の User-Agent で取得すると完全な TTF が返るので、それを一度だけ保存して file:// で使う。
async function prepareFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  const faces = [];
  for (const w of FONT_WEIGHTS) {
    const file = path.join(FONT_DIR, `ShipporiMinchoB1-${w}.ttf`);
    if (!fs.existsSync(file)) {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@${w}`, { headers: { 'User-Agent': 'curl' } })).text();
      const url = css.match(/url\((https:[^)]+\.ttf)\)/)[1];
      fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    }
    faces.push(`@font-face { font-family: "Shippori Mincho B1"; font-weight: ${w}; src: url("file://${file}"); }`);
  }
  FONT = `<style>${faces.join('\n')}</style>`;
}

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: var(--h); overflow: hidden; position: relative; color: #FFF8E7;
  font-family: "Shippori Mincho B1", serif;
  background: radial-gradient(ellipse at 50% 30%, #2B3A7A 0%, #172256 45%, #0B1233 100%); }
.stars { position: absolute; inset: 0; }
.ring { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%);
  border: 3px solid ${GOLD}; box-shadow: 0 0 40px rgba(232,200,114,0.35), inset 0 0 40px rgba(232,200,114,0.2); }
.ring.inner { border-width: 1px; opacity: 0.6; }
.wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 0 110px; }
.kicker { font-size: 38px; letter-spacing: 0.12em; color: ${GOLD}; border-top: 2px solid ${GOLD}; border-bottom: 2px solid ${GOLD}; padding: 10px 34px; }
h1 { font-size: 108px; font-weight: 800; line-height: 1.35; margin-top: 44px; white-space: pre-line; letter-spacing: 0.04em; }
h1 em, .gold { font-style: normal; color: ${GOLD}; }
.lead { font-size: 50px; line-height: 1.75; margin-top: 44px; white-space: pre-line; font-weight: 500; }
.chips { margin-top: 40px; }
.chip { display: inline-block; border: 2px solid ${GOLD}; color: ${GOLD}; border-radius: 999px; padding: 8px 34px; font-size: 46px; margin: 10px 8px; }
.dir { font-size: 190px; font-weight: 800; color: ${GOLD}; line-height: 1.2; margin-top: 20px; text-shadow: 0 0 36px rgba(232,200,114,0.5); }
.card { margin-top: 48px; width: 100%; border: 2px solid rgba(232,200,114,0.7); border-radius: 28px; padding: 54px 48px;
  background: rgba(11,18,51,0.55); }
.card .name { font-size: 96px; font-weight: 800; }
.card .meta { font-size: 42px; color: ${GOLD}; margin-top: 18px; }
.card .hint { font-size: 46px; line-height: 1.7; margin-top: 26px; }
.list { margin-top: 48px; font-size: 52px; line-height: 2.1; text-align: left; }
.handle { position: absolute; left: 0; right: 0; bottom: 150px; text-align: center; font-size: 34px; color: rgba(255,248,231,0.7); letter-spacing: 0.08em; }
.note { position: absolute; left: 0; right: 0; bottom: 96px; text-align: center; font-size: 26px; color: rgba(255,248,231,0.5); }
`;

// 乱数の種を固定して、毎回同じ星空になるようにする
function starField(w, h, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const dots = [];
  for (let i = 0; i < 160; i++) {
    const r = rand() < 0.88 ? 1 + rand() * 1.6 : 2.5 + rand() * 2;
    dots.push(`<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="#FFF3D1" opacity="${(0.35 + rand() * 0.6).toFixed(2)}"/>`);
  }
  // きらめき(十字の光)をいくつか
  for (let i = 0; i < 9; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const k = 14 + rand() * 18;
    dots.push(`<path d="M${x} ${y - k} Q${x} ${y} ${x + k} ${y} Q${x} ${y} ${x} ${y + k} Q${x} ${y} ${x - k} ${y} Q${x} ${y} ${x} ${y - k}Z" fill="${GOLD}" opacity="0.9"/>`);
  }
  return `<svg class="stars" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${dots.join('')}</svg>`;
}

// 環境変数 NIGHT_CHARA にキャラクターの画像を指定すると、右下に入れる(chara: false のページには入れない)。
// 既定は丸枠なしで、絵の縁を夜空になじむようにぼかして置く(背景つきの絵でも浮かない。透明PNGならそのまま見える)。
// NIGHT_CHARA_STYLE=circle にすると、金の縁の丸の中に切り抜いて入れる。
// アカウント名と注意書きはキャラクターに重ならないよう左に寄せる。
function charaHtml(h) {
  const img = process.env.NIGHT_CHARA;
  if (!img) return '';
  const tall = h >= 1900;
  const src = `file://${path.resolve(img)}`;
  if (process.env.NIGHT_CHARA_STYLE === 'circle') {
    const size = tall ? 300 : 230;
    const bottom = tall ? 130 : 30;
    return `<style>.note { text-align: left; padding: 0 ${size + 50}px 0 60px; font-size: 21px; }
  .handle { text-align: left; padding-left: 60px; }</style>
<div style="position:absolute;right:36px;bottom:${bottom}px;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
  border:5px solid #E8C872;box-shadow:0 0 30px rgba(232,200,114,0.45);background:#172256">
  <img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block"></div>`;
  }
  const width = tall ? 400 : 300;
  const bottom = tall ? 90 : 0;
  const fade = 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)';
  return `<style>.note { text-align: left; padding: 0 ${width - 60}px 0 60px; font-size: 21px; white-space: nowrap; }
  .handle { text-align: left; padding-left: 60px; }</style>
<img src="${src}" style="position:absolute;right:10px;bottom:${bottom}px;width:${width}px;height:auto;display:block;
  -webkit-mask-image:${fade};mask-image:${fade}">`;
}

function page(body, { h = H, ring = 900, chara = true } = {}) {
  const rings = ring ? `<div class="ring" style="width:${ring}px;height:${ring}px"></div><div class="ring inner" style="width:${ring - 50}px;height:${ring - 50}px"></div>` : '';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">${FONT}<style>:root{--h:${h}px}${CSS}</style></head>
<body>${starField(W, h)}${rings}${body}${chara ? charaHtml(h) : ''}</body></html>`;
}

// 方位ごとに得られるとされる運気(後天定位盤でその方位に定位する星の象意から)
const DIRECTION_LUCK = {
  北: ['信頼', '愛情', '子宝'],
  北東: ['変化', '貯蓄', '相続'],
  東: ['発展', '行動力', '若さ'],
  南東: ['良縁', '信用', '人間関係'],
  南: ['名誉', '美', 'ひらめき'],
  南西: ['家庭運', '安定', '勤勉'],
  西: ['金運', '恋愛', '楽しみ'],
  北西: ['仕事運', '引き立て', '出世'],
};

const DISCLAIMER = '※九星気学に基づく傾向です。方位はご自宅の場所で変わります';

function scenes(info, star, h, handle) {
  const foot = handle ? `<div class="handle">${handle}</div>` : '';
  const blocked = !h.bestDirections.length;
  const list = [
    page(`<div class="wrap"><div class="kicker">九星気学で見る ${info.label}</div>
      <h1 style="font-size:92px"><em>${star.name}</em>さん\n${blocked ? '今月は\n整える月' : '今月の吉方位は'}</h1>
      <div class="lead">${info.period}</div></div>${foot}`),
    page(`<div class="wrap"><div class="kicker">${star.element}の星</div>
      <h1 style="font-size:92px"><em>${star.name}</em>は</h1>
      <div class="chips">${star.keyword.split('・').map((k) => `<span class="chip">${k}</span>`).join('')}</div>
      <div class="lead">そんなあなたに\n今月、味方する方角は…</div></div>${foot}`),
  ];
  if (blocked) {
    const reason = h.yearBlocked || h.monthBlocked ? '八方塞がり' : '最大吉方なし';
    list.push(page(`<div class="wrap"><div class="kicker">${info.label}</div>
      <div class="dir" style="font-size:130px">${reason}</div>
      <div class="lead" style="font-size:44px">遠出よりも\n<span class="gold">部屋を整え、次の旅を計画する</span>月。\n動かないことも開運行動です</div></div>${foot}`));
  } else {
    list.push(page(`<div class="wrap"><div class="kicker">今月の最大吉方</div>
      <div class="dir">${h.bestDirections.join('・')}</div>
      <div class="lead">年盤・月盤の両方で吉となる\n力の強い方角です</div></div>${foot}`, { ring: 760 }));
    h.bestDirections.forEach((dir) => {
      list.push(page(`<div class="wrap"><div class="kicker">${dir}の吉方位でいただける運気</div>
        <div class="dir" style="font-size:150px">${dir}</div>
        <div class="chips">${DIRECTION_LUCK[dir].map((k) => `<span class="chip">${k}</span>`).join('')}</div></div>${foot}`, { ring: 0 }));
    });
    list.push(page(`<div class="wrap"><div class="kicker">吉方位旅の心得</div>
      <div class="list">🌙 ${info.period}に出発<br>🌙 自宅から100km以上が目安<br>🌙 温泉と土地の食で気をいただく</div></div>${foot}`, { ring: 0 }));
  }
  list.push(page(`<div class="wrap"><div class="kicker">保存して見返してね</div>
    <h1 style="font-size:84px">あなたの家から見た\n<em>本当の吉方位</em>は</h1>
    <div class="lead">プロフィールのリンクの\n<span class="gold">無料診断</span>でチェックしてね</div></div>${foot}<div class="note">${DISCLAIMER}</div>`));
  return list;
}

function postHtml(info, star, h, handle) {
  const PH = 1350;
  const blocked = !h.bestDirections.length;
  const body = blocked
    ? `<div class="dir" style="font-size:110px">${h.yearBlocked || h.monthBlocked ? '八方塞がり' : '最大吉方なし'}</div>
       <div class="lead" style="font-size:44px">整える月。次の吉方位旅を計画しましょう</div>`
    : `<div class="dir" style="font-size:150px">${h.bestDirections.join('・')}</div>
       <div class="lead" style="font-size:40px;margin-top:20px;line-height:1.6">${h.bestDirections.map((d) => `${d}…<span class="gold">${DIRECTION_LUCK[d].join('・')}</span>`).join('<br>')}</div>`;
  return page(`<div class="wrap" style="padding:0 90px"><div class="kicker" style="font-size:34px">九星気学で見る ${info.label}の吉方位</div>
    <h1 style="font-size:96px;margin-top:36px"><em>${star.name}</em>さん</h1>${body}
    <div class="lead" style="font-size:34px;margin-top:40px;opacity:0.8">${info.period}</div></div>
    ${handle ? `<div class="handle" style="bottom:90px">${handle}</div>` : ''}<div class="note" style="bottom:46px">${DISCLAIMER}</div>`, { h: PH, ring: 900 });
}

// file:// のフォントを読めるよう、HTML もファイルに書き出してから開く
async function shoot(browser, html, file, height) {
  const p = await browser.newPage({ viewport: { width: W, height } });
  const htmlFile = `${file}.html`;
  fs.writeFileSync(htmlFile, html);
  await p.goto(`file://${path.resolve(htmlFile)}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file, type: 'jpeg', quality: 92 });
  await p.close();
  fs.rmSync(htmlFile);
}

// 1つの本命星のリール・表紙・フィード画像を出力する(ブラウザは呼び出し側で起動して使い回す)
async function renderStar(browser, date, id, outDir, handle) {
  const star = kyusei.getStar(id);
  const info = houi.getMonthInfo(date);
  const h = houi.getMonthlyHoui(id, date);
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'night-reel-'));
  const list = scenes(info, star, h, handle);
  const frames = [];
  for (let i = 0; i < list.length; i++) {
    const f = path.join(tmp, `s${i}.jpg`);
    await shoot(browser, list[i], f, H);
    frames.push(f);
  }
  await shoot(browser, postHtml(info, star, h, handle), path.join(outDir, `night-post-${id}.jpg`), 1350);
  fs.copyFileSync(frames[0], path.join(outDir, `night-reel-${id}-cover.jpg`));

  // 各画面を少しずつズームさせ(星空がゆっくり近づく動き)、クロスフェードでつなぐ
  const durs = frames.map((_, i) => (i === 0 || i === frames.length - 1 ? 3.2 : 2.6));
  const args = ['-y'];
  frames.forEach((f) => args.push('-i', f)); // 1枚の静止画から zoompan が d フレームを作る
  const parts = frames.map((_, i) => {
    const n = Math.round(durs[i] * 30);
    return `[${i}:v]scale=1296:2304,zoompan=z='1+0.04*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${W}x${H}:fps=30,format=yuv420p[v${i}]`;
  });
  let last = 'v0';
  let offset = 0;
  for (let i = 1; i < frames.length; i++) {
    offset += durs[i - 1] - FADE;
    const out = i === frames.length - 1 ? 'vout' : `x${i}`;
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[${out}]`);
    last = out;
  }
  const mp4 = path.join(outDir, `night-reel-${id}.mp4`);
  args.push('-filter_complex', parts.join(';'), '-map', '[vout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', mp4);
  execFileSync('ffmpeg', args, { stdio: 'ignore' });
  fs.rmSync(tmp, { recursive: true, force: true });
  return mp4;
}

async function main() {
  const [dateStr, starArg, outDir, handle] = process.argv.slice(2);
  if (!dateStr || !starArg || !outDir) {
    console.error('使い方: node scripts/night-reel.js <YYYY-MM-DD> <本命星1〜9> <出力ディレクトリ> [@アカウント名]');
    process.exit(1);
  }
  await prepareFonts();
  const browser = await chromium.launch();
  console.log(await renderStar(browser, new Date(`${dateStr}T00:00:00`), Number(starArg), outDir, handle));
  await browser.close();
}

module.exports = { prepareFonts, renderStar, page, shoot, W, DIRECTION_LUCK, DISCLAIMER };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
