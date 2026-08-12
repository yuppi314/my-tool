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

module.exports = {
  computeProfile,
  buildFreeResult,
  buildFullResult,
};
