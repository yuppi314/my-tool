// 九星気学: 年盤・月盤の算出と吉方位(最大吉方)の判定
// 最大吉方 = 年盤・月盤の両方で吉となる方位。
// 凶方位として五黄殺・暗剣殺・本命殺・本命的殺・歳破(年盤)/月破(月盤)を除外し、
// 残った方位のうち、本命星と相生・比和の星が回座している方位を吉とする。
// 本命星が中宮に入る盤は「八方塞がり」として吉方位なしとする。
const kyusei = require('./kyusei');

const DIRECTIONS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];

// 後天定位盤(中宮に五黄土星が入った基本の配置)
const BASE_BOARD = { 北: 1, 北東: 8, 東: 3, 南東: 4, 南: 9, 南西: 2, 西: 7, 北西: 6 };

const OPPOSITE = { 北: '南', 北東: '南西', 東: '西', 南東: '北西', 南: '北', 南西: '北東', 西: '東', 北西: '南東' };

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const BRANCH_DIRECTION = {
  子: '北', 丑: '北東', 寅: '北東', 卯: '東', 辰: '南東', 巳: '南東',
  午: '南', 未: '南西', 申: '南西', 酉: '西', 戌: '北西', 亥: '北西',
};

// 各月の節入り日(概算)。節入りの時刻・年による1日前後のずれは考慮しない。
const SETSU_DAY = { 1: 6, 2: 4, 3: 6, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7 };

function wrapStar(n) {
  return ((n - 1) % 9 + 9) % 9 + 1;
}

// 西暦年(立春区切り)から年盤の中宮星を求める
function getYearCenterStar(kyuseiYear) {
  return wrapStar(11 - kyusei.digitReduce(kyuseiYear));
}

// 節月の情報: 九星上の年、寅月(2月)を0とする月番号、月の十二支、年盤・月盤の中宮星
function getMonthInfo(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const setsuMonth = d >= SETSU_DAY[m] ? m : m === 1 ? 12 : m - 1;
  const monthIndex = (setsuMonth - 2 + 12) % 12;
  const kyuseiYear = kyusei.getEffectiveYear(date);
  const yearCenter = getYearCenterStar(kyuseiYear);

  // 寅月の中宮星は年の十二支で決まる: 子卯午酉年→八白、丑辰未戌年→五黄、寅巳申亥年→二黒
  const firstMonthCenter = [1, 4, 7].includes(yearCenter) ? 8 : [3, 6, 9].includes(yearCenter) ? 5 : 2;

  // 節月の期間(例: 10/8〜11/6)
  const calendarYear = m === 1 && setsuMonth === 12 ? date.getFullYear() - 1 : date.getFullYear();
  const nextMonth = setsuMonth === 12 ? 1 : setsuMonth + 1;
  const period = `${setsuMonth}/${SETSU_DAY[setsuMonth]}〜${nextMonth}/${SETSU_DAY[nextMonth] - 1}`;

  return {
    kyuseiYear,
    monthIndex,
    setsuMonth,
    calendarYear,
    label: `${calendarYear}年${setsuMonth}月`,
    period,
    yearBranch: BRANCHES[((kyuseiYear - 4) % 12 + 12) % 12],
    monthBranch: BRANCHES[(monthIndex + 2) % 12],
    yearCenter,
    monthCenter: wrapStar(firstMonthCenter - monthIndex),
  };
}

// 中宮星から各方位に回座する星を求める(飛泊)
function buildBoard(center) {
  const board = {};
  for (const dir of DIRECTIONS) board[dir] = wrapStar(BASE_BOARD[dir] + center - 5);
  return board;
}

function isFriendlyStar(honmeiId, starId) {
  if (starId === 5 || starId === honmeiId) return false;
  const relation = kyusei.elementRelation(kyusei.getStar(honmeiId).element, kyusei.getStar(starId).element);
  return relation === 'same' || relation === 'generates' || relation === 'generatedBy';
}

// 1枚の盤(年盤 or 月盤)について、方位ごとの吉凶と理由を判定する
function evaluateBoard(center, branch, honmeiId) {
  const board = buildBoard(center);
  const findDir = (star) => DIRECTIONS.find((dir) => board[dir] === star);
  const reasons = Object.fromEntries(DIRECTIONS.map((dir) => [dir, []]));

  const fiveDir = findDir(5);
  if (fiveDir) {
    reasons[fiveDir].push('五黄殺');
    reasons[OPPOSITE[fiveDir]].push('暗剣殺');
  }
  const honmeiDir = findDir(honmeiId);
  if (honmeiDir) {
    reasons[honmeiDir].push('本命殺');
    reasons[OPPOSITE[honmeiDir]].push('本命的殺');
  }
  const haDir = BRANCH_DIRECTION[BRANCHES[(BRANCHES.indexOf(branch) + 6) % 12]];
  reasons[haDir].push('破');

  const blocked = center === honmeiId; // 八方塞がり
  const result = {};
  for (const dir of DIRECTIONS) {
    const good = !blocked && reasons[dir].length === 0 && isFriendlyStar(honmeiId, board[dir]);
    result[dir] = { star: board[dir], good, reasons: reasons[dir] };
  }
  return { center, blocked, directions: result };
}

// 指定日の属する節月について、本命星から見た年盤・月盤の吉凶と最大吉方を返す
function getMonthlyHoui(honmeiId, date) {
  const info = getMonthInfo(date);
  const year = evaluateBoard(info.yearCenter, info.yearBranch, honmeiId);
  const month = evaluateBoard(info.monthCenter, info.monthBranch, honmeiId);

  // 年盤の「破」は歳破、月盤の「破」は月破として表示する
  const label = (reasons, name) => reasons.map((r) => (r === '破' ? name : r));

  const directions = DIRECTIONS.map((dir) => {
    const y = year.directions[dir];
    const mo = month.directions[dir];
    return {
      direction: dir,
      yearStar: y.star,
      monthStar: mo.star,
      yearGood: y.good,
      monthGood: mo.good,
      best: y.good && mo.good,
      reasons: [...new Set([...label(y.reasons, '歳破'), ...label(mo.reasons, '月破')])],
    };
  });

  return {
    ...info,
    yearBlocked: year.blocked,
    monthBlocked: month.blocked,
    directions,
    bestDirections: directions.filter((d) => d.best).map((d) => d.direction),
  };
}

module.exports = {
  DIRECTIONS,
  OPPOSITE,
  getYearCenterStar,
  getMonthInfo,
  buildBoard,
  evaluateBoard,
  getMonthlyHoui,
};
