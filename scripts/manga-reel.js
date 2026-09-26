// 4コマ漫画の絵(文字なし)から、セリフ入りの縦長リール(1080x1920・MP4)を作る。
// 絵は ChatGPT などで吹き出し・文字なしで作り、セリフはここで読みやすい字で重ねる(AI 画像の日本語崩れ対策)。
// 背景はシリーズ共通の和紙(scripts/washi-bg.js)。1コマの中でセリフを1つずつ出して、テンポよく見せる。
// 使い方: node scripts/manga-reel.js <シナリオ.json> <出力ディレクトリ>
// シナリオ JSON(画像パスは JSON からの相対パス):
// {
//   "hook": "50代の旅先、\n“方角”で選んでる？",
//   "cuts": [
//     { "image": "1.png", "telop": "いつも同じ旅先…", "lines": [{ "who": "ハル", "text": "旅行先がいつも同じで…", "pos": "top-left" }] }
//   ],
//   "end": { "title": "あなたの家から見た\n吉方位は", "em": "無料診断", "sub": "で" , "note": "プロフィールのリンクから🧭" }
// }
// pos は top-left / top-right / bottom-left / bottom-right(コマの角に吹き出しを置く)。sec を省くと文字数から自動で決める。
// 出力: manga-reel.mp4 / manga-reel-cover.jpg
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ffmpegPath = require('ffmpeg-static');
const { washiLayer } = require('./washi-bg');

const W = 1080;
const H = 1920;
const PANEL = 960;
const PANEL_TOP = 470;
const HOOK_SEC = 1.8;
const END_SEC = 3;

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FBF3E6; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
.telop { position: absolute; left: 60px; right: 60px; top: 190px; height: 240px; display: flex; align-items: center; justify-content: center;
  text-align: center; font-size: 76px; font-weight: 900; line-height: 1.3; white-space: pre-line; }
.telop em, h1 em { font-style: normal; color: #FF6B3D; }
.panel { position: absolute; left: ${(W - PANEL) / 2}px; top: ${PANEL_TOP}px; width: ${PANEL}px; height: ${PANEL}px; border-radius: 28px; overflow: hidden;
  background: #fff; border: 10px solid #fff; box-shadow: 0 12px 32px rgba(27,42,65,0.18); }
.panel img { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; display: block; }
.bubble { position: absolute; width: max-content; max-width: 760px; background: #fff; border: 5px solid #1B2A41; border-radius: 44px; padding: 26px 38px;
  font-size: 50px; font-weight: 800; line-height: 1.45; white-space: pre-line; box-shadow: 0 6px 0 rgba(27,42,65,0.15); }
.bubble .who { display: inline-block; font-size: 30px; font-weight: 800; color: #fff; background: #1E5AA8; border-radius: 999px; padding: 2px 18px; margin-bottom: 8px; }
.bubble.michi .who { background: #FF6B3D; }
.bubble::after { content: ""; position: absolute; width: 36px; height: 36px; background: #fff; border: 5px solid #1B2A41; border-top: 0; border-left: 0; }
.top-left, .top-right { top: ${PANEL_TOP - 60}px; }
.bottom-left, .bottom-right { top: auto; bottom: ${H - PANEL_TOP - PANEL - 60}px; }
.top-left, .bottom-left { left: 40px; }
.top-right, .bottom-right { right: 40px; }
.top-left::after, .top-right::after { bottom: -21px; transform: rotate(45deg); }
.bottom-left::after, .bottom-right::after { top: -21px; transform: rotate(-135deg); }
.top-left::after, .bottom-left::after { left: 90px; }
.top-right::after, .bottom-right::after { right: 90px; }
.count { position: absolute; left: 0; right: 0; bottom: 250px; text-align: center; font-size: 34px; font-weight: 700; color: #6B7A90; }
.handle { position: absolute; left: 0; right: 0; bottom: 180px; text-align: center; font-size: 32px; color: #6B7A90; }
.center { position: absolute; inset: 0; padding: 140px 90px; display: flex; flex-direction: column; justify-content: center; }
h1 { font-size: 104px; font-weight: 900; line-height: 1.3; white-space: pre-line; }
.lead { font-size: 52px; line-height: 1.6; margin-top: 48px; white-space: pre-line; }
.hook-panel { position: absolute; right: -60px; bottom: 160px; width: 560px; height: 560px; border-radius: 28px; overflow: hidden; opacity: 0.9;
  border: 10px solid #fff; box-shadow: 0 12px 32px rgba(27,42,65,0.18); transform: rotate(-4deg); }
.hook-panel img { width: 100%; height: 100%; object-fit: cover; }
`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 「**強調**」だけオレンジにする
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${washiLayer(W, H, 'reel')}${body}</body></html>`;
}

function cutHtml(cut, imgUrl, shown, index, total, handle) {
  const bubbles = cut.lines.slice(0, shown).map((l) => {
    const who = l.who === 'ミチ先生' || l.who === 'ミチ' ? 'michi' : '';
    return `<div class="bubble ${who} ${l.pos || 'top-left'}"><div class="who">${esc(l.who)}</div><br>${rich(l.text)}</div>`;
  }).join('');
  return page(`
<div class="telop">${rich(cut.telop || '')}</div>
<div class="panel"><img src="${imgUrl}"></div>
${bubbles}
<div class="count">${index + 1} / ${total}</div>
<div class="handle">${esc(handle)}</div>`);
}

function hookHtml(hook, imgUrl) {
  return page(`<div class="center" style="justify-content:flex-start;padding-top:360px"><h1>${rich(hook)}</h1></div>
<div class="hook-panel"><img src="${imgUrl}"></div>`);
}

function endHtml(end, handle) {
  return page(`<div class="center">
  <h1 style="font-size:92px">${rich(end.title)}<em>${esc(end.em || '')}</em>${esc(end.sub || '')}</h1>
  <div class="lead">${rich(end.note || '')}</div>
  <div class="lead" style="font-size:38px;color:#6B7A90;margin-top:36px">${esc(handle)}</div>
</div>`);
}

// セリフの表示秒数: 読む速さ(1秒に約8文字)+ 間。短すぎ・長すぎを避ける
const readSec = (text) => Math.min(4, Math.max(1.6, text.replace(/\s/g, '').length / 8 + 0.6));

async function main() {
  const [jsonPath, outDir] = process.argv.slice(2);
  if (!jsonPath || !outDir) {
    console.error('使い方: node scripts/manga-reel.js <シナリオ.json> <出力ディレクトリ>');
    process.exit(1);
  }
  const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const handle = spec.handle || '@secondlife_50s';
  const base = path.dirname(path.resolve(jsonPath));
  const imgUrl = (p) => {
    const file = path.resolve(base, p);
    if (!fs.existsSync(file)) throw new Error(`画像が見つかりません: ${file}`);
    const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
    return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
  };
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'manga-reel-'));

  const scenes = [];
  if (spec.hook) scenes.push({ html: hookHtml(spec.hook, imgUrl(spec.cuts[0].image)), sec: HOOK_SEC });
  spec.cuts.forEach((cut, i) => {
    const url = imgUrl(cut.image);
    const lines = cut.lines || [];
    // 絵だけ → セリフを1つずつ追加。sec 指定があれば全体をその長さに合わせる
    const steps = [{ shown: 0, sec: 0.6 }, ...lines.map((l, n) => ({ shown: n + 1, sec: readSec(l.text) }))];
    const total = steps.reduce((a, s) => a + s.sec, 0);
    const k = cut.sec ? cut.sec / total : 1;
    steps.forEach((s) => scenes.push({ html: cutHtml({ ...cut, lines }, url, s.shown, i, spec.cuts.length, handle), sec: s.sec * k }));
  });
  if (spec.end) scenes.push({ html: endHtml(spec.end, handle), sec: END_SEC });

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
  await tab.screenshot({ path: path.join(outDir, 'manga-reel-cover.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();

  const list = scenes.map((s, i) => `file '${frames[i]}'\nduration ${s.sec.toFixed(2)}`).join('\n') + `\nfile '${frames[frames.length - 1]}'\n`;
  const listFile = path.join(work, 'scenes.txt');
  fs.writeFileSync(listFile, list);
  const out = path.join(outDir, 'manga-reel.mp4');
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
  const sec = scenes.reduce((a, s) => a + s.sec, 0);
  console.log([out, path.join(outDir, 'manga-reel-cover.jpg'), `長さ: 約${sec.toFixed(1)}秒`].join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
