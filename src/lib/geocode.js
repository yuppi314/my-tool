// 住所から緯度経度を求める(国土地理院の住所検索API)。
// プライバシー保護のため、保存・表示には番地を落とした地名と、約1km単位に丸めた座標だけを使う。
const { isInJapan } = require('./travel');

const GSI_ENDPOINT = 'https://msearch.gsi.go.jp/address-search/AddressSearch';
const TIMEOUT_MS = 8000;

// 座標を小数第2位(約1km)に丸める。方位の判定には十分な精度で、自宅の特定はできない粒度
function roundCoord(value) {
  return Math.round(value * 100) / 100;
}

// 「東京都八王子市元本郷町3丁目24-1」→「東京都八王子市元本郷町」のように、最初の数字以降(番地・丁目)を落とす
function toPlaceLabel(address) {
  const label = String(address).replace(/[0-9０-９一二三四五六七八九十]+丁目.*$/, '').replace(/[0-9０-９].*$/, '').trim();
  return label || String(address).trim();
}

// origin として使える形({ name, lat, lon })に整える。国外や不正な座標は null
function toOrigin(name, lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!isInJapan(la, lo)) return null;
  return { name: toPlaceLabel(name || 'ご自宅'), lat: roundCoord(la), lon: roundCoord(lo) };
}

async function geocode(query, fetchImpl = fetch) {
  const url = `${GSI_ENDPOINT}?q=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`住所検索APIがエラーを返しました(${res.status})`);
  const features = await res.json();
  if (!Array.isArray(features) || !features.length) return null;
  const [lon, lat] = features[0].geometry.coordinates;
  return toOrigin(features[0].properties.title, lat, lon);
}

module.exports = { geocode, toOrigin, toPlaceLabel, roundCoord };
