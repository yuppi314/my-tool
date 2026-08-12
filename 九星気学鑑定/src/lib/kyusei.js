// 九星気学: 本命星(ほんめいせい)の算出
// 立春(2/4)を年の境目とする一般的な算出アルゴリズム。

const STARS = [
  null, // index 0 unused, stars are 1-9
  { id: 1, name: '一白水星', element: '水', color: '白', keyword: '柔軟・社交的・忍耐強い',
    trait: '水のように環境に合わせて形を変える柔軟さと、人の心に寄り添う社交性を持つタイプ。表面は穏やかでも内に強い忍耐力を秘めています。' },
  { id: 2, name: '二黒土星', element: '土', color: '黒', keyword: '堅実・献身的・努力家',
    trait: '大地のようにどっしりと構え、コツコツ積み上げる努力家。縁の下の力持ちとして周囲を支えることに喜びを感じるタイプ。' },
  { id: 3, name: '三碧木星', element: '木', color: '碧', keyword: '行動力・好奇心・スピード感',
    trait: '若木が伸びるような勢いと瞬発力を持ち、新しいことへの好奇心が旺盛。声や発信力で周囲に影響を与えるタイプ。' },
  { id: 4, name: '四緑木星', element: '木', color: '緑', keyword: '調和・信用・社交上手',
    trait: '風のようにしなやかで、人と人とをつなぐ調和力に長けたタイプ。信用を積み重ねることで物事を成就させます。' },
  { id: 5, name: '五黄土星', element: '土', color: '黄', keyword: 'カリスマ・強運・支配力',
    trait: '全てを包み込み腐敗も再生も司る、良くも悪くも強いエネルギーを持つ王者タイプ。破壊と再生の両極端な力を秘めています。' },
  { id: 6, name: '六白金星', element: '金', color: '白', keyword: '責任感・完璧主義・統率力',
    trait: '天を象徴し、高い目標に向かって努力を惜しまないリーダータイプ。プライドが高く完璧主義な一面も。' },
  { id: 7, name: '七赤金星', element: '金', color: '赤', keyword: '社交性・話術・楽天的',
    trait: '喜びや社交を象徴し、人を楽しませる話術と愛嬌を持つタイプ。金運や飲食・娯楽との縁も深いとされます。' },
  { id: 8, name: '八白土星', element: '土', color: '白', keyword: '変化・忍耐・蓄積',
    trait: '山のように動じない忍耐力と、変化・転換を象徴するタイプ。じっくり力を蓄え、機が熟した時に大きく動きます。' },
  { id: 9, name: '九紫火星', element: '火', color: '紫', keyword: '情熱・direct・美意識',
    trait: '炎のように明るく情熱的で、美意識や感性に優れたタイプ。物事をはっきりと照らし出す洞察力を持ちます。' },
];

// 五行相生(生じる関係)・相剋(打ち消す関係)の順序
const GENERATING_CYCLE = ['木', '火', '土', '金', '水']; // 木→火→土→金→水→木

function digitReduce(n) {
  let value = Math.abs(n);
  while (value > 9) {
    value = String(value)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return value;
}

function getEffectiveYear(date) {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  // 立春(2/4)より前に生まれた場合は前年扱い
  if (month === 1 || (month === 2 && day < 4)) {
    return date.getFullYear() - 1;
  }
  return date.getFullYear();
}

function getHonmeiStarId(date) {
  const year = getEffectiveYear(date);
  const n = digitReduce(year);
  let star = 11 - n;
  if (star > 9) star -= 9;
  if (star <= 0) star += 9;
  return star;
}

function getStar(id) {
  return STARS[id];
}

function elementRelation(elA, elB) {
  if (elA === elB) return 'same';
  const idxA = GENERATING_CYCLE.indexOf(elA);
  const idxB = GENERATING_CYCLE.indexOf(elB);
  const diff = (idxB - idxA + 5) % 5;
  if (diff === 1) return 'generates'; // AがBを生む(相生)
  if (diff === 4) return 'generatedBy'; // BがAを生む(相生)
  if (diff === 2) return 'controls'; // AがBを剋す(相剋)
  if (diff === 3) return 'controlledBy'; // BがAを剋す(相剋)
  return 'neutral';
}

// 9年サイクルにおける運気フェーズ(その年の中心星と自分の本命星の位置関係)
const CYCLE_PHASES = [
  '種蒔きの年 — 新しいことを始めるための土台づくりに向く時期',
  '成長の年 — 蒔いた種が芽吹き始め、動き出しに勢いが出る時期',
  '開花の年 — 対外的な活動が実を結び始め、注目を集めやすい時期',
  '結実の年 — これまでの努力が形になり、成果を刈り取る時期',
  '収穫の年 — 最も充実し、豊かさを享受しやすい絶好調の時期',
  '転換の年 — 頂点を過ぎ、変化や見直しが起こりやすい時期',
  '整理の年 — 不要なものを手放し、身軽になることが吉となる時期',
  '停滞の年 — 無理に動かず力を蓄えることが大切な充電期間',
  '準備の年 — 次のサイクルに向けて静かに準備を進める時期',
];

function getYearlyPhase(honmeiStarId, targetDate = new Date()) {
  const currentYearStar = getHonmeiStarId(targetDate);
  // 中心星から自分の星までの巡り(9年サイクルの何年目か)を算出
  const position = (currentYearStar - honmeiStarId + 9) % 9;
  return CYCLE_PHASES[position];
}

module.exports = {
  STARS,
  digitReduce,
  getEffectiveYear,
  getHonmeiStarId,
  getStar,
  elementRelation,
  getYearlyPhase,
};
