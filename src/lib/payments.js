// 決済の設定。STRIPE_SECRET_KEY があり事業者情報(特商法表記)が揃っていれば本番(Stripe)決済、
// MOCK_PAYMENTS=true なら開発用モック(即時に購入済み扱い)、どちらもなければ販売停止(近日公開表示)。
const { missingFields } = require('./operator');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function isMockPayments() {
  return !process.env.STRIPE_SECRET_KEY && process.env.MOCK_PAYMENTS === 'true';
}

// 特商法表記が空欄のまま販売すると法令違反になるため、事業者情報が揃うまで新規の申し込みは受け付けない
function paymentsEnabled() {
  return (!!process.env.STRIPE_SECRET_KEY && missingFields().length === 0) || isMockPayments();
}

module.exports = { getStripe, isMockPayments, paymentsEnabled };
