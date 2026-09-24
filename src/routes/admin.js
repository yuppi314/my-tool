const express = require('express');
const db = require('../db');

const router = express.Router();

// 簡易マネタイズ統計(リード数・診断数・売上)。ADMIN_TOKEN による簡易保護。
router.get('/admin/stats', (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN || 'changeme';
  if (token !== expected) {
    return res.status(401).json({ error: '認証に失敗しました。ADMIN_TOKEN を確認してください。' });
  }

  const leadCount = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
  const diagnosisCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses').get().c;
  const paidCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses WHERE paid = 1').get().c;
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ('paid', 'paid_mock')`)
    .get().total;
  const activeSubscribers = db
    .prepare(`SELECT COUNT(DISTINCT diagnosis_id) AS c FROM subscriptions WHERE status IN ('active', 'trialing', 'active_mock')`)
    .get().c;
  const mrr = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE status IN ('active', 'trialing', 'active_mock')`)
    .get().total;
  const conversionRate = diagnosisCount > 0 ? ((paidCount / diagnosisCount) * 100).toFixed(1) : '0.0';

  res.json({
    leadCount,
    diagnosisCount,
    paidCount,
    revenueJpy: revenue,
    conversionRatePercent: Number(conversionRate),
    activeSubscribers,
    mrrJpy: mrr,
  });
});

module.exports = router;
