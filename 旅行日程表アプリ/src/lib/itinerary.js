const { findAirportAccess } = require('../data/airportBuses');

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(normalized / 60);
  const nm = normalized % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function timeFromDateTime(datetime) {
  if (!datetime) return null;
  const [, time] = datetime.split('T');
  return time ? time.slice(0, 5) : null;
}

function dateFromDateTime(datetime) {
  if (!datetime) return null;
  const [date] = datetime.split('T');
  return date || null;
}

function addDaysToDate(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildArrivalItems(arrival) {
  const items = [];
  if (!arrival || arrival.type === 'none' || !arrival.datetime) {
    return { items, nextFreeTime: '10:00' };
  }

  const arrivalTime = timeFromDateTime(arrival.datetime) || '10:00';
  const label = arrival.type === 'flight' ? '飛行機で到着' : '新幹線で到着';
  items.push({
    time: arrivalTime,
    type: 'transport',
    title: `${label}${arrival.airport ? `(${arrival.airport})` : ''}`,
    note: '実際の到着時刻に合わせて調整してください'
  });

  let nextTime = addMinutes(arrivalTime, 20);
  const access = findAirportAccess(arrival.airport);
  if (arrival.type === 'flight' && access) {
    const best = access.options[0];
    items.push({
      time: nextTime,
      type: 'transport',
      title: `${best.method}で${access.cityCenter}方面へ移動(約${best.durationMin}分)`,
      note: best.note + ' / 他の選択肢: ' + access.options.slice(1).map((o) => `${o.method}(約${o.durationMin}分)`).join('、')
    });
    nextTime = addMinutes(nextTime, best.durationMin);
  }

  return { items, nextFreeTime: addMinutes(nextTime, 15) };
}

function buildDepartureItems(departure) {
  const items = [];
  if (!departure || departure.type === 'none' || !departure.datetime) {
    return { items, dayEndsBy: '21:00' };
  }

  const departureTime = timeFromDateTime(departure.datetime) || '18:00';
  const bufferMin = departure.type === 'flight' ? 120 : 30;
  const access = findAirportAccess(departure.airport);
  let accessDuration = 45;
  let accessLine = null;
  if (departure.type === 'flight' && access) {
    const best = access.options[0];
    accessDuration = best.durationMin;
    accessLine = `${best.method}で${departure.airport || access.airport}へ移動(約${best.durationMin}分)`;
  }

  const leaveTime = addMinutes(departureTime, -(bufferMin + accessDuration));
  if (accessLine) {
    items.push({ time: leaveTime, type: 'transport', title: accessLine, note: '空港には出発時刻の目安として2時間前到着を想定しています' });
  }
  items.push({
    time: departureTime,
    type: 'transport',
    title: departure.type === 'flight' ? '飛行機で出発' : '新幹線で出発',
    note: '実際の出発時刻に合わせて調整してください'
  });

  return { items, dayEndsBy: leaveTime };
}

function gourmetSlot(time, mealName, genre) {
  return {
    time,
    type: 'gourmet',
    title: mealName,
    note: 'グルメ欄からお店を選んでください',
    genreQuery: genre || ''
  };
}

function freeSlot(time, title) {
  return { time, type: 'free', title, note: '' };
}

function buildFullDayItems(genre, isFirstDay, startTime, dayEndsBy) {
  const items = [];
  let t = startTime;

  if (t < '12:00') {
    items.push(freeSlot(t, isFirstDay ? '周辺の観光・散策' : '午前の観光'));
    items.push(gourmetSlot('12:00', 'ランチ', genre));
    t = '13:30';
  }
  if (!dayEndsBy || dayEndsBy > '13:30') {
    items.push(freeSlot(t, '午後の観光'));
  }
  if (!dayEndsBy || dayEndsBy > '18:30') {
    items.push(gourmetSlot('18:30', 'ディナー', genre));
    items.push(freeSlot('20:00', '夜の自由時間'));
  }
  return items;
}

function generateItinerary({ destination, days, arrival, departure, gourmetGenre }) {
  const numDays = Math.max(1, Math.min(30, Number(days) || 1));
  const startDate = dateFromDateTime(arrival && arrival.datetime);

  const result = [];

  for (let dayIndex = 1; dayIndex <= numDays; dayIndex += 1) {
    const isFirstDay = dayIndex === 1;
    const isLastDay = dayIndex === numDays;
    let items = [];
    let date = startDate ? addDaysToDate(startDate, dayIndex - 1) : null;

    if (isFirstDay) {
      const { items: arrivalItems, nextFreeTime } = buildArrivalItems(arrival);
      items = items.concat(arrivalItems);
      if (isLastDay) {
        const { items: departureItems, dayEndsBy } = buildDepartureItems(departure);
        items = items.concat(buildFullDayItems(gourmetGenre, true, nextFreeTime, dayEndsBy));
        items = items.concat(departureItems);
      } else {
        items = items.concat(buildFullDayItems(gourmetGenre, true, nextFreeTime, null));
      }
    } else if (isLastDay) {
      const { items: departureItems, dayEndsBy } = buildDepartureItems(departure);
      items = items.concat(buildFullDayItems(gourmetGenre, false, '09:00', dayEndsBy));
      items = items.concat(departureItems);
    } else {
      items = buildFullDayItems(gourmetGenre, false, '09:00', null);
    }

    result.push({ day: dayIndex, date, items: items.sort((a, b) => (a.time > b.time ? 1 : -1)) });
  }

  return { destination, days: numDays, itinerary: result };
}

module.exports = { generateItinerary };
