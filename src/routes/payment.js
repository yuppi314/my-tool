const express = require('express');
const db = require('../db');
const pricing = require('../lib/pricing');
const { baseUrl, paymentMode } = require('../lib/config');

const router = express.Router();

const REPORT_PRICE_JPY = Number(process.env.REPORT_PRICE_JPY || 980);

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
    // 価格は診断ごとにABテストで確定しているので、レコードの price_jpy を使う
    priceColumn: 'price_jpy',
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

  const target = db.prepare(`SELECT * FROM ${product.table} WHERE id = ?`).get(diagnosisId);
  if (!target) return res.status(404).json({ error: '診断結果が見つかりません。' });

  // 表示された価格と請求額をずらさないため、価格はレコード側を優先する
  const price = product.priceColumn
    ? pricing.resolvePrice(target[product.priceColumn])
    : product.price;

  const mode = paymentMode();

  // 販売準備中(既定): 有料レポートは開放せず、準備中であることを伝える。
  // 決済を用意せず公開したときに、押した全員へ有料レポートを配ってしまうのを防ぐ。
  if (mode === 'comingsoon') {
    return res.status(503).json({
      error: '完全版レポートは近日公開です。公開時にお知らせしますので、メールアドレスをご登録ください。',
      comingSoon: true,
    });
  }

  const stripe = getStripe();

  // モックモード(PAYMENT_MODE=mock): 即時に決済成功として扱う。開発・デモ用。
  if (!stripe) {
    db.prepare(`UPDATE ${product.table} SET paid = 1 WHERE id = ?`).run(diagnosisId);
    db.prepare(
      `INSERT INTO orders (diagnosis_id, kind, stripe_session_id, amount, status)
       VALUES (?, ?, NULL, ?, 'paid_mock')`
    ).run(diagnosisId, productKind, price);
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
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl()}${product.resultPath}?id=${diagnosisId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}${product.resultPath}?id=${diagnosisId}&canceled=1`,
      metadata: { diagnosisId, kind: productKind },
    });

    db.prepare(
      `INSERT INTO orders (diagnosis_id, kind, stripe_session_id, amount, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(diagnosisId, productKind, session.id, price);

    res.json({ mock: false, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: '決済セッションの作成に失敗しました。' });
  }
});

// 決済直後の購入確定(Webhookの取りこぼし・遅延に対する保険)
//
// 本番のStripeでは paid を立てるのは Webhook だが、success_url でユーザーが戻ってきた時点で
// Webhook がまだ届いていないと、支払い済みなのにロック画面が出てしまう。
// そこで success_url から session_id を渡してもらい、Stripe 側の支払い状況を直接確認して
// 購入を確定させる。Webhook が先に届いていた場合は何も変わらない(冪等)。
router.post('/checkout/verify', async (req, res) => {
  const { sessionId } = req.body || {};
  if (typeof sessionId !== 'string' || !sessionId) {
    return res.status(400).json({ error: 'sessionId を指定してください。' });
  }

  const stripe = getStripe();
  // モックモードでは決済時に既に paid を立てているため、確認は不要
  if (!stripe) return res.json({ paid: true, mock: true });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.json({ paid: false });
    }

    const metadata = session.metadata || {};
    const diagnosisId = metadata.diagnosisId;
    const product = getProduct(metadata.kind);
    if (!diagnosisId) return res.json({ paid: false });

    db.prepare(`UPDATE ${product.table} SET paid = 1 WHERE id = ?`).run(diagnosisId);
    db.prepare(`UPDATE orders SET status = 'paid' WHERE stripe_session_id = ?`).run(session.id);
    res.json({ paid: true, diagnosisId });
  } catch (err) {
    console.error('Stripe session verify error:', err.message);
    res.status(502).json({ error: '決済状況の確認に失敗しました。' });
  }
});

// フロントが表示を切り替えるための設定。
// 本音診断はABテストで診断ごとに価格が変わるため、実際の提示価格は
// /api/honne/:id が返す price を使う。ここでは既定価格のみを返す。
router.get('/config', (req, res) => {
  res.json({
    paymentMode: paymentMode(),
    prices: { birth: REPORT_PRICE_JPY, honne: pricing.basePrice() },
  });
});

// 旧エンドポイント(価格のみ)。既存のフロントとの互換用に残している。
router.get('/prices', (req, res) => {
  res.json({ birth: REPORT_PRICE_JPY, honne: pricing.basePrice() });
});

// 販売開始のお知らせ登録。
// 準備中でも見込み客を取り逃がさないための導線で、既存の leads テーブルに貯める。
router.post('/notify', (req, res) => {
  const { email, source } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'メールアドレスの形式をご確認ください。' });
  }
  const label = typeof source === 'string' ? source.slice(0, 40) : null;
  db.prepare('INSERT INTO leads (email, source) VALUES (?, ?)').run(email.trim(), label);
  res.json({ ok: true });
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
