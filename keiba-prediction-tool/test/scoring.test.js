const test = require('node:test');
const assert = require('node:assert/strict');
const { computeOverallMarks, computeTipsterPicks } = require('../src/lib/scoring');

function makeHorse(overrides) {
  return {
    number: 1, waku: 1, name: 'テストホース', sex: '牡', age: 4, jockey: '仮',
    odds: 10, oddsMove: null,
    recentFinishes: [5, 5, 5, 5, 5],
    jockeyWinRatePct: 8, speedFigure: 65, courseFit: 50, restDaysSinceLast: 28,
    ...overrides
  };
}

function makeRace(horses, overrides = {}) {
  return {
    id: 'test-race', date: '2026-07-18', category: 'central', venue: 'テスト場',
    raceNumber: 1, name: 'テストレース', surface: '芝', distanceM: 1600,
    postTime: '10:00', weather: '晴', trackCondition: '良', paceNote: '',
    headcount: horses.length, horses, ...overrides
  };
}

test('computeOverallMarks: 明確に強い馬に◎が付き、上位4頭を超えると印なし', () => {
  const strong = makeHorse({
    number: 1, odds: 2.0, recentFinishes: [1, 1, 2, 1, 1],
    jockeyWinRatePct: 22, speedFigure: 92, courseFit: 90, restDaysSinceLast: 28
  });
  const weakest = makeHorse({
    number: 2, odds: 80, recentFinishes: [8, 8, 7, 8, 8],
    jockeyWinRatePct: 3, speedFigure: 52, courseFit: 25, restDaysSinceLast: 120
  });
  const middling = [3, 4, 5, 6].map((n) => makeHorse({ number: n, odds: 10 + n * 3 }));
  const race = makeRace([strong, weakest, ...middling]);

  const marks = computeOverallMarks(race);
  assert.equal(marks[1], '◎');
  assert.equal(marks[2], undefined, '出走6頭中もっとも弱い馬には印が付かない(上位4頭のみ)');
});

test('computeOverallMarks: 上位4頭にちょうど◎○▲△が1つずつ付く', () => {
  const horses = Array.from({ length: 8 }, (_, i) => makeHorse({
    number: i + 1, odds: 3 + i * 5, recentFinishes: [3 + i, 4 + i, 3 + i, 4 + i, 3 + i]
  }));
  const race = makeRace(horses);
  const marks = computeOverallMarks(race);
  const values = Object.values(marks).sort();
  assert.deepEqual(values, ['◎', '△', '○', '▲'].sort());
});

test('computeTipsterPicks: 3人分の予想が返り、それぞれ買い方が単勝の◎と一致する', () => {
  const horses = Array.from({ length: 8 }, (_, i) => makeHorse({
    number: i + 1, odds: 3 + i * 5, recentFinishes: [3 + i, 4 + i, 3 + i, 4 + i, 3 + i],
    courseFit: 90 - i * 8
  }));
  const race = makeRace(horses);
  const picks = computeTipsterPicks(race);

  assert.equal(picks.length, 3);
  const ids = picks.map((p) => p.tipsterId).sort();
  assert.deepEqual(ids, ['databall', 'kankaku', 'ketto']);

  for (const pick of picks) {
    assert.equal(pick.bets.tansho, String(pick.honmei));
    assert.ok(pick.comment.length > 0);
    assert.notEqual(pick.honmei, pick.taikou);
  }
});

test('computeTipsterPicks: 出走馬が2頭なら2頭系の買い方まで、3連系は省略される', () => {
  const race = makeRace([
    makeHorse({ number: 1, odds: 2.0 }),
    makeHorse({ number: 2, odds: 20.0 })
  ]);
  const picks = computeTipsterPicks(race);
  assert.equal(picks.length, 3);
  for (const pick of picks) {
    assert.notEqual(pick.taikou, null, '2頭いれば対抗は選べる');
    assert.equal(pick.bets.fukusho, `${pick.honmei},${pick.taikou}`);
    assert.equal(pick.bets.umaren, `${pick.honmei}-${pick.taikou}`);
    assert.equal(pick.bets.sanrenpuku, undefined, '3頭目がいないので3連系は作れない');
    assert.equal(pick.bets.sanrentan, undefined);
  }
});

test('computeTipsterPicks: 出走馬が1頭なら単勝のみで、対抗以降は省略される', () => {
  const race = makeRace([makeHorse({ number: 1, odds: 1.5 })]);
  const picks = computeTipsterPicks(race);
  for (const pick of picks) {
    assert.equal(pick.honmei, 1);
    assert.equal(pick.taikou, null);
    assert.deepEqual(pick.bets, { tansho: '1' });
  }
});

test('computeTipsterPicks: 出走馬が0頭なら空配列を返す', () => {
  const race = makeRace([]);
  assert.deepEqual(computeTipsterPicks(race), []);
  assert.deepEqual(computeOverallMarks(race), {});
});

test('直感マキは人気馬より穴馬(10〜20倍あたり)を本命にしやすい', () => {
  const favourite = makeHorse({ number: 1, odds: 1.8, courseFit: 40, speedFigure: 60 });
  const liveLongshot = makeHorse({ number: 2, odds: 15, courseFit: 85, speedFigure: 80 });
  const hopelessLongshot = makeHorse({ number: 3, odds: 95, courseFit: 30, speedFigure: 55 });
  const filler = makeHorse({ number: 4, odds: 40, courseFit: 40, speedFigure: 60 });
  const race = makeRace([favourite, liveLongshot, hopelessLongshot, filler]);

  const picks = computeTipsterPicks(race);
  const kankaku = picks.find((p) => p.tipsterId === 'kankaku');
  assert.equal(kankaku.honmei, 2, '一番人気でも一番人気薄でもなく、狙い目の穴馬を本命に取る');
});
