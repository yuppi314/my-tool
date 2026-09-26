// 結果ページに表示する紹介(アフィリエイト)リンク。
// ステマ規制により、画面には「PR」表記が自動で付きます。

// もしもアフィリエイト「楽天トラベル」のどこでもリンク設定(メディア: 診断サイト)。
// a_id はリンクに含まれる公開の識別番号で、秘密情報ではない。
const RAKUTEN_TRAVEL = { aId: '5818875', pId: 55, pcId: 55, plId: 624 };

function moshimoLink({ aId, pId, pcId, plId }, url) {
  return `https://af.moshimo.com/af/c/click?a_id=${aId}&p_id=${pId}&pc_id=${pcId}&pl_id=${plId}&url=${encodeURIComponent(url)}`;
}

// 楽天トラベルのキーワード検索(例: 「金沢」周辺の宿)へのアフィリエイトリンク
function hotelSearchUrl(keyword) {
  const target = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_query=${encodeURIComponent(keyword)}`;
  return moshimoLink(RAKUTEN_TRAVEL, target);
}

// 「旅の準備」枠。url が空のものは表示されません。
const links = [
  {
    title: '吉方位先のホテル・温泉宿を探す(楽天トラベル)',
    description: '旅先に着いたら温泉や地元の食で「気」を取り入れましょう。',
    url: moshimoLink(RAKUTEN_TRAVEL, 'https://travel.rakuten.co.jp/'),
  },
  {
    title: 'マイルが貯まるクレジットカード',
    description: '毎日の買い物でマイルを貯めて、吉方位旅の航空券に。',
    url: '',
  },
  {
    title: 'マイルで予約できる航空券',
    description: '特典航空券の空席を確認して、早めに押さえるのがコツ。',
    url: '',
  },
];

module.exports = { links, hotelSearchUrl };
