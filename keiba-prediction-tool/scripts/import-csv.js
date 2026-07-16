// 実データ(またはJV-Linkで書き出したCSVを変換したもの)を取り込むスクリプト。
// data-import/races.csv と data-import/horses.csv を読み込んで、
// src/data/sample-races.json と同じ形のJSONを組み立てて書き出す。
//
// 使い方: npm run import-data
//   (または: node scripts/import-csv.js <races.csv> <horses.csv> [出力先]))
const fs = require('fs');
const path = require('path');

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (cells[i] || '').trim(); });
    return row;
  });
}

// 最低限のCSV分割(ダブルクォート囲み・カンマ区切りに対応)
function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cells.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function raceKey(r) { return [r.date, r.venue, r.raceNumber].join('|'); }

function toNumberOrNull(v) {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function buildRaces(raceRows, horseRows) {
  const horsesByRace = {};
  for (const h of horseRows) {
    const key = [h.date, h.venue, h.raceNumber].join('|');
    horsesByRace[key] = horsesByRace[key] || [];
    horsesByRace[key].push({
      number: Number(h.number),
      waku: Number(h.waku),
      name: h.name,
      sex: h.sex,
      age: Number(h.age),
      jockey: h.jockey,
      odds: Number(h.odds),
      oddsMove: h.oddsMove ? h.oddsMove : null,
      recentFinishes: h.recentFinishes ? h.recentFinishes.split('|').map(Number) : [],
      jockeyWinRatePct: toNumberOrNull(h.jockeyWinRatePct),
      speedFigure: toNumberOrNull(h.speedFigure),
      courseFit: toNumberOrNull(h.courseFit),
      restDaysSinceLast: toNumberOrNull(h.restDaysSinceLast)
    });
  }

  return raceRows.map((r) => {
    const horses = (horsesByRace[raceKey(r)] || []).sort((a, b) => a.number - b.number);
    return {
      id: `${r.date}-${r.venue}-${r.raceNumber}`,
      date: r.date,
      category: r.category || 'central',
      venue: r.venue,
      raceNumber: Number(r.raceNumber),
      name: r.name,
      surface: r.surface,
      distanceM: Number(r.distanceM),
      postTime: r.postTime,
      weather: r.weather,
      trackCondition: r.trackCondition,
      paceNote: r.paceNote || '',
      headcount: horses.length,
      horses
    };
  });
}

function main() {
  const [, , racesArg, horsesArg, outArg] = process.argv;
  const racesPath = racesArg || path.join(__dirname, '..', 'data-import', 'races.csv');
  const horsesPath = horsesArg || path.join(__dirname, '..', 'data-import', 'horses.csv');
  const outPath = outArg || path.join(__dirname, '..', 'src', 'data', 'sample-races.json');

  if (!fs.existsSync(racesPath) || !fs.existsSync(horsesPath)) {
    console.error('CSVが見つかりません:', racesPath, horsesPath);
    console.error('data-import/races.example.csv と horses.example.csv を参考に用意してください。');
    process.exit(1);
  }

  const raceRows = parseCsv(fs.readFileSync(racesPath, 'utf8'));
  const horseRows = parseCsv(fs.readFileSync(horsesPath, 'utf8'));
  const races = buildRaces(raceRows, horseRows);

  const missing = races.filter((r) => r.horses.length === 0);
  if (missing.length > 0) {
    console.warn('警告: 出走馬が1頭も見つからないレースがあります:', missing.map((r) => r.id));
  }

  fs.writeFileSync(outPath, JSON.stringify(races, null, 2) + '\n', 'utf8');
  console.log(`${races.length}レース分を書き出しました: ${outPath}`);
}

main();
