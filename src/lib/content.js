// 本命星 × 今月の吉方位 × 自宅から行ける旅先 を組み合わせて診断コンテンツを作る
const kyusei = require('./kyusei');
const houi = require('./houi');
const travel = require('./travel');

// 日本時間での「今日」を、ローカル日付として扱える Date にして返す(サーバーのTZに依存しないため)
function todayInJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function computeProfile(dateStr) {
  const honmeiId = kyusei.getHonmeiStarId(new Date(dateStr));
  return { honmeiId, star: kyusei.getStar(honmeiId) };
}

// 今日の属する節月から数えて i ヶ月後の節月に含まれる日付(各月15日は必ず節入り後)
function monthDate(from, i) {
  const info = houi.getMonthInfo(from);
  return new Date(info.calendarYear, info.setsuMonth - 1 + i, 15);
}

function starName(id) {
  return kyusei.getStar(id).name;
}

// ある節月の吉方位と旅先をまとめる。perDirection で方位ごとの旅先件数を絞る
function buildMonth(profile, origin, date, perDirection) {
  const h = houi.getMonthlyHoui(profile.honmeiId, date);
  return {
    label: h.label,
    period: h.period,
    yearCenter: starName(h.yearCenter),
    monthCenter: starName(h.monthCenter),
    yearBlocked: h.yearBlocked,
    monthBlocked: h.monthBlocked,
    directions: h.directions.map((d) => ({
      ...d,
      yearStar: starName(d.yearStar),
      monthStar: starName(d.monthStar),
    })),
    bestDirections: h.bestDirections,
    destinations: travel.recommend(origin, h.bestDirections, perDirection),
  };
}

// 今月から数えて最初に最大吉方がある月(最大12ヶ月先まで)
function findNextBestMonth(profile, origin, from) {
  for (let i = 1; i <= 12; i++) {
    const month = buildMonth(profile, origin, monthDate(from, i), 1);
    if (month.bestDirections.length) {
      return { label: month.label, period: month.period, bestDirections: month.bestDirections };
    }
  }
  return null;
}

function monthMessage(month) {
  if (month.monthBlocked || month.yearBlocked) {
    return 'あなたの本命星が中宮に入る「八方塞がり」の時期のため、今月は吉方位がありません。遠出は控えめにして、次の吉方位旅の計画を立てるのに向いています。';
  }
  if (!month.bestDirections.length) {
    return '今月は年盤・月盤の両方で吉となる方位(最大吉方)がありません。次に最大吉方が巡る月に向けて、マイルを貯めておきましょう。';
  }
  return `今月の最大吉方は「${month.bestDirections.join('・')}」。年盤・月盤の両方で吉となる、効果が大きいとされる方位です。`;
}

function buildFreeResult(profile, origin, date = todayInJst()) {
  const month = buildMonth(profile, origin, date, 3);
  return {
    star: { id: profile.star.id, name: profile.star.name, element: profile.star.element, keyword: profile.star.keyword },
    origin: origin.name,
    summary: `${profile.star.name}(${profile.star.keyword})のあなた。${profile.star.trait}`,
    month: { ...month, message: monthMessage(month) },
    nextBestMonth: month.bestDirections.length ? null : findNextBestMonth(profile, origin, date),
  };
}

// 有料会員向け: 今月から12ヶ月分の吉方位カレンダー(旅先は全件)
function buildCalendar(profile, origin, date = todayInJst()) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const month = buildMonth(profile, origin, monthDate(date, i), Infinity);
    months.push({
      label: month.label,
      period: month.period,
      bestDirections: month.bestDirections,
      blocked: month.monthBlocked || month.yearBlocked,
      destinations: month.destinations,
    });
  }
  return { months };
}

module.exports = {
  todayInJst,
  computeProfile,
  buildFreeResult,
  buildCalendar,
};
