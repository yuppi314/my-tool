// SNS投稿のネタ元になる「今月・来月の吉方位」を9つの本命星ぶん出力する。
// 投稿文はこの計算結果だけを根拠に書くこと(吉方位を推測で書かないため)。
// 使い方: node scripts/sns-facts.js [YYYY-MM-DD]
const kyusei = require('../src/lib/kyusei');
const houi = require('../src/lib/houi');
const travel = require('../src/lib/travel');
const { todayInJst } = require('../src/lib/content');

const SAMPLE_ORIGINS = ['tokyo', 'osaka', 'fukuoka'];

function describeMonth(date) {
  const info = houi.getMonthInfo(date);
  const lines = [
    `## ${info.label}(${info.period})`,
    `年盤: ${kyusei.getStar(info.yearCenter).name}中宮 / 月盤: ${kyusei.getStar(info.monthCenter).name}中宮`,
    '',
  ];
  for (let id = 1; id <= 9; id++) {
    const h = houi.getMonthlyHoui(id, date);
    const name = kyusei.getStar(id).name;
    if (h.yearBlocked || h.monthBlocked) {
      lines.push(`- ${name}: 八方塞がり(吉方位なし)`);
      continue;
    }
    if (!h.bestDirections.length) {
      lines.push(`- ${name}: 最大吉方なし`);
      continue;
    }
    const samples = SAMPLE_ORIGINS.map((originId) => {
      const places = travel.recommend(originId, h.bestDirections, 2).filter((d) => d.region === 'domestic');
      const origin = travel.getOrigin(originId).name;
      return `${origin}発: ${places.map((p) => `${p.name}(${p.direction}・約${p.distanceKm}km)`).join('、') || '該当なし'}`;
    });
    lines.push(`- ${name}: 最大吉方 ${h.bestDirections.join('・')} / ${samples.join(' / ')}`);
  }
  return lines.join('\n');
}

const base = process.argv[2] ? new Date(`${process.argv[2]}T00:00:00`) : todayInJst();
const info = houi.getMonthInfo(base);
const nextMonth = new Date(info.calendarYear, info.setsuMonth, 15);

console.log(`# 吉方位データ(基準日 ${base.getFullYear()}-${base.getMonth() + 1}-${base.getDate()})`);
console.log('');
console.log(describeMonth(base));
console.log('');
console.log(describeMonth(nextMonth));
