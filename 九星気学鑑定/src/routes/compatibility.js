const express = require('express');
const db = require('../db');
const content = require('../lib/content');
const { buildCompatibility } = require('../lib/compatibility');

const router = express.Router();

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

// 相性診断は有料会員向けの追加特典
router.post('/compatibility', (req, res) => {
  const { diagnosisId, partnerBirthdate } = req.body || {};
  const diagnosis = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(diagnosisId);
  if (!diagnosis) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!diagnosis.paid) {
    return res.status(402).json({ error: '相性診断は詳細レポート購入者限定の機能です。', diagnosisId });
  }
  if (!isValidDateStr(partnerBirthdate)) {
    return res.status(400).json({ error: 'partnerBirthdate は YYYY-MM-DD 形式で指定してください。' });
  }

  const profileA = content.computeProfile(diagnosis.birthdate);
  const profileB = content.computeProfile(partnerBirthdate);
  const result = buildCompatibility(profileA, profileB);

  res.json({
    you: content.buildFreeResult(profileA),
    partner: content.buildFreeResult(profileB),
    compatibility: result,
  });
});

module.exports = router;
