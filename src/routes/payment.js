const express = require('express');
const db = require('../db');
const { getActiveSubscription } = require('../lib/access');

const router = express.Router();

const REPORT_PRICE_JPY = Number(process.env.REPORT_PRICE_JPY || 980);
const SUBSCRIPTION_PRICE_JPY = Number(process.env.SUBSCRIPTION_PRICE_JPY || 480);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// 詳細レポートの決済セッションを作成
router.post('/checkout', async (req, res) => {
  const { diagnosisId } = req.body || {};
  const diagnosis = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(diagnosisId);
  if (!diagnosis) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const stripe = getStripe();

  // STRIPE_SECRET_KEY 未設定時は開発用モックモード: 即時に決済成功として扱う
  if (!stripe) {
    db.prepare('UPDATE diagnoses SET paid = 1 WHERE id = ?').run(diagnosisId);
    db.prepare(
      `INSERT INTO orders (diagnosis_id, stripe_session_id, amount, status) VALUES (?, NULL, ?, 'paid_mock')`
    ).run(diagnosisId, REPORT_PRICE_JPY);
    return res.json({
      mock: true,
      redirect: `/result.html?id=${diagnosisId}&mock=1`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: '九星気学×マヤ暦 詳細鑑定レポート' },
            unit_amount: REPORT_PRICE_JPY,
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/result.html?id=${diagnosisId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/result.html?id=${diagnosisId}&canceled=1`,
      metadata: { diagnosisId },
    });

    db.prepare(
      `INSERT INTO orders (diagnosis_id, stripe_session_id, amount, status) VALUES (?, ?, ?, 'pending')`
    ).run(diagnosisId, session.id, REPORT_PRICE_JPY);

    res.json({ mock: false, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: '決済セッションの作成に失敗しました。' });
  }
});

// 月額会員(毎日の運勢)の決済セッションを作成
router.post('/subscribe', async (req, res) => {
  const { diagnosisId } = req.body || {};
  const diagnosis = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(diagnosisId);
  if (!diagnosis) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (getActiveSubscription(diagnosisId)) {
    return res.status(409).json({ error: 'すでに月額会員に登録済みです。' });
  }

  const stripe = getStripe();

  if (!stripe) {
    db.prepare(
      `INSERT INTO subscriptions (diagnosis_id, amount, status) VALUES (?, ?, 'active_mock')`
    ).run(diagnosisId, SUBSCRIPTION_PRICE_JPY);
    return res.json({
      mock: true,
      redirect: `/result.html?id=${diagnosisId}&mock=1`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: '九星気学×マヤ暦 毎日の運勢(月額会員)' },
            unit_amount: SUBSCRIPTION_PRICE_JPY,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/result.html?id=${diagnosisId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/result.html?id=${diagnosisId}&canceled=1`,
      metadata: { diagnosisId, kind: 'subscription' },
      subscription_data: { metadata: { diagnosisId } },
    });

    db.prepare(
      `INSERT INTO subscriptions (diagnosis_id, stripe_session_id, amount, status) VALUES (?, ?, ?, 'pending')`
    ).run(diagnosisId, session.id, SUBSCRIPTION_PRICE_JPY);

    res.json({ mock: false, url: session.url });
  } catch (err) {
    console.error('Stripe subscription checkout error:', err.message);
    res.status(500).json({ error: '決済セッションの作成に失敗しました。' });
  }
});

// 月額会員の解約: Stripe では期間末で解約(それまでは閲覧可能)、モックでは即時解約
router.post('/subscription/cancel', async (req, res) => {
  const { diagnosisId } = req.body || {};
  const subscription = getActiveSubscription(diagnosisId);
  if (!subscription) return res.status(404).json({ error: '有効な月額会員登録が見つかりません。' });

  const stripe = getStripe();

  if (!stripe || !subscription.stripe_subscription_id) {
    db.prepare(
      `UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE id = ?`
    ).run(subscription.id);
    return res.json({ canceled: true, immediate: true });
  }

  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });
    db.prepare(
      `UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now') WHERE id = ?`
    ).run(subscription.id);
    res.json({ canceled: true, immediate: false });
  } catch (err) {
    console.error('Stripe subscription cancel error:', err.message);
    res.status(500).json({ error: '解約処理に失敗しました。時間をおいて再度お試しください。' });
  }
});

// Stripe Webhook: raw body で検証するため server.js 側で express.raw() を適用して呼び出す
function stripeWebhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(200).send('mock mode: webhook not used');

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
    const session = event.data.object;
    db.prepare(
      `UPDATE subscriptions SET status = 'active', stripe_subscription_id = ?, updated_at = datetime('now')
       WHERE stripe_session_id = ?`
    ).run(session.subscription, session.id);
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const diagnosisId = session.metadata && session.metadata.diagnosisId;
    if (diagnosisId) {
      db.prepare('UPDATE diagnoses SET paid = 1 WHERE id = ?').run(diagnosisId);
      db.prepare(
        `UPDATE orders SET status = 'paid' WHERE stripe_session_id = ?`
      ).run(session.id);
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
    db.prepare(
      `UPDATE subscriptions SET status = ?, cancel_at_period_end = ?, updated_at = datetime('now')
       WHERE stripe_subscription_id = ?`
    ).run(status, sub.cancel_at_period_end ? 1 : 0, sub.id);
  }

  res.json({ received: true });
}

module.exports = { router, stripeWebhookHandler };
