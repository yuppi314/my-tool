const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const content = require('../lib/content');
const travel = require('../lib/travel');
const { getActiveSubscription, hasPremiumAccess } = require('../lib/access');
const affiliates = require('../data/affiliates');

const router = express.Router();

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

// 診断フォームの出発地(自宅のある都市)の選択肢
router.get('/origins', (req, res) => {
  res.json({ origins: travel.listOrigins() });
});

// 無料診断: 生年月日と出発地から本命星・今月の最大吉方・旅先を算出し保存(リード獲得)
router.post('/diagnosis', (req, res) => {
  const { birthdate, origin, name, email } = req.body || {};
  if (!isValidDateStr(birthdate)) {
    return res.status(400).json({ error: 'birthdate は YYYY-MM-DD 形式で指定してください。' });
  }
  if (!travel.getOrigin(origin)) {
    return res.status(400).json({ error: 'お住まいの地域を選択してください。' });
  }

  const profile = content.computeProfile(birthdate);
  const id = uuidv4();

  db.prepare(
    `INSERT INTO diagnoses (id, birthdate, name, email, honmei_star, origin, paid)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(id, birthdate, name || null, email || null, profile.honmeiId, origin);

  if (email) {
    db.prepare(`INSERT INTO leads (email, name, birthdate) VALUES (?, ?, ?)`).run(email, name || null, birthdate);
  }

  res.json({ id });
});

// 無料結果: 今月の吉方位と、方位ごとのおすすめ旅先(上位3件)
router.get('/diagnosis/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const profile = content.computeProfile(row.birthdate);
  const subscription = getActiveSubscription(row.id);
  res.json({
    id: row.id,
    paid: hasPremiumAccess(row),
    subscribed: !!subscription,
    cancelAtPeriodEnd: !!(subscription && subscription.cancel_at_period_end),
    affiliates: affiliates.filter((a) => a.url),
    ...content.buildFreeResult(profile, row.origin),
  });
});

// 12ヶ月の吉方位カレンダー(有料会員限定)
router.get('/diagnosis/:id/calendar', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!hasPremiumAccess(row)) {
    return res.status(402).json({ error: '吉方位カレンダーは月額会員限定です。', diagnosisId: row.id });
  }
  const profile = content.computeProfile(row.birthdate);
  res.json({ id: row.id, ...content.buildCalendar(profile, row.origin) });
});

module.exports = router;
