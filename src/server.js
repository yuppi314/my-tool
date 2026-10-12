require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const diagnosisRoutes = require('./routes/diagnosis');
const { router: paymentRoutes, stripeWebhookHandler } = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const { isMockPayments } = require('./lib/payments');
const operator = require('./lib/operator');
const { leadSyncEnabled } = require('./lib/leadSync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Stripe webhook は署名検証のため raw body が必要。express.json() より前に登録する。
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
// 特商法表記などは事業者情報(環境変数)を差し込んで返す
app.use(operator.legalPagesHandler);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', diagnosisRoutes);
app.use('/api', paymentRoutes);
app.use('/api', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`吉方位×マイル旅 診断ツール起動: http://localhost:${PORT}`);
  if (isMockPayments()) {
    console.log('※ MOCK_PAYMENTS=true のため、決済は開発用モックモードで動作します。');
  } else if (!process.env.STRIPE_SECRET_KEY) {
    console.log('※ STRIPE_SECRET_KEY 未設定のため、有料コンテンツの販売は停止中(近日公開表示)です。');
  }
  const missing = operator.missingFields();
  if (missing.length) {
    console.log(`※ 特商法表記などの事業者情報が未設定です(揃うまでStripeでの有料販売は停止します): ${missing.join(', ')}`);
  }
  if (!leadSyncEnabled()) {
    console.log('※ LEADS_WEBHOOK_URL 未設定のため、メール登録はこのサーバーのDBにだけ保存されます(無料プランでは再起動で消えます)。');
  }
});
