// 簡易食品データベース: 100gあたりの栄養価(参考値)。
// 「サラダチキン」のように1食あたりの量が決まっている食品は defaultGrams に典型的な1食分を設定。

const FOODS = [
  { key: 'rice', name: 'ご飯(白米)', kcal100: 168, proteinG100: 2.5, fatG100: 0.3, carbG100: 37.1, defaultGrams: 150 },
  { key: 'bread', name: '食パン', kcal100: 264, proteinG100: 9.3, fatG100: 4.4, carbG100: 46.7, defaultGrams: 60 },
  { key: 'chicken_breast', name: '鶏むね肉(皮なし)', kcal100: 116, proteinG100: 23.3, fatG100: 1.9, carbG100: 0, defaultGrams: 100 },
  { key: 'chicken_thigh', name: '鶏もも肉(皮つき)', kcal100: 200, proteinG100: 16.6, fatG100: 14.2, carbG100: 0, defaultGrams: 100 },
  { key: 'egg', name: '卵', kcal100: 151, proteinG100: 12.3, fatG100: 10.3, carbG100: 0.3, defaultGrams: 50 },
  { key: 'natto', name: '納豆', kcal100: 200, proteinG100: 16.5, fatG100: 10, carbG100: 12.1, defaultGrams: 50 },
  { key: 'tofu', name: '木綿豆腐', kcal100: 72, proteinG100: 6.6, fatG100: 4.2, carbG100: 1.6, defaultGrams: 150 },
  { key: 'salad', name: 'サラダ(葉野菜)', kcal100: 20, proteinG100: 1.5, fatG100: 0.2, carbG100: 3.5, defaultGrams: 100 },
  { key: 'miso_soup', name: '味噌汁(具入り)', kcal100: 22, proteinG100: 1.7, fatG100: 0.8, carbG100: 2.2, defaultGrams: 180 },
  { key: 'grilled_salmon', name: '焼き鮭', kcal100: 176, proteinG100: 22, fatG100: 9, carbG100: 0.1, defaultGrams: 80 },
  { key: 'beef_lean', name: '牛肉赤身(もも)', kcal100: 196, proteinG100: 21.3, fatG100: 10.7, carbG100: 0.5, defaultGrams: 100 },
  { key: 'pork_lean', name: '豚肉赤身(もも)', kcal100: 138, proteinG100: 22.1, fatG100: 3.6, carbG100: 0.2, defaultGrams: 100 },
  { key: 'banana', name: 'バナナ', kcal100: 86, proteinG100: 1.1, fatG100: 0.2, carbG100: 22.5, defaultGrams: 100 },
  { key: 'apple', name: 'りんご', kcal100: 56, proteinG100: 0.2, fatG100: 0.1, carbG100: 14.6, defaultGrams: 150 },
  { key: 'yogurt', name: 'プレーンヨーグルト(無糖)', kcal100: 62, proteinG100: 3.6, fatG100: 3, carbG100: 4.9, defaultGrams: 100 },
  { key: 'milk', name: '牛乳', kcal100: 67, proteinG100: 3.3, fatG100: 3.8, carbG100: 4.8, defaultGrams: 200 },
  { key: 'protein_powder', name: 'プロテイン(粉末)', kcal100: 380, proteinG100: 75, fatG100: 5, carbG100: 10, defaultGrams: 30 },
  { key: 'soba', name: 'そば(ゆで)', kcal100: 132, proteinG100: 4.8, fatG100: 1, carbG100: 26, defaultGrams: 200 },
  { key: 'udon', name: 'うどん(ゆで)', kcal100: 105, proteinG100: 2.6, fatG100: 0.4, carbG100: 21.6, defaultGrams: 250 },
  { key: 'pasta', name: 'パスタ(ゆで)', kcal100: 165, proteinG100: 5.8, fatG100: 0.9, carbG100: 32.2, defaultGrams: 200 },
  { key: 'ramen', name: 'ラーメン(スープ込み)', kcal100: 87, proteinG100: 3.6, fatG100: 3.2, carbG100: 11, defaultGrams: 500 },
  { key: 'curry_rice', name: 'カレーライス', kcal100: 168, proteinG100: 3.8, fatG100: 5.5, carbG100: 25.5, defaultGrams: 400 },
  { key: 'karaage', name: '唐揚げ', kcal100: 290, proteinG100: 16, fatG100: 20, carbG100: 10, defaultGrams: 100 },
  { key: 'potato_salad', name: 'ポテトサラダ', kcal100: 120, proteinG100: 1.6, fatG100: 7, carbG100: 12, defaultGrams: 100 },
  { key: 'onigiri', name: 'おにぎり(鮭)', kcal100: 154, proteinG100: 3.6, fatG100: 1.4, carbG100: 31.8, defaultGrams: 110 },
  { key: 'sandwich', name: 'サンドイッチ(ハムタマゴ)', kcal100: 160, proteinG100: 6, fatG100: 7.3, carbG100: 17.3, defaultGrams: 150 },
  { key: 'salad_chicken', name: 'サラダチキン(プレーン)', kcal100: 108, proteinG100: 23, fatG100: 1.5, carbG100: 0.5, defaultGrams: 100 },
  { key: 'smoothie', name: 'スムージー(フルーツ)', kcal100: 60, proteinG100: 0.5, fatG100: 0.2, carbG100: 14, defaultGrams: 200 },
  { key: 'potato_chips', name: 'ポテトチップス', kcal100: 541, proteinG100: 4.7, fatG100: 35.2, carbG100: 54.7, defaultGrams: 60 },
  { key: 'chocolate', name: 'チョコレート(ミルク)', kcal100: 550, proteinG100: 6, fatG100: 32, carbG100: 56, defaultGrams: 50 },
  { key: 'beer', name: 'ビール', kcal100: 40, proteinG100: 0.3, fatG100: 0, carbG100: 3.1, defaultGrams: 350 },
  { key: 'coffee_black', name: 'コーヒー(ブラック)', kcal100: 4, proteinG100: 0.2, fatG100: 0, carbG100: 0.7, defaultGrams: 150 },
];

function findFood(key) {
  return FOODS.find((f) => f.key === key) || null;
}

function calcNutrition(food, grams) {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.kcal100 * ratio),
    proteinG: Math.round(food.proteinG100 * ratio * 10) / 10,
    fatG: Math.round(food.fatG100 * ratio * 10) / 10,
    carbG: Math.round(food.carbG100 * ratio * 10) / 10,
  };
}

module.exports = { FOODS, findFood, calcNutrition };
