const express = require('express');
const db = require('../db');
const pricing = require('../lib/pricing');
const { paymentMode } = require('../lib/config');

const router = express.Router();

// 簡易マネタイズ統計(リード数・診断数・売上)。ADMIN_TOKEN による簡易保護。
router.get('/admin/stats', (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN || 'changeme';
  if (token !== expected) {
    return res.status(401).json({ error: '認証に失敗しました。ADMIN_TOKEN を確認してください。' });
  }

  const basePrice = pricing.basePrice();
  const leadCount = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
  // どの導線からメールを獲得できているか(honne-comingsoon は販売前のお知らせ登録)
  const leadSources = db
    .prepare(`SELECT COALESCE(source, '(不明)') AS source, COUNT(*) AS c FROM leads GROUP BY COALESCE(source, '(不明)') ORDER BY c DESC`)
    .all();
  const diagnosisCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses').get().c;
  const paidCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses WHERE paid = 1').get().c;
  const honneCount = db.prepare('SELECT COUNT(*) AS c FROM honne_results').get().c;
  const honnePaidCount = db.prepare('SELECT COUNT(*) AS c FROM honne_results WHERE paid = 1').get().c;
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ('paid', 'paid_mock')`)
    .get().total;
  const conversionRate = diagnosisCount > 0 ? ((paidCount / diagnosisCount) * 100).toFixed(1) : '0.0';
  const honneConversionRate = honneCount > 0 ? ((honnePaidCount / honneCount) * 100).toFixed(1) : '0.0';

  // 本音診断でどのタイプが多いかは、追加コンテンツや広告文の改善に使える
  const honneTypeBreakdown = db
    .prepare('SELECT type_id, COUNT(*) AS c FROM honne_results GROUP BY type_id ORDER BY c DESC')
    .all();

  // 価格ABテストの結果。売上は「診断数 × CVR × 価格」で決まるので、
  // CVRが下がっても売上が伸びる価格がありうる。判断はこの売上列で行う。
  const honnePriceTest = db
    .prepare(
      `SELECT COALESCE(price_jpy, ?) AS price,
              COUNT(*) AS diagnoses,
              SUM(paid) AS purchases,
              SUM(paid) * COALESCE(price_jpy, ?) AS revenue
       FROM honne_results
       GROUP BY COALESCE(price_jpy, ?)
       ORDER BY price`
    )
    .all(basePrice, basePrice, basePrice)
    .map((row) => ({
      ...row,
      conversionRatePercent: row.diagnoses > 0 ? Number(((row.purchases / row.diagnoses) * 100).toFixed(1)) : 0,
    }));

  res.json({
    leadCount,
    diagnosisCount,
    paidCount,
    revenueJpy: revenue,
    conversionRatePercent: Number(conversionRate),
    honneCount,
    honnePaidCount,
    honneConversionRatePercent: Number(honneConversionRate),
    honneTypeBreakdown,
    honnePriceTest,
    honnePriceVariants: pricing.variants(),
    leadSources,
    paymentMode: paymentMode(),
  });
});

module.exports = router;
