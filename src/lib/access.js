// 有料コンテンツの閲覧権限判定
const db = require('../db');

// 月額会員(毎日の運勢)として有効なサブスクリプションを返す
function getActiveSubscription(diagnosisId) {
  return db
    .prepare(
      `SELECT * FROM subscriptions WHERE diagnosis_id = ? AND status IN ('active', 'trialing', 'active_mock')
       ORDER BY id DESC LIMIT 1`
    )
    .get(diagnosisId);
}

// 詳細レポート・相性診断は「単発購入」または「月額会員」のどちらでも閲覧可能
function hasPremiumAccess(diagnosis) {
  return !!diagnosis.paid || !!getActiveSubscription(diagnosis.id);
}

module.exports = { getActiveSubscription, hasPremiumAccess };
