const test = require('node:test');
const assert = require('node:assert/strict');
const raceStore = require('../src/lib/raceStore');

test('listMeta: 日付と競馬場の一覧を返す', () => {
  const meta = raceStore.listMeta();
  assert.ok(meta.dates.length > 0);
  assert.ok(meta.venuesByCategory.central.length > 0);
});

test('listRaces: 条件で絞り込める', () => {
  const meta = raceStore.listMeta();
  const date = meta.dates[0];
  const venue = meta.venuesByCategory.central[0];
  const races = raceStore.listRaces({ date, category: 'central', venue });
  assert.ok(races.length > 0);
  for (const r of races) {
    assert.equal(r.date, date);
    assert.equal(r.venue, venue);
  }
});

test('listRaces: レース番号でも絞り込める', () => {
  const all = raceStore.listRaces({});
  const target = all[0];
  const filtered = raceStore.listRaces({
    date: target.date, category: target.category, venue: target.venue, raceNumber: target.raceNumber
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, target.id);
});

test('listRaces: 各レースの要約に◎の馬とオッズが含まれる(計算済み)', () => {
  const races = raceStore.listRaces({});
  for (const r of races) {
    assert.ok(r.honmeiHorse, `${r.id} に◎が付いていない`);
    assert.ok(typeof r.honmeiHorse.odds === 'number');
    assert.equal(typeof r.tipstersAgreeOnHonmei, 'boolean');
  }
});

test('getRaceById: 存在するIDなら出走馬と予想家3人分のデータが付く', () => {
  const all = raceStore.listRaces({});
  const race = raceStore.getRaceById(all[0].id);
  assert.ok(race);
  assert.ok(race.horses.length > 0);
  assert.equal(race.tipsterPicks.length, 3);
});

test('getRaceById: 存在しないIDはnull', () => {
  assert.equal(raceStore.getRaceById('存在しないid'), null);
});
