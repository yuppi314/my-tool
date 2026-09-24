// 九星気学 x マヤ暦 の組み合わせから診断コンテンツを合成するロジック
const kyusei = require('./kyusei');
const mayan = require('./mayan');

function computeProfile(dateStr) {
  const date = new Date(dateStr);
  const honmeiId = kyusei.getHonmeiStarId(date);
  const star = kyusei.getStar(honmeiId);
  const kin = mayan.getKin(date);
  const seal = mayan.getSeal(kin);
  const tone = mayan.getTone(kin);
  return { date, honmeiId, star, kin, seal, tone };
}

function buildFreeResult(profile) {
  return {
    star: { id: profile.star.id, name: profile.star.name, keyword: profile.star.keyword },
    kin: profile.kin,
    seal: { name: profile.seal.name, keyword: profile.seal.keyword },
    tone: { name: profile.tone.name, keyword: profile.tone.keyword },
    summary: `九星気学では${profile.star.name}(${profile.star.keyword})、マヤ暦ではKIN${profile.kin}「${profile.seal.name}」・${profile.tone.name}のあなた。${profile.star.trait}`,
  };
}

function buildFullResult(profile) {
  const yearlyPhase = kyusei.getYearlyPhase(profile.honmeiId, new Date());
  const monthlyNote = buildMonthlyOutlook(profile);
  return {
    personality: `${profile.star.trait} マヤ暦の紋章「${profile.seal.name}」は${profile.seal.keyword}を象徴し、${profile.tone.name}(${profile.tone.keyword})の性質が加わることで、あなたの持ち味に一段と深みを与えています。`,
    yearlyFortune: `今年のあなたは「${yearlyPhase}」にあたります。九星気学の9年サイクルと照らし合わせると、この時期は${profile.star.name}らしい${profile.star.keyword}を活かす行動が吉です。`,
    monthlyFortune: monthlyNote,
    element: profile.star.element,
    advice: buildAdvice(profile),
  };
}

function buildMonthlyOutlook(profile) {
  const now = new Date();
  const dayOfMonthKin = mayan.getKin(now);
  const diff = ((dayOfMonthKin - profile.kin) % 260 + 260) % 260;
  const phaseLabel = diff < 65 ? '種まきと準備' : diff < 130 ? '展開と行動' : diff < 195 ? '収穫と発信' : '内省と手放し';
  return `今月のマヤ暦的な流れは「${phaseLabel}」の局面。KINの巡り(差分${diff})から見て、無理に力まず自分のリズムを大切にすると良いでしょう。`;
}

function buildAdvice(profile) {
  const adviceByElement = {
    木: '新しいことへの挑戦や、人との縁を広げる行動が運気を後押しします。',
    火: '自分の情熱や個性を発信することが、運気を高める鍵になります。',
    土: 'コツコツとした積み重ねと、周囲への気配りが信頼を築きます。',
    金: '目標を明確にし、優先順位をつけて動くことで成果が出やすくなります。',
    水: '柔軟に流れに乗りつつ、休息とインプットの時間を大切にしましょう。',
  };
  return adviceByElement[profile.star.element] || 'あなたらしいペースを大切に過ごしましょう。';
}

// 日本時間での「今日」を、ローカル日付として扱える Date にして返す(サーバーのTZに依存しないため)
function todayInJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function formatDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// 太陽の紋章の色(赤→白→青→黄の順で巡る)を五行に対応させる
const SEAL_COLORS = ['赤', '白', '青', '黄'];
const SEAL_COLOR_ELEMENT = { 赤: '火', 白: '金', 青: '水', 黄: '土' };

const LUCKY_COLOR_BY_ELEMENT = {
  木: 'グリーン',
  火: 'レッド・パープル',
  土: 'イエロー・ベージュ',
  金: 'ホワイト・ゴールド',
  水: 'ネイビー・ブラック',
};

const SCORE_MESSAGES = [
  null,
  '無理に動かず、心と体を休めることを優先したい一日。予定は詰め込みすぎないのが吉です。',
  '周囲とのペースのずれを感じやすい日。確認と準備を丁寧にすると、つまずきを防げます。',
  '穏やかで安定した流れの日。いつものルーティンを大切にすると、小さな幸運に気づけます。',
  '追い風が吹く日。気になっていたことに一歩踏み出すと、思わぬ手応えがありそうです。',
  '星と暦の流れがあなたに味方する絶好調の日。大事な決断や新しい挑戦にぴったりです。',
];

// 毎日の運勢(月額会員向け): 今日のKINと本人の本命星・KINの関係から算出する
function buildDailyFortune(profile, date = todayInJst()) {
  const kin = mayan.getKin(date);
  const seal = mayan.getSeal(kin);
  const tone = mayan.getTone(kin);

  const dayColor = SEAL_COLORS[(seal.id - 1) % 4];
  const userColor = SEAL_COLORS[(profile.seal.id - 1) % 4];
  const dayElement = SEAL_COLOR_ELEMENT[dayColor];
  const relation = kyusei.elementRelation(profile.star.element, dayElement);

  // 13日周期(銀河の音)の中で、自分の音から最も離れた位置にある日は調子を崩しやすい
  const toneDiff = (tone.id - profile.tone.id + 13) % 13;

  let score = 3;
  if (relation === 'generatedBy' || relation === 'same') score += 1; // 今日の気が自分を生む・同じ気
  if (relation === 'controlledBy' || relation === 'controls') score -= 1; // 剋し合う気で消耗しやすい
  if (dayColor === userColor) score += 1; // 自分の紋章と同じ色の日は共鳴しやすい
  if (toneDiff === 0) score += 1; // 同じ銀河の音の日
  if (toneDiff === 6 || toneDiff === 7) score -= 1;
  if (kin === profile.kin) score = 5; // 自分のKINが巡る「銀河の誕生日」
  score = Math.max(1, Math.min(5, score));

  const specialNote =
    kin === profile.kin
      ? '今日はあなたのKINが巡る「銀河の誕生日」。260日に一度の特別な日です。'
      : dayColor === userColor
        ? `今日はあなたと同じ「${userColor}」の紋章の日。直感が冴えやすいでしょう。`
        : '';

  return {
    date: formatDate(date),
    day: {
      kin,
      seal: { name: seal.name, keyword: seal.keyword },
      tone: { name: tone.name, keyword: tone.keyword },
    },
    score,
    theme: `今日のテーマは「${seal.keyword.split('・')[0]}」`,
    message: `${specialNote}${SCORE_MESSAGES[score]}`,
    luckyColor: LUCKY_COLOR_BY_ELEMENT[dayElement],
    luckyAction: `${seal.name}の日は「${seal.keyword}」がキーワード。${profile.star.name}のあなたは${buildAdvice(profile)}`,
  };
}

module.exports = {
  computeProfile,
  buildFreeResult,
  buildFullResult,
  buildDailyFortune,
  todayInJst,
};
