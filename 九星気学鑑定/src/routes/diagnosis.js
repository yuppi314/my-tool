const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const content = require('../lib/content');

const router = express.Router();

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

// 無料診断: 生年月日から本命星・KIN・紋章を算出し保存(リード獲得)
router.post('/diagnosis', (req, res) => {
  const { birthdate, name, email } = req.body || {};
  if (!isValidDateStr(birthdate)) {
    return res.status(400).json({ error: 'birthdate は YYYY-MM-DD 形式で指定してください。' });
  }

  const profile = content.computeProfile(birthdate);
  const id = uuidv4();

  db.prepare(
    `INSERT INTO diagnoses (id, birthdate, name, email, honmei_star, kin, paid)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(id, birthdate, name || null, email || null, profile.honmeiId, profile.kin);

  if (email) {
    db.prepare(`INSERT INTO leads (email, name, birthdate) VALUES (?, ?, ?)`).run(email, name || null, birthdate);
  }

  const freeResult = content.buildFreeResult(profile);
  res.json({ id, ...freeResult });
});

// 無料結果の再取得
router.get('/diagnosis/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const profile = content.computeProfile(row.birthdate);
  const freeResult = content.buildFreeResult(profile);
  res.json({ id: row.id, paid: !!row.paid, ...freeResult });
});

// 詳細レポート(有料コンテンツ)
router.get('/diagnosis/:id/full', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!row.paid) {
    return res.status(402).json({ error: 'この詳細レポートは有料です。決済後にご覧いただけます。', diagnosisId: row.id });
  }
  const profile = content.computeProfile(row.birthdate);
  const fullResult = content.buildFullResult(profile);
  res.json({ id: row.id, ...fullResult });
});

module.exports = router;
