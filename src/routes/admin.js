const express = require('express');
const db = require('../db');

const router = express.Router();

const ACTIVE_SUB_STATUSES = `('active', 'trialing', 'active_mock')`;
const PAID_ORDER_STATUSES = `('paid', 'paid_mock')`;

// ADMIN_TOKEN による簡易保護
function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN || 'changeme';
  if (token !== expected) {
    return res.status(401).json({ error: '認証に失敗しました。ADMIN_TOKEN を確認してください。' });
  }
  next();
}

function toPercent(numerator, denominator) {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
}

// 簡易マネタイズ統計(リード数・診断数・売上)
router.get('/admin/stats', requireAdmin, (req, res) => {
  const leadCount = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
  const diagnosisCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses').get().c;
  const paidCount = db.prepare('SELECT COUNT(*) AS c FROM diagnoses WHERE paid = 1').get().c;
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ${PAID_ORDER_STATUSES}`)
    .get().total;
  const activeSubscribers = db
    .prepare(`SELECT COUNT(DISTINCT diagnosis_id) AS c FROM subscriptions WHERE status IN ${ACTIVE_SUB_STATUSES}`)
    .get().c;
  const mrr = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE status IN ${ACTIVE_SUB_STATUSES}`)
    .get().total;

  res.json({
    leadCount,
    diagnosisCount,
    paidCount,
    revenueJpy: revenue,
    conversionRatePercent: toPercent(paidCount, diagnosisCount),
    activeSubscribers,
    mrrJpy: mrr,
  });
});

// 期間 [from, to) の各KPIを集計する。from/to は SQLite の datetime 修飾子(例: '-7 days')
function periodMetrics(from, to) {
  const range = `created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`;
  const count = (sql) => db.prepare(sql).get(from, to).c;

  const diagnoses = count(`SELECT COUNT(*) AS c FROM diagnoses WHERE ${range}`);
  const leads = count(`SELECT COUNT(*) AS c FROM leads WHERE ${range}`);
  const reportSales = count(`SELECT COUNT(*) AS c FROM orders WHERE status IN ${PAID_ORDER_STATUSES} AND ${range}`);
  const reportRevenue = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS c FROM orders WHERE status IN ${PAID_ORDER_STATUSES} AND ${range}`)
    .get(from, to).c;
  // 期間内に申し込まれ、決済が完了した(pending のままでない)ものを新規会員とする
  const newSubscribers = count(`SELECT COUNT(*) AS c FROM subscriptions WHERE status != 'pending' AND ${range}`);
  const cancellations = db
    .prepare(
      `SELECT COUNT(*) AS c FROM subscriptions
       WHERE (status = 'canceled' OR cancel_at_period_end = 1)
         AND updated_at >= datetime('now', ?) AND updated_at < datetime('now', ?)`
    )
    .get(from, to).c;

  return {
    diagnoses,
    leads,
    emailOptInRatePercent: toPercent(leads, diagnoses),
    reportSales,
    reportRevenueJpy: reportRevenue,
    newSubscribers,
    cancellations,
    paidConversionRatePercent: toPercent(reportSales + newSubscribers, diagnoses),
  };
}

function changeLabel(current, previous) {
  if (previous === 0) return current > 0 ? '(前週0 → 増加)' : '(前週と同じ)';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `(前週比 ${pct >= 0 ? '+' : ''}${pct}%)`;
}

// 経営判断用の週次レポート: 直近7日と、その前の7日を比較する
router.get('/admin/weekly-report', requireAdmin, (req, res) => {
  const thisWeek = periodMetrics('-7 days', '+1 days');
  const lastWeek = periodMetrics('-14 days', '-7 days');
  const activeSubscribers = db
    .prepare(`SELECT COUNT(DISTINCT diagnosis_id) AS c FROM subscriptions WHERE status IN ${ACTIVE_SUB_STATUSES}`)
    .get().c;
  const mrr = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE status IN ${ACTIVE_SUB_STATUSES}`)
    .get().total;

  const alerts = [];
  if (thisWeek.diagnoses > 0 && thisWeek.emailOptInRatePercent < 30) {
    alerts.push('メール登録率が目標30%を下回っています。診断フォームのメール欄の訴求を見直しましょう。');
  }
  if (thisWeek.diagnoses > 0 && thisWeek.paidConversionRatePercent < 3) {
    alerts.push('有料転換率が目標3%を下回っています。結果ページの会員訴求・価格を検証しましょう。');
  }
  if (activeSubscribers > 0 && thisWeek.cancellations / activeSubscribers > 0.1) {
    alerts.push('今週の解約が会員数の10%を超えています。毎月の吉方位のお届け内容を見直しましょう。');
  }
  if (thisWeek.diagnoses < lastWeek.diagnoses) {
    alerts.push('無料診断数が前週より減っています。SNS投稿・広告の集客を確認しましょう。');
  }

  const summary = [
    '【週次レポート】直近7日間',
    `無料診断: ${thisWeek.diagnoses}件 ${changeLabel(thisWeek.diagnoses, lastWeek.diagnoses)}`,
    `メール登録: ${thisWeek.leads}件(登録率 ${thisWeek.emailOptInRatePercent}%)`,
    `カレンダー買い切り販売: ${thisWeek.reportSales}件 / ¥${thisWeek.reportRevenueJpy.toLocaleString()}`,
    `新規月額会員: ${thisWeek.newSubscribers}人 ${changeLabel(thisWeek.newSubscribers, lastWeek.newSubscribers)} / 解約: ${thisWeek.cancellations}人`,
    `有料転換率: ${thisWeek.paidConversionRatePercent}%`,
    `現在の月額会員: ${activeSubscribers}人 / MRR ¥${mrr.toLocaleString()}`,
    ...(alerts.length ? ['', '▼ 要確認', ...alerts.map((a) => `・${a}`)] : ['', '目標ラインはすべてクリアしています。']),
  ].join('\n');

  res.json({
    generatedAt: new Date().toISOString(),
    thisWeek,
    lastWeek,
    activeSubscribers,
    mrrJpy: mrr,
    alerts,
    summary,
  });
});

module.exports = router;
