require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const diagnosisRoutes = require('./routes/diagnosis');
const { router: paymentRoutes, stripeWebhookHandler } = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const { isMockPayments, paymentsEnabled } = require('./lib/payments');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Stripe webhook は署名検証のため raw body が必要。express.json() より前に登録する。
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', diagnosisRoutes);
app.use('/api', paymentRoutes);
app.use('/api', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`吉方位×マイル旅 診断ツール起動: http://localhost:${PORT}`);
  if (isMockPayments()) {
    console.log('※ MOCK_PAYMENTS=true のため、決済は開発用モックモードで動作します。');
  } else if (!paymentsEnabled()) {
    console.log('※ STRIPE_SECRET_KEY 未設定のため、有料コンテンツの販売は停止中(近日公開表示)です。');
  }
});
