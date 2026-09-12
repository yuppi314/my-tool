const express = require('express');
const db = require('../db');

const router = express.Router();

const REPORT_PRICE_JPY = Number(process.env.REPORT_PRICE_JPY || 980);
const HONNE_PRICE_JPY = Number(process.env.HONNE_PRICE_JPY || 980);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 販売商品の定義。kind ごとに参照するテーブルと戻り先ページを切り替える。
// table 名はこの固定マップ由来のみを使うため、SQLへの動的埋め込みでも安全。
const PRODUCTS = {
  birth: {
    table: 'diagnoses',
    productName: '九星気学×マヤ暦 詳細鑑定レポート',
    price: REPORT_PRICE_JPY,
    resultPath: '/result.html',
  },
  honne: {
    table: 'honne_results',
    productName: '本音診断 完全版レポート',
    price: HONNE_PRICE_JPY,
    resultPath: '/honne-result.html',
  },
};

function getProduct(kind) {
  return PRODUCTS[kind] || PRODUCTS.birth;
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// 詳細レポートの決済セッションを作成(kind: 'birth' = 生年月日診断 / 'honne' = 本音診断)
router.post('/checkout', async (req, res) => {
  const { diagnosisId, kind } = req.body || {};
  const productKind = PRODUCTS[kind] ? kind : 'birth';
  const product = getProduct(productKind);

  const target = db.prepare(`SELECT id FROM ${product.table} WHERE id = ?`).get(diagnosisId);
  if (!target) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const stripe = getStripe();

  // STRIPE_SECRET_KEY 未設定時は開発用モックモード: 即時に決済成功として扱う
  if (!stripe) {
    db.prepare(`UPDATE ${product.table} SET paid = 1 WHERE id = ?`).run(diagnosisId);
    db.prepare(
      `INSERT INTO orders (diagnosis_id, kind, stripe_session_id, amount, status)
       VALUES (?, ?, NULL, ?, 'paid_mock')`
    ).run(diagnosisId, productKind, product.price);
    return res.json({
      mock: true,
      redirect: `${product.resultPath}?id=${diagnosisId}&mock=1`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: product.productName },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}${product.resultPath}?id=${diagnosisId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}${product.resultPath}?id=${diagnosisId}&canceled=1`,
      metadata: { diagnosisId, kind: productKind },
    });

    db.prepare(
      `INSERT INTO orders (diagnosis_id, kind, stripe_session_id, amount, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(diagnosisId, productKind, session.id, product.price);

    res.json({ mock: false, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: '決済セッションの作成に失敗しました。' });
  }
});

// 価格表示用(フロントのCTA文言と実際の請求額をずらさないため)
router.get('/prices', (req, res) => {
  res.json({ birth: REPORT_PRICE_JPY, honne: HONNE_PRICE_JPY });
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
    const metadata = session.metadata || {};
    const diagnosisId = metadata.diagnosisId;
    const product = getProduct(metadata.kind);
    if (diagnosisId) {
      db.prepare(`UPDATE ${product.table} SET paid = 1 WHERE id = ?`).run(diagnosisId);
      db.prepare(`UPDATE orders SET status = 'paid' WHERE stripe_session_id = ?`).run(session.id);
    }
  }

  res.json({ received: true });
}

module.exports = { router, stripeWebhookHandler };
