const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const honne = require('../lib/honne');
const content = require('../lib/content');
const { buildCompatibility } = require('../lib/compatibility');

const router = express.Router();

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

  db.prepare(
    `INSERT INTO honne_results (id, relation, target_label, email, answers, scores, type_id, paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(id, rel, label, email || null, JSON.stringify(answers), JSON.stringify(scores), typeId);

  if (email) {
    db.prepare(`INSERT INTO leads (email, name, birthdate) VALUES (?, ?, NULL)`).run(email, label);
  }

  const freeResult = honne.buildFreeResult({ scores, typeId, relation: rel, targetLabel: label });
  res.json({ id, paid: false, ...freeResult });
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
  res.json({ id: row.id, paid: !!row.paid, ...freeResult });
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

module.exports = router;
