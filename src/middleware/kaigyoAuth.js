// 自分専用ツールのための、かんたんな合言葉チェック。
// 会員登録のような仕組みは作らず、決めた合言葉(トークン)が合っているかだけを確認する。

function kaigyoAuth(req, res, next) {
  const expected = process.env.KAIGYO_TOKEN || 'changeme';

  // ヘッダーは日本語などを安全に運ぶため encodeURIComponent して送られてくる。
  // クエリパラメータ(?token=...)は Express がすでにデコード済みなのでそのまま比較する。
  let token = req.query.token;
  if (req.headers['x-kaigyo-token'] !== undefined) {
    try {
      token = decodeURIComponent(req.headers['x-kaigyo-token']);
    } catch (err) {
      token = req.headers['x-kaigyo-token'];
    }
  }

  if (token !== expected) {
    return res.status(401).json({ error: '合言葉が正しくありません。もう一度ログインしてください。' });
  }
  next();
}

module.exports = kaigyoAuth;
