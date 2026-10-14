// SNS 画像共通の背景「生成りの和紙」。レイアウト・文字には触れず、body の先頭に敷く飾りレイヤーだけを返す。
// 方位盤・星・霞雲・青海波をごく薄く置く。乱数は固定シードなので、毎週・どの星でも同じ背景になる。
// 使い方: page() の body 先頭に washiLayer(W, H, 'cover' | 'map' | 'rest' | 'reel') を差し込む。
// (以降の要素は position:absolute で DOM 順に上へ重なるため、既存の CSS を変えずに背面へ入る)

const GOLD = '#B8955A';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// 方位盤: 二重円・目盛り・八方位の星形・東西南北
function compass(cx, cy, r, opacity) {
  const ticks = [];
  for (let a = 0; a < 360; a += 5) {
    const long = a % 15 === 0;
    const t = (a * Math.PI) / 180;
    const r0 = r * (long ? 0.88 : 0.91);
    ticks.push(`M${(cx + r0 * Math.sin(t)).toFixed(1)},${(cy - r0 * Math.cos(t)).toFixed(1)}L${(cx + r * 0.95 * Math.sin(t)).toFixed(1)},${(cy - r * 0.95 * Math.cos(t)).toFixed(1)}`);
  }
  const rays = [];
  for (let a = 0; a < 360; a += 45) {
    const t = (a * Math.PI) / 180;
    rays.push(`M${(cx + r * 0.22 * Math.sin(t)).toFixed(1)},${(cy - r * 0.22 * Math.cos(t)).toFixed(1)}L${(cx + r * 0.86 * Math.sin(t)).toFixed(1)},${(cy - r * 0.86 * Math.cos(t)).toFixed(1)}`);
  }
  // 八方位の星形(東西南北は長く、四隅は短く)
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const t = (i * 22.5 * Math.PI) / 180;
    const len = i % 4 === 0 ? 0.66 : i % 2 === 0 ? 0.42 : 0.1;
    pts.push(`${(cx + r * len * Math.sin(t)).toFixed(1)},${(cy - r * len * Math.cos(t)).toFixed(1)}`);
  }
  const labels = [['北', 0], ['東', 90], ['南', 180], ['西', 270]].map(([k, a]) => {
    const t = (a * Math.PI) / 180;
    return `<text x="${(cx + r * 0.78 * Math.sin(t)).toFixed(1)}" y="${(cy - r * 0.78 * Math.cos(t) + r * 0.035).toFixed(1)}" font-size="${(r * 0.1).toFixed(0)}" text-anchor="middle" fill="${GOLD}" font-family="serif">${k}</text>`;
  }).join('');
  return `<g opacity="${opacity}" fill="none" stroke="${GOLD}">
    <circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.95}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.7}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" stroke-width="1.5"/>
    <path d="${ticks.join('')}" stroke-width="1.5"/>
    <path d="${rays.join('')}" stroke-width="1" stroke-dasharray="4 6"/>
    <polygon points="${pts.join(' ')}" fill="${GOLD}" fill-opacity="0.25" stroke-width="1.5"/>
    <g stroke="none">${labels}</g>
  </g>`;
}

// きらめく星(4方向の光)と小さな点
function stars(list) {
  return list.map(([x, y, s, o]) => `<path d="M${x},${y - s}Q${x},${y} ${x + s},${y}Q${x},${y} ${x},${y + s}Q${x},${y} ${x - s},${y}Q${x},${y} ${x},${y - s}Z" fill="${GOLD}" opacity="${o}"/>`).join('');
}

// 霞雲(すやり霞): 角丸の帯を段違いに重ねる。重なりが濃くならないようグループごとに透明度をかける
function kasumi(x, y, w, opacity) {
  const h = 26;
  const bands = [[0, 0, w], [w * 0.18, -h * 0.8, w * 0.5], [w * 0.45, h * 0.8, w * 0.55]];
  return `<g opacity="${opacity}" fill="${GOLD}">${bands.map(([dx, dy, bw]) => `<rect x="${x + dx}" y="${y + dy}" width="${bw}" height="${h}" rx="${h / 2}"/>`).join('')}</g>`;
}

// 青海波: 四隅に置き、放射状グラデーションのマスクで中央へ向かって消えていく
function seigaihaCorner(id, cx, cy, r, opacity) {
  return `<mask id="${id}"><rect width="100%" height="100%" fill="url(#${id}-g)"/></mask>
    <radialGradient id="${id}-g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <rect width="100%" height="100%" fill="url(#seigaiha)" mask="url(#${id})" opacity="${opacity}"/>`;
}

const SEIGAIHA_PATTERN = (() => {
  const set = (x, y) => [40, 31, 22, 13].map((r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const order = [[40, -20], [0, 0], [80, 0], [40, 20], [0, 40], [80, 40], [40, 60]];
  return `<pattern id="seigaiha" width="80" height="40" patternUnits="userSpaceOnUse">
    <g fill="#FBF3E6" stroke="${GOLD}" stroke-width="1.6">${order.map(([x, y]) => set(x, y)).join('')}</g>
  </pattern>`;
})();

// 和紙の繊維: 固定シードで短い曲線を散らす
function fibers(W, H, count, seed) {
  const r = rng(seed);
  const d = [];
  for (let i = 0; i < count; i++) {
    const x = r() * W;
    const y = r() * H;
    const len = 18 + r() * 60;
    const a = r() * Math.PI * 2;
    const bx = x + Math.cos(a) * len;
    const by = y + Math.sin(a) * len;
    const qx = (x + bx) / 2 + (r() - 0.5) * 24;
    const qy = (y + by) / 2 + (r() - 0.5) * 24;
    d.push(`M${x.toFixed(0)},${y.toFixed(0)}Q${qx.toFixed(0)},${qy.toFixed(0)} ${bx.toFixed(0)},${by.toFixed(0)}`);
  }
  return `<path d="${d.join('')}" fill="none" stroke="#A8875A" stroke-width="0.9" opacity="0.16"/>`;
}

// 紙の地合い(細かなざらつき + ゆるいムラ)。飾りの上に掛けるので、青海波なども紙に刷ったように見える
function paper(W, H) {
  return `<filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/>
      <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.9 -0.38"/>
    </filter>
    <filter id="mottle" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0.72  0 0 0 0 0.6  0 0 0 0 0.42  0 0 0 0.5 -0.18"/>
    </filter>
    <rect width="${W}" height="${H}" filter="url(#mottle)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.5"/>`;
}

// スライドの種類ごとの配置。文字の多い左側と中央は避け、右側・四隅の余白に寄せる
const PRESETS = {
  // 表紙: 右側の余白に大きな方位盤
  cover: (W, H) => ({
    compass: [W - 150, H * 0.47, 400, 0.16],
    corners: [[W, H, 330, 0.4], [0, 0, 260, 0.3]],
    clouds: [[W - 430, 150, 380, 0.1], [40, H - 120, 340, 0.08]],
    stars: [[W - 120, 110, 13, 0.4], [W - 260, 250, 8, 0.35], [W - 70, 380, 9, 0.35], [W - 330, H - 230, 11, 0.35], [W - 110, H - 330, 7, 0.3], [620, 70, 7, 0.3]],
  }),
  // 地図: 見出しの右上に方位盤。地図(水色)とパネルが上に重なるので、見える余白は上部と下端だけ
  map: (W) => ({
    compass: [W - 130, 150, 230, 0.16],
    corners: [[0, 0, 240, 0.3]],
    clouds: [[W - 300, 262, 280, 0.09]],
    stars: [[W - 330, 60, 10, 0.4], [W - 40, 285, 8, 0.35], [760, 190, 6, 0.3]],
  }),
  rest: (W, H) => ({
    compass: [W - 170, H * 0.3, 330, 0.14],
    corners: [[W, H, 320, 0.4], [0, 0, 240, 0.3]],
    clouds: [[W - 440, 140, 360, 0.1], [40, H - 120, 340, 0.08]],
    stars: [[W - 110, H - 400, 10, 0.35], [W - 280, 90, 8, 0.35], [W - 60, 560, 7, 0.3]],
  }),
  // リール(1080x1920): 中央に方位盤や文字が来るので、飾りは上下の余白と右上に寄せる
  reel: (W, H) => ({
    compass: [W - 110, 250, 330, 0.15],
    corners: [[W, H, 420, 0.4], [0, 0, 300, 0.3]],
    clouds: [[W - 470, 110, 380, 0.1], [50, H - 170, 380, 0.09]],
    stars: [[W - 330, 70, 12, 0.4], [W - 60, 520, 9, 0.35], [120, 300, 8, 0.3], [W - 200, H - 420, 10, 0.35], [180, H - 330, 7, 0.3]],
  }),
};

function washiLayer(W, H, kind = 'map') {
  const p = PRESETS[kind](W, H);
  return `<svg class="washi deco" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;top:0;left:0">
  <defs>${SEIGAIHA_PATTERN}</defs>
  <rect width="${W}" height="${H}" fill="#FBF3E6"/>
  ${p.corners.map(([x, y, r, o], i) => seigaihaCorner(`sg${i}`, x, y, r, o)).join('')}
  ${p.clouds.map(([x, y, w, o]) => kasumi(x, y, w, o)).join('')}
  ${compass(...p.compass)}
  ${stars(p.stars)}
  ${fibers(W, H, 220, 20260927)}
  ${paper(W, H)}
</svg>`;
}

module.exports = { washiLayer };
