// 本音診断の価格ABテスト。
//
// HONNE_PRICE_AB に "480,980" のようにカンマ区切りで価格を並べると、診断ごとに
// ランダムで1つを割り当て、その価格を honne_results.price_jpy に保存します。
// 未設定なら HONNE_PRICE_JPY の単価のみで動作します(既定の挙動)。
//
// 表示価格と請求額をずらさないため、決済時は環境変数ではなく保存された価格を使います。
// どの価格が一番稼げたかは /admin.html の価格別テーブルで確認できます。

const DEFAULT_PRICE_JPY = 980;

function basePrice() {
  const value = Number(process.env.HONNE_PRICE_JPY);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_PRICE_JPY;
}

// 妥当な整数価格のみを採用する(不正な値は黙って捨てる)
function variants() {
  const raw = process.env.HONNE_PRICE_AB;
  if (!raw) return [basePrice()];
  const parsed = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
  return parsed.length ? parsed : [basePrice()];
}

function assignPrice() {
  const candidates = variants();
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 価格列がまだ無い(ABテスト導入前の)診断は既定価格として扱う
function resolvePrice(storedPrice) {
  return Number.isInteger(storedPrice) && storedPrice > 0 ? storedPrice : basePrice();
}

module.exports = { basePrice, variants, assignPrice, resolvePrice };
