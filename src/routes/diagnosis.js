const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const content = require('../lib/content');
const travel = require('../lib/travel');
const { geocode, toOrigin } = require('../lib/geocode');
const { getActiveSubscription, hasPremiumAccess } = require('../lib/access');
const affiliates = require('../data/affiliates');
const { paymentsEnabled } = require('../lib/payments');

const router = express.Router();

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

// 診断フォームの出発地(自宅のある都市)の選択肢
router.get('/origins', (req, res) => {
  res.json({ origins: travel.listOrigins() });
});

// 住所 → 方位の基準にする地点(番地は落とし、座標は約1km単位に丸める)
router.get('/geocode', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length > 100) return res.status(400).json({ error: '住所を入力してください。' });
  try {
    const origin = await geocode(q);
    if (!origin) return res.status(404).json({ error: '住所が見つかりませんでした。市区町村名から入力してみてください。' });
    res.json(origin);
  } catch (err) {
    console.error('geocode error:', err.message);
    res.status(502).json({ error: '住所の検索に失敗しました。時間をおくか、都市の一覧から選んでください。' });
  }
});

// リクエストから出発地を決める: 都市ID(origin) か、住所検索・現在地で得た座標(originLat/originLon)
function resolveOrigin(body) {
  if (body.origin) {
    const city = travel.getOrigin(body.origin);
    return city ? { name: city.name, lat: city.lat, lon: city.lon } : null;
  }
  return toOrigin(body.originLabel, body.originLat, body.originLon);
}

function originOf(row) {
  return { name: row.origin_label, lat: row.origin_lat, lon: row.origin_lon };
}

// 無料診断: 生年月日と出発地から本命星・今月の最大吉方・旅先を算出し保存(リード獲得)
router.post('/diagnosis', (req, res) => {
  const { birthdate, name, email } = req.body || {};
  if (!isValidDateStr(birthdate)) {
    return res.status(400).json({ error: 'birthdate は YYYY-MM-DD 形式で指定してください。' });
  }
  const origin = resolveOrigin(req.body || {});
  if (!origin) {
    return res.status(400).json({ error: 'お住まいの地域を入力してください。' });
  }

  const profile = content.computeProfile(birthdate);
  const id = uuidv4();

  db.prepare(
    `INSERT INTO diagnoses (id, birthdate, name, email, honmei_star, origin_label, origin_lat, origin_lon, paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(id, birthdate, name || null, email || null, profile.honmeiId, origin.name, origin.lat, origin.lon);

  if (email) {
    db.prepare(`INSERT INTO leads (email, name, birthdate) VALUES (?, ?, ?)`).run(email, name || null, birthdate);
  }

  // 結果ページのURLにも本命星と丸めた地点を載せ、DBが消えても(無料プランの再起動など)無料結果を再表示できるようにする
  res.json({ id, s: profile.honmeiId, m: profile.getsumeiId, lat: origin.lat, lon: origin.lon, o: origin.name });
});

// 無料結果: 今月の吉方位と、方位ごとのおすすめ旅先(上位3件)
router.get('/diagnosis/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  const common = { affiliates: affiliates.links.filter((a) => a.url), paymentsEnabled: paymentsEnabled() };

  if (!row) {
    // DBに記録がなくても、URLの本命星(s)と地点(lat/lon/o)があれば無料結果は再計算できる
    const star = Number(req.query.s);
    const origin = toOrigin(req.query.o, req.query.lat, req.query.lon);
    if (!Number.isInteger(star) || star < 1 || star > 9 || !origin) {
      return res.status(404).json({ error: '診断結果が見つかりません。' });
    }
    return res.json({
      id: req.params.id,
      paid: false,
      subscribed: false,
      cancelAtPeriodEnd: false,
      ...common,
      ...content.buildFreeResult(content.profileFromStar(star, Number(req.query.m)), origin),
    });
  }

  const profile = content.computeProfile(row.birthdate);
  const subscription = getActiveSubscription(row.id);
  res.json({
    id: row.id,
    paid: hasPremiumAccess(row),
    subscribed: !!subscription,
    cancelAtPeriodEnd: !!(subscription && subscription.cancel_at_period_end),
    ...common,
    ...content.buildFreeResult(profile, originOf(row)),
  });
});

// 旅の計画: URL の本命星(s)・月命星(m)・地点(lat/lon/o)から計算する(DB には保存しない)
function profileAndOrigin(q) {
  const star = Number(q.s);
  const origin = toOrigin(q.o, q.lat, q.lon);
  if (!Number.isInteger(star) || star < 1 || star > 9 || !origin) return null;
  return { profile: content.profileFromStar(star, Number(q.m)), origin };
}

router.get('/destinations', (req, res) => res.json({ destinations: travel.listDestinations() }));

// 出かける日が決まっている → その日に行くとよい方位と旅先
router.get('/plan/date', (req, res) => {
  const po = profileAndOrigin(req.query);
  if (!po) return res.status(400).json({ error: '診断結果のページから使ってください。' });
  if (!isValidDateStr(req.query.date)) return res.status(400).json({ error: '日付を選んでください。' });
  const [y, m, d] = req.query.date.split('-').map(Number);
  res.json(content.planByDate(po.profile, po.origin, new Date(y, m - 1, d)));
});

// 旅先の一覧から選ぶか、国内の地名を検索して場所を決める
async function findPlace(query) {
  let place = query.dest ? travel.getDestination(String(query.dest)) : null;
  const q = String(query.q || '').trim();
  if (!place && q) {
    if (q.length > 100) return { error: '場所の名前が長すぎます。', status: 400 };
    try {
      const g = await geocode(q);
      if (g) place = { name: q, lat: g.lat, lon: g.lon };
    } catch (err) {
      console.error('geocode error:', err.message);
      return { error: '場所の検索に失敗しました。一覧から選ぶか、時間をおいて試してください。', status: 502 };
    }
  }
  if (!place) return { error: '場所が見つかりませんでした。市区町村名や観光地の名前で試してください。', status: 404 };
  return { place };
}

// 行きたい場所がある → いつ行くとよいか
router.get('/plan/place', async (req, res) => {
  const po = profileAndOrigin(req.query);
  if (!po) return res.status(400).json({ error: '診断結果のページから使ってください。' });
  const f = await findPlace(req.query);
  if (f.error) return res.status(f.status).json({ error: f.error });
  res.json(content.planByPlace(po.profile, po.origin, f.place));
});

// 日にちと行き先が決まっている → その旅の吉凶と、旅先でやるといいこと
router.get('/plan/trip', async (req, res) => {
  const po = profileAndOrigin(req.query);
  if (!po) return res.status(400).json({ error: '診断結果のページから使ってください。' });
  if (!isValidDateStr(req.query.date)) return res.status(400).json({ error: '出かける日を選んでください。' });
  const f = await findPlace(req.query);
  if (f.error) return res.status(f.status).json({ error: f.error });
  const [y, m, d] = req.query.date.split('-').map(Number);
  res.json(content.planTrip(po.profile, po.origin, f.place, new Date(y, m - 1, d)));
});

// 12ヶ月の吉方位カレンダー(有料会員限定)
router.get('/diagnosis/:id/calendar', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!hasPremiumAccess(row)) {
    return res.status(402).json({ error: '吉方位カレンダーは月額会員限定です。', diagnosisId: row.id });
  }
  const profile = content.computeProfile(row.birthdate);
  res.json({ id: row.id, ...content.buildCalendar(profile, originOf(row)) });
});

module.exports = router;
