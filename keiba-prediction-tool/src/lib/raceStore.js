const races = require('../data/sample-races.json');
const { computeOverallMarks, computeTipsterPicks } = require('./scoring');

function withPredictions(race) {
  const overallMarks = computeOverallMarks(race);
  const tipsterPicks = computeTipsterPicks(race);
  return {
    ...race,
    horses: race.horses.map((h) => ({ ...h, overallMark: overallMarks[h.number] || null })),
    tipsterPicks
  };
}

function listRaces({ date, category, venue, raceNumber } = {}) {
  return races
    .filter((r) => !date || r.date === date)
    .filter((r) => !category || r.category === category)
    .filter((r) => !venue || r.venue === venue)
    .filter((r) => !raceNumber || r.raceNumber === Number(raceNumber))
    .map((r) => withPredictions(r))
    .map(toSummary)
    .sort((a, b) => a.postTime.localeCompare(b.postTime));
}

function getRaceById(id) {
  const race = races.find((r) => r.id === id);
  return race ? withPredictions(race) : null;
}

function listMeta() {
  const dates = [...new Set(races.map((r) => r.date))].sort();
  const byCategory = {};
  for (const r of races) {
    byCategory[r.category] = byCategory[r.category] || new Set();
    byCategory[r.category].add(r.venue);
  }
  const venuesByCategory = {};
  for (const [category, venueSet] of Object.entries(byCategory)) {
    venuesByCategory[category] = [...venueSet].sort();
  }
  return { dates, venuesByCategory };
}

function toSummary(race) {
  const topPicks = race.tipsterPicks.map((p) => p.honmei);
  const honmeiHorse = race.horses.find((h) => h.overallMark === '◎');
  return {
    id: race.id,
    date: race.date,
    category: race.category,
    venue: race.venue,
    raceNumber: race.raceNumber,
    name: race.name,
    surface: race.surface,
    distanceM: race.distanceM,
    postTime: race.postTime,
    headcount: race.headcount,
    honmeiHorse: honmeiHorse ? { number: honmeiHorse.number, name: honmeiHorse.name, odds: honmeiHorse.odds } : null,
    tipstersAgreeOnHonmei: new Set(topPicks).size === 1
  };
}

module.exports = { listRaces, getRaceById, listMeta };
