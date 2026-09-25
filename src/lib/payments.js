// 決済の設定。STRIPE_SECRET_KEY があれば本番(Stripe)決済、
// MOCK_PAYMENTS=true なら開発用モック(即時に購入済み扱い)、どちらもなければ販売停止(近日公開表示)。
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function isMockPayments() {
  return !process.env.STRIPE_SECRET_KEY && process.env.MOCK_PAYMENTS === 'true';
}

function paymentsEnabled() {
  return !!process.env.STRIPE_SECRET_KEY || isMockPayments();
}

module.exports = { getStripe, isMockPayments, paymentsEnabled };
