const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const honne = require('../lib/honne');
const pricing = require('../lib/pricing');
const content = require('../lib/content');
const { buildCompatibility } = require('../lib/compatibility');

const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

function normalizeRelation(relation) {
  return honne.RELATIONS.some((r) => r.key === relation) ? relation : 'other';
}

function loadRow(id) {
  const row = db.prepare('SELECT * FROM honne_results WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    scores: JSON.parse(row.scores),
    answers: JSON.parse(row.answers),
  };
}

// 質問セット(フロントはこれを描画するだけでよい)
router.get('/honne/questions', (req, res) => {
  res.json({
    relations: honne.RELATIONS,
    questions: honne.QUESTIONS.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options.map((o) => o.label),
    })),
  });
});

// 無料診断: 12問の回答から6軸スコアと本音タイプを判定し保存(リード獲得)
router.post('/honne/diagnosis', (req, res) => {
  const { answers, relation, targetLabel, email } = req.body || {};
  if (!honne.isAnswerSet(answers)) {
    return res.status(400).json({ error: '全ての質問に回答してください。' });
  }

  const scores = honne.scoreAnswers(answers);
  const typeId = honne.determineTypeId(scores);
  const id = uuidv4();
  const rel = normalizeRelation(relation);
  const label = typeof targetLabel === 'string' && targetLabel.trim() ? targetLabel.trim().slice(0, 20) : null;
  // 価格ABテスト: 診断ごとに提示価格を確定させ、決済時もこの価格を使う
  const price = pricing.assignPrice();

  db.prepare(
    `INSERT INTO honne_results (id, relation, target_label, email, answers, scores, type_id, price_jpy, paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(id, rel, label, email || null, JSON.stringify(answers), JSON.stringify(scores), typeId, price);

  if (email) {
    db.prepare(`INSERT INTO leads (email, name, birthdate) VALUES (?, ?, NULL)`).run(email, label);
  }

  const freeResult = honne.buildFreeResult({ scores, typeId, relation: rel, targetLabel: label });
  res.json({ id, paid: false, price, ...freeResult });
});

// 無料結果の再取得(シェアされたURLからの再訪に対応)
router.get('/honne/:id', (req, res) => {
  const row = loadRow(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const freeResult = honne.buildFreeResult({
    scores: row.scores,
    typeId: row.type_id,
    relation: row.relation,
    targetLabel: row.target_label,
  });
  res.json({ id: row.id, paid: !!row.paid, price: pricing.resolvePrice(row.price_jpy), ...freeResult });
});

// 完全版レポート(有料コンテンツ)
router.get('/honne/:id/full', (req, res) => {
  const row = loadRow(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!row.paid) {
    return res.status(402).json({ error: 'この完全版レポートは有料です。決済後にご覧いただけます。', diagnosisId: row.id });
  }

  const fullResult = honne.buildFullResult({
    scores: row.scores,
    typeId: row.type_id,
    relation: row.relation,
    targetLabel: row.target_label,
  });
  res.json({ id: row.id, ...fullResult });
});

// クロス診断(購入者限定特典): 本音タイプに九星気学×マヤ暦の相性を重ねる
router.post('/honne/:id/cross', (req, res) => {
  const row = loadRow(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!row.paid) {
    return res.status(402).json({ error: 'クロス診断は完全版レポート購入者限定の機能です。', diagnosisId: row.id });
  }

  const { yourBirthdate, partnerBirthdate } = req.body || {};
  if (!isValidDateStr(yourBirthdate) || !isValidDateStr(partnerBirthdate)) {
    return res.status(400).json({ error: '生年月日は YYYY-MM-DD 形式で2名分を指定してください。' });
  }

  const profileA = content.computeProfile(yourBirthdate);
  const profileB = content.computeProfile(partnerBirthdate);
  const compatibility = buildCompatibility(profileA, profileB);
  const type = honne.TYPES[row.type_id];

  res.json({
    you: content.buildFreeResult(profileA),
    partner: content.buildFreeResult(profileB),
    compatibility,
    crossNote:
      `あなたの本音は「${type.name}」、生年月日から見た二人の相性は${compatibility.score}点。` +
      `本音(あなたの内側)と相性(二人の相互作用)は別のものです。` +
      `相性が高いのに苦しいなら原因はあなたの本音の側にあり、相性が低いのに心地よいなら` +
      `それは二人が工夫で積み上げてきた関係だということです。`,
  });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// シェア用ページ (GET /s/:id)
//
// SNSのクローラーはJavaScriptを実行しないため、OGPタグはサーバー側でHTMLに埋め込む必要がある。
// このページは本音タイプだけを表示し、相手の呼び名・6軸スコア・回答内容は一切含めない。
// 診断した本人が自分の結果に戻るためのURLは /honne.html?id=... 側で、用途を分けている。
function sharePageHandler(req, res) {
  const row = db.prepare('SELECT type_id FROM honne_results WHERE id = ?').get(req.params.id);
  const type = row ? honne.TYPES[row.type_id] : null;

  const title = type ? `私の本音は「${type.name}」でした | 本音診断` : '本音診断 | あの人を本当はどう思っている？';
  const description = type
    ? `${type.catch} 12の質問で、自分でも気づいていない本音がわかる無料診断。`
    : '12の質問で、自分でも気づいていない「あの人への本音」がわかる無料診断。';
  const image = `${BASE_URL}/og/honne-${type ? type.id : 'default'}.jpg`;
  const heading = type ? type.name : 'あの人への本音';
  const lead = type ? type.catch : '12の質問で、自分でも気づいていない本音を言葉にします。';

  res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(`${BASE_URL}/s/${req.params.id}`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>本音診断</h1>
      <p>あの人のことを、あなたは本当はどう思っている？</p>
    </header>

    <div class="card">
      <div class="type-headline">${type ? 'この診断結果は' : ''}</div>
      <div class="type-name">${escapeHtml(heading)}</div>
      <div class="type-catch">${escapeHtml(lead)}</div>

      <div class="cta-box">
        <p>12の質問に答えるだけ。<br />あなたの本音は6つの心理軸で言葉になります。</p>
        <a class="cta-link" href="/honne.html">あなたも無料で診断する</a>
      </div>

      <p class="note-text">
        このページに表示されるのは診断タイプだけです。回答内容やお相手の呼び名は含まれていません。
      </p>
    </div>

    <footer class="legal">
      本診断は心理学の一般的な考え方を参考にした娯楽・自己内省コンテンツであり、心理検査・医療行為ではありません。
      医療・法律等の専門的助言に代わるものではなく、他者の心理を判定するものでもありません。<br />
      <a href="/tokushoho.html">特定商取引法に基づく表記</a> ・
      <a href="/terms.html">利用規約</a> ・
      <a href="/privacy.html">プライバシーポリシー</a>
    </footer>
  </div>
</body>
</html>`);
}

module.exports = { router, sharePageHandler };
