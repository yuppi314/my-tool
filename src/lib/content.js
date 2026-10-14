// 本命星 × 今月の吉方位 × 自宅から行ける旅先 を組み合わせて診断コンテンツを作る
const kyusei = require('./kyusei');
const houi = require('./houi');
const travel = require('./travel');
const nichiban = require('./nichiban');

// 方位ごとに得られるとされる運気(SNS の素材と同じ)
const DIRECTION_LUCK = {
  北: '信頼・愛情・子宝', 北東: '変化・貯蓄・相続', 東: '発展・行動力・若さ', 南東: '良縁・信用・人間関係',
  南: '名誉・美・ひらめき', 南西: '家庭運・安定・勤勉', 西: '金運・恋愛・楽しみ', 北西: '仕事運・引き立て・出世',
};
const WEEK = '日月火水木金土';

// 今日の吉方位(日盤)。日帰り・お散歩の方角の目安
function buildToday(honmeiId, date) {
  const h = nichiban.getDailyHoui(honmeiId, date);
  return {
    label: `${date.getMonth() + 1}月${date.getDate()}日(${WEEK[date.getDay()]})`,
    blocked: h.blocked,
    directions: h.goodDirections.map((d) => ({ direction: d, luck: DIRECTION_LUCK[d] })),
  };
}

// 本命星と相性のよい星(五行の相生・比和)
function buildCompatible(honmeiId) {
  const me = kyusei.getStar(honmeiId);
  const groups = { generatedBy: [], generates: [], same: [] };
  for (let id = 1; id <= 9; id++) {
    if (id === honmeiId) continue;
    const other = kyusei.getStar(id);
    const rel = kyusei.elementRelation(me.element, other.element);
    if (groups[rel]) groups[rel].push(other.name);
  }
  return [
    { title: 'あなたを支えてくれる星', note: '一緒にいると元気をもらえる相手とされます', stars: groups.generatedBy },
    { title: 'あなたが力になれる星', note: 'あなたが自然とサポートしてあげられる相手です', stars: groups.generates },
    { title: '気が合う似たもの同士', note: '同じ性質を持ち、分かり合いやすい相手です', stars: groups.same },
  ].filter((g) => g.stars.length);
}

// 日本時間での「今日」を、ローカル日付として扱える Date にして返す(サーバーのTZに依存しないため)
function todayInJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function computeProfile(dateStr) {
  return profileFromStar(kyusei.getHonmeiStarId(new Date(dateStr)));
}

function profileFromStar(honmeiId) {
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
    star: { id: profile.star.id, name: profile.star.name, element: profile.star.element, keyword: profile.star.keyword,
      color: profile.star.color, trait: profile.star.trait },
    today: buildToday(profile.honmeiId, date),
    compatible: buildCompatible(profile.honmeiId),
    origin: origin.name,
    summary: `${profile.star.name}(${profile.star.keyword})のあなた。${profile.star.trait}`,
    month: { ...month, message: monthMessage(month),
      bestLuck: month.bestDirections.map((d) => ({ direction: d, luck: DIRECTION_LUCK[d] })) },
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
  profileFromStar,
  buildFreeResult,
  buildCalendar,
};
