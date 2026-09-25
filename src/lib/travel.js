// 自宅から見た旅先の方位・距離を計算し、吉方位の旅先を選ぶ
const { ORIGINS, DESTINATIONS, MILE_BANDS } = require('../data/places');

// 吉方位旅は一般に自宅から100km以上離れた場所が効果的とされる
const MIN_DISTANCE_KM = 100;
const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// 真北を0度とする方位角(大圏コースの出発方位 = 正距方位図法で見た方位)
function bearingDeg(a, b) {
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 九星気学の方位区分: 東西南北は各30度、四隅(北東・南東・南西・北西)は各60度
function sectorOf(deg) {
  if (deg >= 345 || deg < 15) return '北';
  if (deg < 75) return '北東';
  if (deg < 105) return '東';
  if (deg < 165) return '南東';
  if (deg < 195) return '南';
  if (deg < 255) return '南西';
  if (deg < 285) return '西';
  return '北西';
}

function mileLabel(region, km) {
  return MILE_BANDS.find((b) => b.region === region && km <= b.maxKm).label;
}

function getOrigin(originId) {
  return ORIGINS.find((o) => o.id === originId);
}

function listOrigins() {
  return ORIGINS.map(({ id, name }) => ({ id, name }));
}

// 出発地({ name, lat, lon })から見た全旅先(100km未満は除く)を方位つきで返す。近い順。
function destinationsFrom(origin) {
  return DESTINATIONS.map((dest) => {
    const km = distanceKm(origin, dest);
    return {
      name: dest.name,
      region: dest.region,
      airport: dest.airport,
      hint: dest.hint,
      direction: sectorOf(bearingDeg(origin, dest)),
      distanceKm: Math.round(km),
      miles: mileLabel(dest.region, km),
    };
  })
    .filter((d) => d.distanceKm >= MIN_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// 吉方位にある旅先を、方位ごとに国内の近い順→海外の順で最大 perDirection 件ずつ選ぶ
function recommend(origin, directions, perDirection = Infinity) {
  const all = destinationsFrom(origin);
  const result = [];
  for (const dir of directions) {
    const inDir = all.filter((d) => d.direction === dir);
    const ordered = [...inDir.filter((d) => d.region === 'domestic'), ...inDir.filter((d) => d.region === 'overseas')];
    result.push(...ordered.slice(0, perDirection));
  }
  return result;
}

// 日本国内(離島を含むおおよその範囲)にある座標か
function isInJapan(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 20 && lat <= 46 && lon >= 122 && lon <= 154;
}

module.exports = {
  MIN_DISTANCE_KM,
  distanceKm,
  bearingDeg,
  sectorOf,
  getOrigin,
  listOrigins,
  isInJapan,
  destinationsFrom,
  recommend,
};
