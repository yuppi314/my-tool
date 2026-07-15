// 診断結果(無料)・4週間プラン(有料)のコンテンツ合成ロジック
const { ACTIVITY_LEVELS } = require('./calorie');
const { computeMacros } = require('./macro');

const SAFETY_MESSAGE = {
  safe: '安全な範囲の目標です。無理なく続けやすいペースです。',
  caution:
    'やや意欲的な目標です。空腹感が強く出る場合があるので、体調を見ながら無理のない範囲で進めましょう。',
  unsafe:
    '体重に対してかなり急なペースの目標です。健康を守るため、下限カロリーで計算した現実的な減量目安もあわせてご確認ください。',
};

function buildFreeResult(input, calc) {
  const macros = computeMacros({ weightKg: input.weightKg, targetCalories: calc.targetCalories });
  const activityLabel = ACTIVITY_LEVELS[input.activityLevel].label;

  const summary = calc.clamped
    ? `1日の目標摂取カロリーは${calc.targetCalories}kcal(健康維持に必要な下限カロリーで計算)。このペースだと1ヶ月で目安${calc.achievableKg}kgの減量が見込めます。`
    : `1日の目標摂取カロリーは${calc.targetCalories}kcalです。このペースを守れれば、1ヶ月で目安${input.targetKg}kgの減量が期待できます。`;

  return {
    bmr: calc.bmr,
    tdee: calc.tdee,
    targetCalories: calc.targetCalories,
    dailyDeficitNeeded: calc.dailyDeficitNeeded,
    safetyLevel: calc.safetyLevel,
    safetyMessage: SAFETY_MESSAGE[calc.safetyLevel],
    safeMaxKg: calc.safeMaxKg,
    achievableKg: calc.achievableKg,
    macros,
    activityLabel,
    summary,
  };
}

function buildWeeklyPlan(input, calc) {
  const { targetCalories } = calc;
  const weeks = [
    { week: 1, calories: targetCalories + 150, note: '初週は体を慣らす導入期間。急に減らしすぎず、まずは食事記録・計量の習慣化を優先しましょう。' },
    { week: 2, calories: targetCalories, note: '目標カロリーを本格的に実践する週。タンパク質を毎食確保し、空腹感が強い日は野菜・きのこ・海藻で満腹感を補いましょう。' },
    { week: 3, calories: targetCalories, note: '停滞を感じやすい時期です。体重ではなく体脂肪や見た目、着圧感の変化もあわせてチェックしましょう。' },
    { week: 4, calories: Math.max(calc.minCalories, targetCalories - 50), note: '停滞期対策として少しだけ赤字を強めます。睡眠不足やストレスも代謝低下の原因になるため、生活リズムも整えましょう。' },
  ];
  return weeks.map((w) => ({ ...w, macros: computeMacros({ weightKg: input.weightKg, targetCalories: w.calories }) }));
}

function buildExerciseAdvice(input) {
  const level = input.activityLevel;
  if (level <= 2) {
    return '運動習慣がまだ少ない場合は、まず「ウォーキング20〜30分」を週4〜5回から始めましょう。慣れてきたら自重の筋トレ(スクワット・腕立て・プランクなど)を週2回追加すると、代謝が落ちにくくなります。';
  }
  if (level === 3) {
    return '現在の運動習慣を維持しつつ、有酸素運動(早歩き・ジョギング・サイクリングなど)を週3回30分程度、筋トレを週2〜3回組み合わせると効率よく脂肪を減らせます。';
  }
  return 'すでに運動量が多いため、追加でやりすぎるとオーバートレーニングになりがちです。強度を上げるよりも、睡眠・栄養(特にタンパク質摂取)の質を見直すことが減量効果を高めます。';
}

function buildFullResult(input, calc) {
  const weeklyPlan = buildWeeklyPlan(input, calc);
  const exercise = buildExerciseAdvice(input);
  const plateauTips =
    '体重は水分量・生理周期・食事内容によって日々1〜2kg変動します。停滞を感じたら、体重ではなく「同じ時間・同じ条件で撮った写真」や「服の着心地」も判断材料にしましょう。数値が動かない日が3〜5日続いても焦らず継続することが最も重要です。';
  const advice =
    calc.safetyLevel === 'unsafe'
      ? `今回の目標(${input.targetKg}kg/月)は体重に対してやや急なペースです。まずは下限カロリー${calc.minCalories}kcalを守りながら、目安${calc.achievableKg}kgの減量を目指し、翌月以降に残りの目標を継続することをおすすめします。`
      : '極端な食事制限よりも、目標カロリー内でタンパク質・野菜をしっかり摂ることを優先してください。3日坊主になりそうな時は、1食だけ好きなものを食べる「調整日」を作ると継続しやすくなります。';

  return { weeklyPlan, exercise, plateauTips, advice };
}

module.exports = { buildFreeResult, buildFullResult };
