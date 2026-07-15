// PFC(タンパク質・脂質・炭水化物)バランスの算出

function computeMacros({ weightKg, targetCalories }) {
  const proteinG = Math.round(weightKg * 1.6);
  const proteinKcal = proteinG * 4;

  const fatKcal = Math.round(targetCalories * 0.225);
  const fatG = Math.round(fatKcal / 9);

  const carbKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const carbG = Math.round(carbKcal / 4);

  return { proteinG, fatG, carbG };
}

module.exports = { computeMacros };
