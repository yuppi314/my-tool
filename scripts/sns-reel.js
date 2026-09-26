// Instagram リール用の縦長動画(1080x1920・約24秒・MP4)を生成する。
// 「自分の星で止めてね」形式: フック → 9つの本命星を1つ2秒ずつ(最大吉方を方位盤で表示) → 締め。
// 使い方: node scripts/sns-reel.js <基準日 YYYY-MM-DD> <出発地ID(例: tokyo)> <出力ディレクトリ> [背景: washi|plain|sunrise|sky|wave]
// 出力: reel.mp4(本編) / reel-cover.jpg(リールの表紙画像)
// Playwright はリポジトリの依存に含めていないため、インストール済みのものを使う
// (例: NODE_PATH=$(npm root -g) node scripts/sns-reel.js 2026-10-15 tokyo out/)。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ffmpegPath = require('ffmpeg-static');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const travel = require('../src/lib/travel');
const { washiLayer } = require('./washi-bg');

const W = 1080;
const H = 1920;
const HOOK_SEC = 2.5;
const STAR_SEC = 2;
const END_SEC = 3;

// 方位盤の区分(真北0度・時計回り)。東西南北は各30度、四隅は各60度
const RANGES = { 北: [345, 375], 北東: [15, 75], 東: [75, 105], 南東: [105, 165], 南: [165, 195], 南西: [195, 255], 西: [255, 285], 北西: [285, 345] };

// 背景のテーマ。第4引数で選ぶ(省略時は washi = カルーセルと共通の和紙)
const SEIGAIHA = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60"><g fill="none" stroke="#F4C9A8" stroke-width="3"><circle cx="0" cy="60" r="56"/><circle cx="0" cy="60" r="40"/><circle cx="0" cy="60" r="24"/><circle cx="120" cy="60" r="56"/><circle cx="120" cy="60" r="40"/><circle cx="120" cy="60" r="24"/><circle cx="60" cy="30" r="56"/><circle cx="60" cy="30" r="40"/><circle cx="60" cy="30" r="24"/></g></svg>');
const BACKGROUNDS = {
  washi: '#FBF3E6',
  plain: '#FFF8EE',
  sunrise: 'linear-gradient(180deg, #FFD9B8 0%, #FFD3DC 50%, #FFF6EE 100%)',
  sky: 'linear-gradient(180deg, #A9DBFF 0%, #DDF1FF 45%, #FFF8EE 100%)',
  wave: `#FFF8EE url("data:image/svg+xml,${SEIGAIHA}") repeat`,
};
let background = BACKGROUNDS.plain;

// 青空テーマだけ、雲と飛行機の飾りを重ねる(文字の読みやすさを優先し、上端と下端に寄せる)
const SKY_DECO = `<svg class="deco" width="${1080}" height="${1920}" viewBox="0 0 1080 1920">
  <g fill="#FFFFFF" opacity="0.9">
    <ellipse cx="170" cy="120" rx="130" ry="44"/><ellipse cx="250" cy="96" rx="90" ry="52"/><ellipse cx="110" cy="100" rx="70" ry="40"/>
    <ellipse cx="880" cy="210" rx="150" ry="46"/><ellipse cx="960" cy="186" rx="96" ry="54"/><ellipse cx="800" cy="192" rx="70" ry="40"/>
    <ellipse cx="930" cy="1800" rx="170" ry="50"/><ellipse cx="1010" cy="1772" rx="100" ry="56"/>
    <ellipse cx="120" cy="1850" rx="150" ry="44"/><ellipse cx="200" cy="1826" rx="90" ry="50"/>
  </g>
  <g transform="translate(610 110) rotate(-18)" fill="#1E5AA8" opacity="0.85">
    <path d="M0 18 L120 12 L150 0 L162 4 L150 18 L162 32 L150 36 L120 24 L0 18 Z"/>
    <path d="M70 15 L40 -30 L56 -30 L100 14 Z"/><path d="M70 21 L40 66 L56 66 L100 22 Z"/>
    <path d="M10 17 L-6 -4 L4 -4 L26 16 Z"/><path d="M10 19 L-6 40 L4 40 L26 20 Z"/>
  </g>
  <path d="M340 150 C 420 120, 500 130, 590 150" stroke="#FFFFFF" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round" fill="none" opacity="0.9"/>
</svg>`;
let decoration = '';

const css = () => `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${background}; color: #1B2A41;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif;
  display: flex; flex-direction: column; justify-content: center; padding: 140px 90px; }
.kicker { align-self: flex-start; background: #1E5AA8; color: #fff; font-size: 40px; font-weight: 700; padding: 10px 28px; border-radius: 999px; }
h1 { font-size: 118px; font-weight: 900; line-height: 1.25; margin-top: 36px; white-space: pre-line; }
h1 em { font-style: normal; color: #FF6B3D; }
.lead { font-size: 52px; line-height: 1.6; margin-top: 48px; white-space: pre-line; }
.small { font-size: 38px; color: #6B7A90; margin-top: 36px; }
.star { font-size: 104px; font-weight: 900; color: #FF6B3D; text-align: center; }
.dirs { font-size: 84px; font-weight: 900; text-align: center; margin-top: 24px; }
.places { font-size: 48px; text-align: center; margin-top: 28px; line-height: 1.5; white-space: pre-line; }
.wheel { display: block; margin: 40px auto 0; }
.rest { color: #6B7A90; }
.deco { position: absolute; top: 0; left: 0; pointer-events: none; }
body > *:not(.deco) { position: relative; }
`;

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css()}</style></head><body>${decoration}${body}</body></html>`;
}

// 北を上にした方位盤。吉方位の扇形をオレンジで塗る
function wheelSvg(bestDirections, size = 760) {
  const c = size / 2;
  const r = c - 70;
  const pt = (deg, rad) => [c + rad * Math.sin((deg * Math.PI) / 180), c - rad * Math.cos((deg * Math.PI) / 180)];
  const sectors = Object.entries(RANGES).map(([dir, [a0, a1]]) => {
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    const good = bestDirections.includes(dir);
    const [lx, ly] = pt((a0 + a1) / 2, r * 0.68);
    return `<path d="M${c},${c}L${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}Z" fill="${good ? '#FF6B3D' : '#FFFFFF'}" stroke="#EADBC8" stroke-width="4"/>
      <text x="${lx}" y="${ly + 16}" font-size="${good ? 52 : 40}" font-weight="${good ? 900 : 500}" fill="${good ? '#FFFFFF' : '#9AA7B8'}" text-anchor="middle">${dir}</text>`;
  }).join('');
  return `<svg class="wheel" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${sectors}
    <circle cx="${c}" cy="${c}" r="70" fill="#1E5AA8"/>
    <text x="${c}" y="${c + 16}" font-size="44" font-weight="800" fill="#fff" text-anchor="middle">自宅</text>
    <text x="${c}" y="52" font-size="40" font-weight="800" fill="#1E5AA8" text-anchor="middle">N</text>
  </svg>`;
}

function hookHtml(info, origin) {
  return page(`
  <div class="kicker">${info.label}(${info.period})</div>
  <h1>50代、\n${info.setsuMonth}月に行くなら\n<em>この方角</em></h1>
  <div class="lead">自分の星で\n止めてね✋</div>
  <div class="small">${origin.name}から出かける場合の例</div>`);
}

function starHtml(star, h, dests) {
  if (h.yearBlocked || h.monthBlocked || !h.bestDirections.length) {
    const reason = h.yearBlocked || h.monthBlocked ? '八方塞がり' : '最大吉方なし';
    return page(`
    <div class="star rest">${star.name}</div>
    ${wheelSvg([])}
    <div class="dirs rest">今月は${reason}</div>
    <div class="places rest">無理せず、次の吉方位に向けて\nマイルを貯める月に</div>`);
  }
  const names = dests.filter((d) => d.region === 'domestic').slice(0, 3).map((d) => d.name);
  const overseas = dests.filter((d) => d.region === 'overseas').slice(0, 1).map((d) => `${d.name}(海外)`);
  return page(`
  <div class="star">${star.name}</div>
  ${wheelSvg(h.bestDirections)}
  <div class="dirs">${h.bestDirections.join('・')}</div>
  <div class="places">${[...names, ...overseas].join('・') || '100km以上の登録旅先なし'}</div>`);
}

function endHtml() {
  return page(`
  <h1 style="font-size:92px">あなたの家から見た\n吉方位は<em>無料診断</em>で</h1>
  <div class="lead">プロフィールのリンクから🧭\n保存して旅の計画に✈️</div>
  <div class="small">年盤・月盤ともに吉の「最大吉方」/ 自宅から100km以上</div>`);
}

async function main() {
  const [dateStr, originId, outDir, bgName = 'washi'] = process.argv.slice(2);
  if (!BACKGROUNDS[bgName]) {
    console.error(`背景は ${Object.keys(BACKGROUNDS).join(' / ')} から選んでください。`);
    process.exit(1);
  }
  background = BACKGROUNDS[bgName];
  decoration = { sky: SKY_DECO, washi: washiLayer(W, H, 'reel') }[bgName] || '';
  const origin = originId && travel.getOrigin(originId);
  if (!dateStr || !origin || !outDir) {
    console.error('使い方: node scripts/sns-reel.js <YYYY-MM-DD> <出発地ID> <出力ディレクトリ>');
    process.exit(1);
  }
  const date = new Date(`${dateStr}T00:00:00`);
  const info = houi.getMonthInfo(date);
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));

  const scenes = [{ html: hookHtml(info, origin), sec: HOOK_SEC }];
  for (let id = 1; id <= 9; id++) {
    const h = houi.getMonthlyHoui(id, date);
    scenes.push({ html: starHtml(kyusei.getStar(id), h, travel.recommend(origin, h.bestDirections, 2)), sec: STAR_SEC });
  }
  scenes.push({ html: endHtml(), sec: END_SEC });

  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  const frames = [];
  for (let i = 0; i < scenes.length; i++) {
    await tab.setContent(scenes[i].html);
    const file = path.join(work, `scene-${String(i).padStart(2, '0')}.png`);
    await tab.screenshot({ path: file });
    frames.push(file);
  }
  await tab.setContent(scenes[0].html);
  await tab.screenshot({ path: path.join(outDir, 'reel-cover.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();

  // ffmpeg の concat 形式: 各シーンの表示秒数を指定し、最後のフレームは duration が効くよう再掲する
  const list = scenes.map((s, i) => `file '${frames[i]}'\nduration ${s.sec}`).join('\n') + `\nfile '${frames[frames.length - 1]}'\n`;
  const listFile = path.join(work, 'scenes.txt');
  fs.writeFileSync(listFile, list);

  const out = path.join(outDir, 'reel.mp4');
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
  console.log([out, path.join(outDir, 'reel-cover.jpg')].join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
