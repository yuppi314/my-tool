// 特商法表記・利用規約・プライバシーポリシーに載せる事業者情報。
// HTMLを直接編集しなくても、環境変数(Renderの Environment 画面)に入れるだけで各ページに反映される。
const fs = require('fs');
const path = require('path');

const FIELDS = [
  { key: 'OPERATOR_NAME', label: '事業者名(屋号)', required: true },
  { key: 'OPERATOR_REPRESENTATIVE', label: '運営統括責任者', required: true },
  { key: 'OPERATOR_ADDRESS', label: '所在地', required: true },
  { key: 'OPERATOR_PHONE', label: '電話番号', required: true },
  { key: 'OPERATOR_EMAIL', label: '問い合わせ用メールアドレス', required: true },
  { key: 'LEGAL_ENACTED_DATE', label: '制定日', required: true },
  { key: 'OPERATOR_COURT', label: '管轄裁判所', default: '当方の所在地を管轄する地方裁判所' },
];

const LEGAL_PAGES = ['tokushoho.html', 'terms.html', 'privacy.html'];
const publicDir = path.join(__dirname, '..', '..', 'public');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function valueOf(field) {
  const v = (process.env[field.key] || '').trim();
  return v || field.default || '';
}

// 公開前に埋める必要がある項目(未設定のまま有料販売すると特商法違反になる)
function missingFields() {
  return FIELDS.filter((f) => f.required && !valueOf(f)).map((f) => `${f.key}(${f.label})`);
}

// テンプレートの {{KEY}} を事業者情報に置き換える。未設定の項目は目立つ表示のまま残す
function render(template) {
  return FIELDS.reduce((html, f) => {
    const v = valueOf(f);
    const out = v ? escapeHtml(v) : `<span class="unset">[未設定: ${f.label}]</span>`;
    return html.split(`{{${f.key}}}`).join(out);
  }, template);
}

// /tokushoho.html などを、事業者情報を差し込んで返すルート(express.static より前に登録する)
function legalPagesHandler(req, res, next) {
  const file = req.path.replace(/^\//, '');
  if (!LEGAL_PAGES.includes(file)) return next();
  fs.readFile(path.join(publicDir, file), 'utf8', (err, template) => {
    if (err) return next(err);
    res.type('html').send(render(template));
  });
}

module.exports = { missingFields, render, legalPagesHandler, LEGAL_PAGES };
