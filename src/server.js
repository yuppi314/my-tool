require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const diagnosisRoutes = require('./routes/diagnosis');
const { router: paymentRoutes, stripeWebhookHandler } = require('./routes/payment');
const compatibilityRoutes = require('./routes/compatibility');
const { router: honneRoutes, sharePageHandler } = require('./routes/honne');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// OGPの og:image / og:url は絶対URLでないとSNS側が解決できないため、
// 本音診断の入口ページだけは起動時に BASE_URL を埋め込んだHTMLを配信する。
// (HTMLを編集したときはサーバーの再起動が必要。npm run dev なら自動で再起動します)
const publicDir = path.join(__dirname, '..', 'public');
const honnePageHtml = fs
  .readFileSync(path.join(publicDir, 'honne.html'), 'utf8')
  .split('%BASE_URL%')
  .join(BASE_URL);

app.use(cors());

// Stripe webhook は署名検証のため raw body が必要。express.json() より前に登録する。
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());

// express.static より先に登録して、埋め込み済みのHTMLを優先させる
app.get('/honne.html', (req, res) => res.type('html').send(honnePageHtml));

app.use(express.static(publicDir));

app.use('/api', diagnosisRoutes);
app.use('/api', paymentRoutes);
app.use('/api', compatibilityRoutes);
app.use('/api', honneRoutes);
app.use('/api', adminRoutes);

// シェアされたリンクのプレビュー(OGP)用。クローラーがJSを実行しないためサーバー側で描画する。
app.get('/s/:id', sharePageHandler);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`九星気学×マヤ暦 診断ツール起動: http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('※ STRIPE_SECRET_KEY 未設定のため、決済は開発用モックモードで動作します。');
  }
});
