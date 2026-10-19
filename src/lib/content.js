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

// 月命星: 生まれた節月の月盤の中宮星。心の奥の性質や、身近な人に見せる素顔を表すとされる
function getGetsumeiId(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return houi.getMonthInfo(new Date(y, m - 1, d)).monthCenter;
}

function computeProfile(dateStr) {
  return profileFromStar(kyusei.getHonmeiStarId(new Date(dateStr)), getGetsumeiId(dateStr));
}

function profileFromStar(honmeiId, getsumeiId) {
  const valid = Number.isInteger(getsumeiId) && getsumeiId >= 1 && getsumeiId <= 9;
  return { honmeiId, star: kyusei.getStar(honmeiId), getsumeiId: valid ? getsumeiId : null };
}

function getsumeiInfo(profile) {
  if (!profile.getsumeiId) return null;
  const g = kyusei.getStar(profile.getsumeiId);
  return {
    id: g.id, name: g.name, keyword: g.keyword, trait: g.trait,
    note: profile.getsumeiId === profile.honmeiId
      ? '本命星と月命星が同じ星。表の顔も心の奥も同じ性質で、その星らしさがはっきり出やすいとされます。'
      : `表の顔は${profile.star.name}、心の奥や、家族など身近な人に見せる素顔は${g.name}の性質とされます。`,
  };
}

// 傾斜宮: 月命星を中宮に置いた盤で、本命星が入る宮。本命星と月命星が同じときは中宮傾斜とする
const KEISHA = {
  北: { name: '坎宮傾斜', yomi: 'かんきゅうけいしゃ', words: '思慮深さ・柔軟さ・人の心に寄り添う力',
    text: '人の気持ちを深く感じとり、相手に合わせてしなやかに動ける本質があると言われています。ひとりで考える時間が、あなたを整えてくれます。' },
  北東: { name: '艮宮傾斜', yomi: 'ごんきゅうけいしゃ', words: '粘り強さ・変化を力にする・蓄える力',
    text: 'コツコツ積み重ね、人生の節目で大きく流れを変える力があると言われています。変化のときこそ、あなたの本領が出やすいでしょう。' },
  東: { name: '震宮傾斜', yomi: 'しんきゅうけいしゃ', words: '行動力・明るさ・新しいことへの挑戦',
    text: '思い立ったらすぐ動ける、明るく前向きな本質があると言われています。新しい場所や初めてのことが、あなたを元気にしてくれます。' },
  南東: { name: '巽宮傾斜', yomi: 'そんきゅうけいしゃ', words: '調和・ご縁・信頼される力',
    text: '人と人をつなぎ、まわりと調和しながら物事を進める本質があると言われています。ご縁を大切にするほど、運が広がりやすいでしょう。' },
  南: { name: '離宮傾斜', yomi: 'りきゅうけいしゃ', words: 'ひらめき・美意識・華やかさ',
    text: '感性が豊かで、美しいものやひらめきを形にする本質があると言われています。好きなものに囲まれると、魅力がいっそう輝きます。' },
  南西: { name: '坤宮傾斜', yomi: 'こんきゅうけいしゃ', words: '支える力・まじめさ・家庭的なあたたかさ',
    text: 'まわりの人を支え、地道に努力を続けられる本質があると言われています。誰かの役に立てたとき、あなたの心も満たされやすいでしょう。' },
  西: { name: '兌宮傾斜', yomi: 'だきゅうけいしゃ', words: '楽しむ力・社交性・会話上手',
    text: '人生を楽しみ、まわりを明るくする本質があると言われています。おいしい食事やおしゃべりの時間が、あなたの運気を整えてくれます。' },
  北西: { name: '乾宮傾斜', yomi: 'けんきゅうけいしゃ', words: '目標に向かう力・責任感・リーダーシップ',
    text: '高い目標に向かって努力を続け、人を引っぱっていく本質があると言われています。少し背すじの伸びる場所が、あなたに力をくれます。' },
  中央: { name: '中宮傾斜', yomi: 'ちゅうぐうけいしゃ', words: '芯の強さ・存在感・まとめる力',
    text: '表の顔と心の奥が同じ星なので、その星らしさがまっすぐ出る、芯の強い本質があると言われています。' },
};
function keishaInfo(profile) {
  if (!profile.getsumeiId) return null;
  let palace = '中央';
  if (profile.getsumeiId !== profile.honmeiId) {
    const board = houi.buildBoard(profile.getsumeiId);
    palace = Object.keys(board).find((d) => board[d] === profile.honmeiId);
  }
  return { palace, ...KEISHA[palace] };
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

// 出かける日が決まっている人向け: その日の属する節月の最大吉方と旅先、その日(日盤)でも吉の方位
function planByDate(profile, origin, date) {
  const month = buildMonth(profile, origin, date, 2);
  const day = buildToday(profile.honmeiId, date);
  const dayGood = new Set(day.directions.map((d) => d.direction));
  return {
    dateLabel: day.label,
    monthLabel: month.label,
    period: month.period,
    blocked: month.yearBlocked || month.monthBlocked,
    best: month.bestDirections.map((d) => ({ direction: d, luck: DIRECTION_LUCK[d], dayGood: dayGood.has(d) })),
    dayBlocked: day.blocked,
    dayDirections: day.directions,
    destinations: month.destinations,
    message: monthMessage(month),
  };
}

// 行きたい場所がある人向け: 自宅から見たその場所の方位と、この先12か月で最大吉方になる月
function planByPlace(profile, origin, place, from = todayInJst(), freeMonths = 3) {
  const km = Math.round(travel.distanceKm(origin, place));
  const direction = travel.sectorOf(travel.bearingDeg(origin, place));
  const months = [];
  for (let i = 0; i < 12; i++) {
    const h = houi.getMonthlyHoui(profile.honmeiId, monthDate(from, i));
    if (h.bestDirections.includes(direction)) months.push({ index: i, label: h.label, period: h.period });
  }
  return {
    place: place.name,
    direction,
    luck: DIRECTION_LUCK[direction],
    distanceKm: km,
    tooClose: km < travel.MIN_DISTANCE_KM,
    months: months.filter((m) => m.index < freeMonths),
    moreCount: months.filter((m) => m.index >= freeMonths).length,
    freeMonths,
  };
}

// 凶方位の名前ごとのやさしい説明(断定しない)
const REASON_NOTE = {
  五黄殺: '物事がとどこおりやすいとされる方角',
  暗剣殺: '思いがけないことが起きやすいとされる方角',
  本命殺: '無理をすると疲れが出やすいとされる方角',
  本命的殺: '判断がぶれやすいとされる方角',
  歳破: 'その年は、物事がこわれやすいとされる方角',
  月破: 'その月は、物事がこわれやすいとされる方角',
  破: 'その日は、物事がこわれやすいとされる方角',
};
// 方角ごとの「旅先でやるといいこと」(すすめ方の例)
const DIRECTION_TODO = {
  北: ['温泉や水辺でゆったり過ごす', '大切な人と静かな時間を', '夜の星空や川沿いをお散歩'],
  北東: ['山や高台から景色をながめる', 'これからのお金の計画をノートに書く', 'ご先祖や実家に感謝を伝える'],
  東: ['早起きして朝日を浴びる', '新しいことを1つ始めてみる', '音楽やライブを楽しむ'],
  南東: ['縁結びの神社にお参りする', '友人とゆっくりおしゃべり', '風の気持ちいい高原や海辺を歩く'],
  南: ['美術館や美しい景色を見に行く', 'おしゃれをして出かける', '夜景や光のきれいな場所へ'],
  南西: ['土地のごはんをゆっくり味わう', '家族とのんびり過ごす', '陶器や土ものの器をお土産に'],
  西: ['ご当地グルメを楽しむ', '夕日のきれいな場所へ', '気の合う人とにぎやかに'],
  北西: ['格式のある神社仏閣にお参りする', '少し良いホテルで背すじを伸ばす', 'がんばった自分にごほうびを'],
};
const COMMON_TODO = ['その土地のものを食べる', '温泉や水辺でゆっくりする', '旅の写真やメモを残す'];
const REST_TODO = ['予定を詰めこまず、のんびり過ごす', '早めに寝て、体を休める', '温泉に入って、ゆっくり整える', '無理な運転や長い歩きは控えめに', '次の吉方位旅の計画を立てる'];

// 日にちと行き先が決まっている人向け: その日・その場所の吉凶と、旅先でやるといいこと
function planTrip(profile, origin, place, date) {
  const km = Math.round(travel.distanceKm(origin, place));
  const direction = travel.sectorOf(travel.bearingDeg(origin, place));
  const month = houi.getMonthlyHoui(profile.honmeiId, date);
  const m = month.directions.find((d) => d.direction === direction);
  const day = nichiban.getDailyHoui(profile.honmeiId, date);
  const dd = day.directions.find((d) => d.direction === direction);
  const dayReasons = (dd.reasons || []).map((r) => (r === '破' ? '日破' : r));
  const blocked = month.yearBlocked || month.monthBlocked;
  const near = km < travel.MIN_DISTANCE_KM;
  const reasons = [...new Set(m.reasons)];
  let level;
  if (near) level = dd.good ? 'good' : (dayReasons.length ? 'caution' : 'normal');
  else if (blocked) level = 'rest';
  else if (m.best) level = 'best';
  else if (reasons.length) level = 'caution';
  else if (m.monthGood) level = 'good';
  else level = 'normal';
  const TITLE = {
    best: '◎ 最大吉方の旅です', good: '○ 吉方位の旅です', normal: '△ 吉でも凶でもない、ふつうの方角です',
    caution: '△ 気をつけたい方角です', rest: '△ 今は「八方塞がり」の時期です',
  };
  let message;
  if (level === 'best') message = `年盤・月盤の両方で「${direction}」が吉です。${DIRECTION_LUCK[direction]}の運気をいただける旅とされます。`;
  else if (level === 'good') message = near ? 'ご自宅から近い場所なので、その日の吉方位(日盤)で見ています。日帰りのお出かけにいい日です。' : `月盤で「${direction}」が吉です。年盤では最大吉方ではないので、楽しむ旅として出かけましょう。`;
  else if (level === 'caution') message = '楽しみな旅なら、無理をせず「のんびり休む旅」にするのがおすすめです。';
  else if (level === 'rest') message = 'あなたの星が真ん中に入る、動くより整える時期とされます。行くなら、ゆっくり休む旅に。';
  else message = '大きな心配はありません。旅そのものを楽しんでください。';
  const cautions = (near ? dayReasons : reasons).map((r) => ({ name: r, note: REASON_NOTE[r] || '' }));
  const todo = level === 'best' || level === 'good' ? [...DIRECTION_TODO[direction], ...COMMON_TODO]
    : level === 'normal' ? COMMON_TODO : REST_TODO;
  // この方角が次に最大吉方になる月(12か月先まで)
  let next = null;
  for (let i = 0; i < 12 && !next; i++) {
    const h = houi.getMonthlyHoui(profile.honmeiId, monthDate(date, i));
    if (h.bestDirections.includes(direction) && h.label !== month.label) next = { label: h.label, period: h.period };
  }
  return {
    place: place.name, direction, luck: DIRECTION_LUCK[direction], distanceKm: km, near,
    dateLabel: buildToday(profile.honmeiId, date).label, monthLabel: month.label, period: month.period,
    level, title: TITLE[level], message, cautions, todo,
    year: m.yearGood, month: m.monthGood, day: dd.good,
    next: level === 'best' ? null : next,
  };
}

function buildFreeResult(profile, origin, date = todayInJst()) {
  const month = buildMonth(profile, origin, date, 3);
  return {
    star: { id: profile.star.id, name: profile.star.name, element: profile.star.element, keyword: profile.star.keyword,
      color: profile.star.color, trait: profile.star.trait },
    getsumei: getsumeiInfo(profile),
    keisha: keishaInfo(profile),
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
  planByDate,
  planByPlace,
  planTrip,
  getGetsumeiId,
  todayInJst,
  computeProfile,
  profileFromStar,
  buildFreeResult,
  buildCalendar,
};
