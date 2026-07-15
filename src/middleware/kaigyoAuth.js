// 自分専用ツールのための、かんたんな合言葉チェック。
// 会員登録のような仕組みは作らず、決めた合言葉(トークン)が合っているかだけを確認する。

function kaigyoAuth(req, res, next) {
  const expected = process.env.KAIGYO_TOKEN || 'changeme';
  const token = req.headers['x-kaigyo-token'] || req.query.token;

  if (token !== expected) {
    return res.status(401).json({ error: '合言葉が正しくありません。もう一度ログインしてください。' });
  }
  next();
}

module.exports = kaigyoAuth;
