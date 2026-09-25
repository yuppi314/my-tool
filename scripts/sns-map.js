// Instagram 用「方位マップ」画像(1080x1350 の JPEG)を生成する。
// 出発地から見た今月の最大吉方を日本地図上に塗り、方位にある旅先を番号で示す。
// 使い方: node scripts/sns-map.js <基準日 YYYY-MM-DD> <出発地ID(例: tokyo)> <出力ディレクトリ>
// 出力: cover.jpg(表紙) / star-N.jpg(最大吉方がある本命星ごと) / rest.jpg(吉方位がない星のまとめ)
// Playwright はリポジトリの依存に含めていないため、インストール済みのものを使う
// (例: NODE_PATH=$(npm root -g) node scripts/sns-map.js 2026-10-15 tokyo out/)。
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { feature } = require('topojson-client');
const topo = require('world-atlas/countries-10m.json');
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const travel = require('../src/lib/travel');
const { DESTINATIONS } = require('../src/data/places');

const W = 1080;
const H = 1350;
const MAP_TOP = 330;
const MAP_H = 740;
const JAPAN = feature(topo, topo.objects.countries).features.find((f) => f.id === '392');

// 方位の範囲(真北0度・時計回り)。東西南北は各30度、四隅は各60度
const RANGES = { 北: [345, 375], 北東: [15, 75], 東: [75, 105], 南東: [105, 165], 南: [165, 195], 南西: [195, 255], 西: [255, 285], 北西: [285, 345] };

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FFF8EE; color: #1B2A41; position: relative;
  font-family: "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
header { position: absolute; top: 0; left: 0; right: 0; padding: 56px 64px 0; }
.kicker { display: inline-block; background: #1E5AA8; color: #fff; font-size: 30px; font-weight: 700; padding: 8px 22px; border-radius: 999px; }
h1 { font-size: 64px; font-weight: 900; margin-top: 18px; line-height: 1.25; }
h1 em { font-style: normal; color: #FF6B3D; }
svg.map { position: absolute; top: 0; left: 0; }
.panel { position: absolute; left: 48px; right: 48px; bottom: 48px; background: #fff; border-radius: 28px; padding: 28px 36px; box-shadow: 0 8px 24px rgba(27,42,65,0.12); }
.row { font-size: 34px; font-weight: 700; margin: 6px 0; display: flex; align-items: center; gap: 16px; }
.row span:last-child { line-height: 1.5; }
.pill { background: #FF6B3D; color: #fff; border-radius: 999px; padding: 2px 20px; font-size: 30px; white-space: nowrap; }
.num { display: inline-flex; width: 40px; height: 40px; border-radius: 50%; background: #1E5AA8; color: #fff; font-size: 24px; align-items: center; justify-content: center; margin-right: 8px; }
small { font-size: 24px; color: #6B7A90; }
.note { font-size: 24px; color: #6B7A90; margin-top: 10px; }
.center { position: absolute; inset: 0; padding: 96px 80px; display: flex; flex-direction: column; justify-content: center; }
.center h1 { font-size: 88px; }
.center p { font-size: 40px; line-height: 1.6; margin-top: 36px; }
.list { margin-top: 40px; display: flex; flex-direction: column; gap: 18px; }
.list .row { font-size: 38px; }
`;

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;
}

function destPoint(name) {
  return DESTINATIONS.find((d) => d.name === name);
}

// 出発地と国内の旅先が収まるように自動でズームする投影(正距円筒 + 緯度補正)
function makeProjection(points) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const [latMin, latMax, lonMin, lonMax] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180);
  const span = Math.max(6, (latMax - latMin) * 1.5, ((lonMax - lonMin) * kx * 1.5 * MAP_H) / W);
  const scale = MAP_H / span;
  const cLat = (latMin + latMax) / 2;
  const cLon = (lonMin + lonMax) / 2;
  return (lon, lat) => [W / 2 + (lon - cLon) * kx * scale, MAP_TOP + MAP_H / 2 - (lat - cLat) * scale];
}

function landPath(proj) {
  return JAPAN.geometry.coordinates
    .map((poly) => poly.map((ring) => ring.map(([lon, lat], i) => {
      const [x, y] = proj(lon, lat);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('') + 'Z').join(''))
    .join('');
}

function wedgePath(ox, oy, dir) {
  const [a0, a1] = RANGES[dir];
  const R = 2000;
  const pt = (a) => [ox + R * Math.sin((a * Math.PI) / 180), oy - R * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  return `M${ox},${oy}L${x0},${y0}A${R},${R} 0 0 1 ${x1},${y1}Z`;
}

function starMapHtml(h, star, origin, dests) {
  const domestic = dests.filter((d) => d.region === 'domestic');
  const proj = makeProjection([origin, ...domestic.map((d) => destPoint(d.name))]);
  const [ox, oy] = proj(origin.lon, origin.lat);
  const marks = domestic.map((d) => { const p = destPoint(d.name); return proj(p.lon, p.lat); });

  const wedges = h.bestDirections.map((d) => wedgePath(ox, oy, d));
  const dirLabels = h.bestDirections.map((dir) => {
    const [a0, a1] = RANGES[dir];
    const a = (((a0 + a1) / 2) * Math.PI) / 180;
    // 旅先マーカーと重ならない位置まで外側へずらす
    let r = 230;
    let x;
    let y;
    do {
      x = Math.max(90, Math.min(W - 90, ox + r * Math.sin(a)));
      y = Math.max(MAP_TOP + 50, Math.min(MAP_TOP + MAP_H - 40, oy - r * Math.cos(a)));
      r += 30;
    } while (r < 900 && marks.some(([mx, my]) => Math.abs(mx - x) < 110 && Math.abs(my - y) < 70));
    return `<rect x="${x - 70}" y="${y - 36}" width="140" height="64" rx="32" fill="#FF6B3D"/>
      <text x="${x}" y="${y + 12}" font-size="36" font-weight="800" fill="#fff" text-anchor="middle">${dir}</text>`;
  }).join('');
  const destMarks = marks.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="24" fill="#1E5AA8" stroke="#fff" stroke-width="5"/>
    <text x="${x}" y="${y + 10}" font-size="28" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text>`).join('');

  const rows = h.bestDirections.map((dir) => {
    const names = dests.filter((d) => d.direction === dir).map((d) => {
      const n = domestic.indexOf(d);
      return n >= 0 ? `<b class="num">${n + 1}</b>${d.name}` : `${d.name}<small>(海外)</small>`;
    }).join('　');
    return `<div class="row"><span class="pill">${dir}</span><span>${names || '100km以上の登録旅先なし'}</span></div>`;
  }).join('');

  return page(`
<svg class="map" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="m"><rect x="0" y="${MAP_TOP - 20}" width="${W}" height="${MAP_H + 40}"/></clipPath></defs>
  <rect x="0" y="${MAP_TOP - 20}" width="${W}" height="${MAP_H + 40}" fill="#DDEFFB"/>
  <g clip-path="url(#m)">
    ${wedges.map((d) => `<path d="${d}" fill="#FF8A5B" fill-opacity="0.22" stroke="#FF8A5B" stroke-width="3" stroke-dasharray="10 8"/>`).join('')}
    <path d="${landPath(proj)}" fill="#FFFFFF" stroke="#9CC3E6" stroke-width="2"/>
    ${wedges.map((d) => `<path d="${d}" fill="#FF8A5B" fill-opacity="0.18"/>`).join('')}
    ${destMarks}
    <circle cx="${ox}" cy="${oy}" r="18" fill="#FF6B3D" stroke="#fff" stroke-width="5"/>
    <text x="${ox}" y="${oy - 30}" text-anchor="middle" font-size="30" font-weight="800" fill="#FF6B3D" paint-order="stroke" stroke="#fff" stroke-width="8">${origin.name}(自宅)</text>
    ${dirLabels}
  </g>
</svg>
<header>
  <div class="kicker">${h.label}(${h.period})の最大吉方</div>
  <h1><em>${star.name}</em>さん<br>${origin.name}から行くなら</h1>
</header>
<div class="panel">${rows}<div class="note">年盤・月盤ともに吉の方位 / 自宅から100km以上 / マイルで行ける旅先</div></div>`);
}

function coverHtml(info, origin, bestStars) {
  return page(`
<div class="center">
  <div><span class="kicker">${info.label}(${info.period})</span></div>
  <h1>${origin.name}から行く<br><em style="font-style:normal;color:#FF6B3D">今月の吉方位旅</em></h1>
  <p>9つの本命星ごとに、年盤・月盤の両方で吉となる「最大吉方」と、マイルで行ける旅先を地図にしました。</p>
  <div class="list">${bestStars.map((s) => `<div class="row"><span class="pill">${s.name}</span><span>${s.directions.join('・')}</span></div>`).join('')}</div>
  <p style="font-size:32px;color:#6B7A90">自分の星のページを保存してね →</p>
</div>`);
}

function restHtml(info, restStars) {
  return page(`
<div class="center">
  <div><span class="kicker">${info.label}(${info.period})</span></div>
  <h1>今月は<br><em style="font-style:normal;color:#1E5AA8">お休みの星</em></h1>
  <div class="list">${restStars.map((s) => `<div class="row"><span class="pill" style="background:#1E5AA8">${s.name}</span><span>${s.reason}</span></div>`).join('')}</div>
  <p>無理に遠出せず、次の吉方位に向けてマイルを貯める月に。</p>
</div>`);
}

async function main() {
  const [dateStr, originId, outDir] = process.argv.slice(2);
  const origin = originId && travel.getOrigin(originId);
  if (!dateStr || !origin || !outDir) {
    console.error('使い方: node scripts/sns-map.js <YYYY-MM-DD> <出発地ID> <出力ディレクトリ>');
    process.exit(1);
  }
  const date = new Date(`${dateStr}T00:00:00`);
  const info = houi.getMonthInfo(date);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  const render = async (html, name) => {
    await tab.setContent(html);
    const file = path.join(outDir, name);
    await tab.screenshot({ path: file, type: 'jpeg', quality: 90 });
    return file;
  };

  const bestStars = [];
  const restStars = [];
  const files = [];
  for (let id = 1; id <= 9; id++) {
    const star = kyusei.getStar(id);
    const h = houi.getMonthlyHoui(id, date);
    if (h.yearBlocked || h.monthBlocked) {
      restStars.push({ name: star.name, reason: '八方塞がり' });
    } else if (!h.bestDirections.length) {
      restStars.push({ name: star.name, reason: '最大吉方なし' });
    } else {
      bestStars.push({ name: star.name, directions: h.bestDirections });
      files.push(await render(starMapHtml(h, star, origin, travel.recommend(origin, h.bestDirections, 3)), `star-${id}.jpg`));
    }
  }
  files.unshift(await render(coverHtml(info, origin, bestStars), 'cover.jpg'));
  if (restStars.length) files.push(await render(restHtml(info, restStars), 'rest.jpg'));
  await browser.close();
  console.log(files.join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
