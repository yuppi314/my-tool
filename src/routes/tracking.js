const express = require('express');
const db = require('../db');
const { FOODS, findFood, calcNutrition } = require('../lib/foodDatabase');

const router = express.Router();

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

function diagnosisExists(diagnosisId) {
  return !!db.prepare('SELECT 1 FROM diagnoses WHERE id = ?').get(diagnosisId);
}

// 食品データベース一覧(食事記録フォームの選択肢用)
router.get('/foods', (req, res) => {
  res.json({
    foods: FOODS.map((f) => ({ key: f.key, name: f.name, kcal100: f.kcal100, defaultGrams: f.defaultGrams })),
  });
});

// 体重の記録(同じ日付は上書き)
router.post('/weight-logs', (req, res) => {
  const { diagnosisId, date, weightKg } = req.body || {};
  if (!diagnosisExists(diagnosisId)) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!isValidDateStr(date)) return res.status(400).json({ error: 'date は YYYY-MM-DD 形式で指定してください。' });
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
    return res.status(400).json({ error: 'weightKg は20〜300の範囲で指定してください。' });
  }

  db.prepare(
    `INSERT INTO weight_logs (diagnosis_id, log_date, weight_kg) VALUES (?, ?, ?)
     ON CONFLICT(diagnosis_id, log_date) DO UPDATE SET weight_kg = excluded.weight_kg`
  ).run(diagnosisId, date, weight);

  res.json({ ok: true });
});

// 体重の記録一覧(日付昇順)
router.get('/weight-logs/:diagnosisId', (req, res) => {
  if (!diagnosisExists(req.params.diagnosisId)) return res.status(404).json({ error: '診断結果が見つかりません。' });
  const rows = db
    .prepare('SELECT log_date AS date, weight_kg AS weightKg FROM weight_logs WHERE diagnosis_id = ? ORDER BY log_date ASC')
    .all(req.params.diagnosisId);
  res.json({ logs: rows });
});

// 食事の記録
router.post('/meal-logs', (req, res) => {
  const { diagnosisId, date, foodKey, grams } = req.body || {};
  if (!diagnosisExists(diagnosisId)) return res.status(404).json({ error: '診断結果が見つかりません。' });
  if (!isValidDateStr(date)) return res.status(400).json({ error: 'date は YYYY-MM-DD 形式で指定してください。' });

  const food = findFood(foodKey);
  if (!food) return res.status(400).json({ error: '指定された食品が見つかりません。' });

  const gramsNum = Number(grams);
  if (!Number.isFinite(gramsNum) || gramsNum <= 0 || gramsNum > 2000) {
    return res.status(400).json({ error: 'grams は0より大きく2000以下で指定してください。' });
  }

  const nutrition = calcNutrition(food, gramsNum);

  const info = db
    .prepare(
      `INSERT INTO meal_logs (diagnosis_id, log_date, food_key, food_name, grams, calories, protein_g, fat_g, carb_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(diagnosisId, date, food.key, food.name, gramsNum, nutrition.calories, nutrition.proteinG, nutrition.fatG, nutrition.carbG);

  res.json({ id: info.lastInsertRowid, date, food: food.name, grams: gramsNum, ...nutrition });
});

// 指定日の食事記録一覧+合計(dateクエリ省略時は全期間)
router.get('/meal-logs/:diagnosisId', (req, res) => {
  if (!diagnosisExists(req.params.diagnosisId)) return res.status(404).json({ error: '診断結果が見つかりません。' });
  const { date } = req.query;

  const rows = date
    ? db
        .prepare(
          `SELECT id, log_date AS date, food_name AS foodName, grams, calories, protein_g AS proteinG, fat_g AS fatG, carb_g AS carbG
           FROM meal_logs WHERE diagnosis_id = ? AND log_date = ? ORDER BY id ASC`
        )
        .all(req.params.diagnosisId, date)
    : db
        .prepare(
          `SELECT id, log_date AS date, food_name AS foodName, grams, calories, protein_g AS proteinG, fat_g AS fatG, carb_g AS carbG
           FROM meal_logs WHERE diagnosis_id = ? ORDER BY log_date ASC, id ASC`
        )
        .all(req.params.diagnosisId);

  const totals = rows.reduce(
    (acc, r) => ({
      calories: acc.calories + r.calories,
      proteinG: Math.round((acc.proteinG + r.proteinG) * 10) / 10,
      fatG: Math.round((acc.fatG + r.fatG) * 10) / 10,
      carbG: Math.round((acc.carbG + r.carbG) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbG: 0 }
  );

  res.json({ logs: rows, totals });
});

router.delete('/meal-logs/:id', (req, res) => {
  db.prepare('DELETE FROM meal_logs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
