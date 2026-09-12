// サイトURLと決済モードの解決を1箇所にまとめる。
//
// BASE_URL は決済後の戻り先URLと、シェア時のOGP画像・URL(絶対URLでないとSNSが解決できない)に使う。
// Render は RENDER_EXTERNAL_URL を自動で渡してくるため、無料プランでの公開時は
// BASE_URL を手で設定しなくてもOGP画像が正しく表示される。

function baseUrl() {
  const explicit = process.env.BASE_URL && process.env.BASE_URL.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  // Render が自動で設定する公開URL (例: https://your-app.onrender.com)
  const render = process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim();
  if (render) return render.replace(/\/$/, '');
  return `http://localhost:${process.env.PORT || 3000}`;
}

// 決済モード
//   live       : STRIPE_SECRET_KEY あり。実際に課金する
//   mock       : PAYMENT_MODE=mock。購入ボタンで即アンロック(ローカル開発・デモ用)
//   comingsoon : 既定。有料レポートは売らず「近日公開」として案内する
//
// 既定を comingsoon にしているのは事故防止のため。決済を用意せず公開したときに
// mock が既定だと、購入ボタンを押した全員に有料レポートを無料で配ってしまう。
// ローカル開発では .env (`.env.example` に PAYMENT_MODE=mock を同梱) でモックになる。
function paymentMode() {
  if (process.env.STRIPE_SECRET_KEY) return 'live';
  return process.env.PAYMENT_MODE === 'mock' ? 'mock' : 'comingsoon';
}

module.exports = { baseUrl, paymentMode };
