// カロリー計算ロジック: BMR(基礎代謝)・TDEE(総消費カロリー)・目標摂取カロリーの算出
// 体脂肪1kg ≒ 7,700kcal の一般的な換算値を用いる。

const KCAL_PER_KG = 7700;

const ACTIVITY_LEVELS = {
  1: { factor: 1.2, label: 'ほとんど運動しない(デスクワーク中心)' },
  2: { factor: 1.375, label: '軽い運動を週1〜2回する' },
  3: { factor: 1.55, label: '中程度の運動を週3〜5回する' },
  4: { factor: 1.725, label: '激しい運動を週6〜7回する' },
  5: { factor: 1.9, label: '非常に激しい運動・肉体労働が多い' },
};

const MIN_CALORIES = {
  male: 1500,
  female: 1200,
  other: 1350,
};

// ミフリン・セントジョール式
function calcBMR({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // 'other': 男女の補正値の中間を採用
}

function calcTDEE(bmr, activityLevel) {
  const activity = ACTIVITY_LEVELS[activityLevel];
  return bmr * activity.factor;
}

function evaluatePlan({ gender, heightCm, weightKg, age, activityLevel, targetKg, periodDays = 30 }) {
  const bmr = calcBMR({ gender, weightKg, heightCm, age });
  const tdee = calcTDEE(bmr, activityLevel);
  const minCalories = MIN_CALORIES[gender] || MIN_CALORIES.other;

  const dailyDeficitNeeded = (targetKg * KCAL_PER_KG) / periodDays;
  const rawTargetCalories = tdee - dailyDeficitNeeded;
  const targetCalories = Math.max(minCalories, Math.round(rawTargetCalories));

  const ratio = targetKg / weightKg;
  let safetyLevel = 'safe';
  if (ratio > 0.08) safetyLevel = 'unsafe';
  else if (ratio > 0.05) safetyLevel = 'caution';

  // 摂取カロリーが下限でクランプされた場合、実際に期待できる減量ペースを逆算する
  const clamped = targetCalories > Math.round(rawTargetCalories);
  const achievableKg = clamped
    ? Math.round((((tdee - targetCalories) * periodDays) / KCAL_PER_KG) * 10) / 10
    : targetKg;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyDeficitNeeded: Math.round(dailyDeficitNeeded),
    targetCalories,
    minCalories,
    clamped,
    achievableKg,
    safetyLevel,
    safeMaxKg: Math.round(weightKg * 0.05 * 10) / 10,
  };
}

module.exports = { KCAL_PER_KG, ACTIVITY_LEVELS, MIN_CALORIES, calcBMR, calcTDEE, evaluatePlan };
