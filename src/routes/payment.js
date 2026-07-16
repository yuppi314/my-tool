const express = require('express');
const db = require('../db');

const router = express.Router();

const PLAN_PRICE_JPY = Number(process.env.PLAN_PRICE_JPY || 980);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// 4週間ダイエットプランの決済セッションを作成
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
    ).run(diagnosisId, PLAN_PRICE_JPY);
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
            product_data: { name: '1ヶ月-3kgダイエット 4週間プログラム' },
            unit_amount: PLAN_PRICE_JPY,
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
    ).run(diagnosisId, session.id, PLAN_PRICE_JPY);

    res.json({ mock: false, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: '決済セッションの作成に失敗しました。' });
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const diagnosisId = session.metadata && session.metadata.diagnosisId;
    if (diagnosisId) {
      db.prepare('UPDATE diagnoses SET paid = 1 WHERE id = ?').run(diagnosisId);
      db.prepare(
        `UPDATE orders SET status = 'paid' WHERE stripe_session_id = ?`
      ).run(session.id);
    }
  }

  res.json({ received: true });
}

module.exports = { router, stripeWebhookHandler };
