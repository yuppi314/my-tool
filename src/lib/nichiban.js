// 九星気学: 日盤(日家九星)の算出と、その日の吉方位の判定
// 日家九星は、冬至・夏至にもっとも近い甲子(きのえね)の日で切り替わる。
// 冬至近くの甲子から陽遁(一白→二黒→…と1日ずつ進む)、夏至近くの甲子から陰遁(九紫→八白→…と1日ずつ戻る)。
// 吉凶の判定は年盤・月盤と同じ evaluateBoard を日盤に当てる(五黄殺・暗剣殺・本命殺・本命的殺・日破を除外)。
const houi = require('./houi');

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DAY_MS = 86400000;

// 日付(年月日だけ)を通日にする。時差の影響を受けないよう UTC で数える
const dayNumber = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const toDayNumber = (date) => dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());

// 干支の番号(甲子 = 0)。1970-01-01 は辛巳(17)
const sexagenary = (n) => (((n + 17) % 60) + 60) % 60;

// 冬至・夏至の日(日本時間・概算。年により1日前後ずれることがある)
const WINTER_SOLSTICE_DAY = 22;
const SUMMER_SOLSTICE_DAY = 21;

// 指定した通日にもっとも近い甲子の日
function nearestKoushi(n) {
  const offset = sexagenary(n); // n から何日戻れば甲子か
  return offset <= 30 ? n - offset : n + (60 - offset);
}

// その日に効いている切り替え点(陽遁/陰遁の始まり)を求める
function currentSwitch(n, year) {
  const points = [];
  for (const y of [year - 1, year, year + 1]) {
    points.push({ day: nearestKoushi(dayNumber(y, 6, SUMMER_SOLSTICE_DAY)), yang: false });
    points.push({ day: nearestKoushi(dayNumber(y, 12, WINTER_SOLSTICE_DAY)), yang: true });
  }
  return points.filter((p) => p.day <= n).sort((a, b) => b.day - a.day)[0];
}

function getDayInfo(date) {
  const n = toDayNumber(date);
  const sw = currentSwitch(n, date.getFullYear());
  const passed = n - sw.day;
  const center = sw.yang ? (passed % 9) + 1 : 9 - (passed % 9);
  const s = sexagenary(n);
  return {
    center,
    yang: sw.yang,
    kanshi: STEMS[s % 10] + BRANCHES[s % 12],
    branch: BRANCHES[s % 12],
  };
}

// 本命星から見た、その日の吉方位(日盤で吉の方位)
function getDailyHoui(honmeiId, date) {
  const info = getDayInfo(date);
  const board = houi.evaluateBoard(info.center, info.branch, honmeiId);
  const directions = houi.DIRECTIONS.map((dir) => ({ direction: dir, ...board.directions[dir] }));
  return {
    ...info,
    blocked: board.blocked,
    directions,
    goodDirections: directions.filter((d) => d.good).map((d) => d.direction),
  };
}

module.exports = { getDayInfo, getDailyHoui };
