const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { ACTIVITY_LEVELS, evaluatePlan } = require('../lib/calorie');
const plan = require('../lib/plan');

const router = express.Router();

const GENDERS = ['male', 'female', 'other'];

function validateInput(body) {
  const { gender, age, heightCm, weightKg, activityLevel, targetKg } = body || {};

  if (!GENDERS.includes(gender)) return 'gender は male / female / other のいずれかで指定してください。';
  if (!Number.isFinite(age) || age < 10 || age > 100) return 'age は10〜100の範囲で指定してください。';
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) return 'heightCm は100〜250の範囲で指定してください。';
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) return 'weightKg は30〜300の範囲で指定してください。';
  if (!ACTIVITY_LEVELS[activityLevel]) return 'activityLevel は1〜5のいずれかで指定してください。';
  if (!Number.isFinite(targetKg) || targetKg <= 0 || targetKg > 10) return 'targetKg は0より大きく10以下で指定してください。';
  return null;
}

function toInput(body) {
  return {
    gender: body.gender,
    age: Number(body.age),
    heightCm: Number(body.heightCm),
    weightKg: Number(body.weightKg),
    activityLevel: Number(body.activityLevel),
    targetKg: Number(body.targetKg),
  };
}

function rowToInput(row) {
  return {
    gender: row.gender,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activityLevel: row.activity_level,
    targetKg: row.target_kg,
  };
}

// 無料診断: 身体データから目標カロリー・PFCバランスを算出し保存(リード獲得)
router.post('/diagnosis', (req, res) => {
  const body = { ...req.body, age: Number(req.body?.age), heightCm: Number(req.body?.heightCm), weightKg: Number(req.body?.weightKg), activityLevel: Number(req.body?.activityLevel), targetKg: Number(req.body?.targetKg) };
  const error = validateInput(body);
  if (error) return res.status(400).json({ error });

  const input = toInput(body);
  const { name, email } = req.body || {};
  const calc = evaluatePlan({ ...input, periodDays: 30 });
  const id = uuidv4();

  db.prepare(
    `INSERT INTO diagnoses
      (id, gender, age, height_cm, weight_kg, activity_level, target_kg, period_days, name, email, bmr, tdee, target_calories, safety_level, paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    input.gender,
    input.age,
    input.heightCm,
    input.weightKg,
    input.activityLevel,
    input.targetKg,
    name || null,
    email || null,
    calc.bmr,
    calc.tdee,
    calc.targetCalories,
    calc.safetyLevel
  );

  if (email) {
    db.prepare(`INSERT INTO leads (email, name) VALUES (?, ?)`).run(email, name || null);
  }

  const freeResult = plan.buildFreeResult(input, calc);
  res.json({ id, ...freeResult });
});

// 無料結果の再取得
router.get('/diagnosis/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });

  const input = rowToInput(row);
  const calc = evaluatePlan({ ...input, periodDays: row.period_days });
  const freeResult = plan.buildFreeResult(input, calc);
  res.json({ id: row.id, paid: !!row.paid, ...freeResult });
});

// 4週間の詳細プラン(有料コンテンツ)
router.get('/diagnosis/:id/full', (req, res) => {
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!row.paid) {
    return res.status(402).json({ error: 'この詳細プランは有料です。決済後にご覧いただけます。', diagnosisId: row.id });
  }
  const input = rowToInput(row);
  const calc = evaluatePlan({ ...input, periodDays: row.period_days });
  const fullResult = plan.buildFullResult(input, calc);
  res.json({ id: row.id, ...fullResult });
});

module.exports = router;
