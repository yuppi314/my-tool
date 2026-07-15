require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const diagnosisRoutes = require('./routes/diagnosis');
const { router: paymentRoutes, stripeWebhookHandler } = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const trackingRoutes = require('./routes/tracking');

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
app.use('/api', trackingRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`1ヶ月-3kgダイエットナビ 起動: http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('※ STRIPE_SECRET_KEY 未設定のため、決済は開発用モックモードで動作します。');
  }
});
