// Rule-based scoring engine (see docs/requirements.md sections 4 and 3-6).
// Each tipster weighs the same raw horse stats differently, producing
// different ◎○▲△ picks and comments from the same data.

function average(arr) {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

// Scales a list of raw values to 0-100 within the field (relative to this race).
function minMaxScale(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

// Rest-day comfort: peaks around 4 weeks, tails off on both sides.
function restDayFitScore(days) {
  return Math.max(0, 100 - Math.abs(days - 28) * 1.8);
}

// A tipster who favours live longshots peaks around 10-20x odds,
// rather than favouring the single longest shot in the field.
function longshotAppealScore(odds) {
  const diff = Math.abs(Math.log2(odds) - Math.log2(15));
  return Math.max(0, 100 - diff * 28);
}

function buildFactors(horses) {
  const avgFinishScores = minMaxScale(horses.map((h) => -average(h.recentFinishes)));
  const speedScores = minMaxScale(horses.map((h) => h.speedFigure));
  const jockeyScores = minMaxScale(horses.map((h) => h.jockeyWinRatePct));
  const oddsScores = minMaxScale(horses.map((h) => -h.odds));
  const courseScores = minMaxScale(horses.map((h) => h.courseFit));
  const restScores = horses.map((h) => restDayFitScore(h.restDaysSinceLast));
  const longshotScores = horses.map((h) => longshotAppealScore(h.odds));

  return horses.map((h, i) => ({
    horse: h,
    recentForm: avgFinishScores[i],
    speed: speedScores[i],
    jockey: jockeyScores[i],
    favourite: oddsScores[i],
    courseFit: courseScores[i],
    restFit: restScores[i],
    longshotAppeal: longshotScores[i]
  }));
}

const TIPSTER_PROFILES = {
  // データ丸: leans on recent form, speed figures and jockey stats.
  databall: {
    weights: { recentForm: 0.35, speed: 0.30, jockey: 0.20, favourite: 0.15 },
    comments: {
      recentForm: (h) => `過去5走の着順が安定しています(平均${average(h.recentFinishes).toFixed(1)}着)。`,
      speed: () => 'スピード指数がメンバー内で頭ひとつ抜けています。',
      jockey: (h) => `騎手の近走勝率(${h.jockeyWinRatePct}%)が高く、信頼度があります。`,
      favourite: () => 'データを並べても、素直に人気どおりの実力が見えます。'
    }
  },
  // 血統じい: leans on course aptitude and conditioning (rest days).
  ketto: {
    weights: { courseFit: 0.40, restFit: 0.25, recentForm: 0.20, favourite: 0.15 },
    comments: {
      courseFit: (h, race) => `この${race.surface}${race.distanceM}mとの相性が良い一頭じゃ。`,
      restFit: (h) => `中${Math.round(h.restDaysSinceLast / 7)}週というのが、一番仕上がる間隔じゃ。`,
      recentForm: () => '最近の走りにも充実がうかがえるのう。',
      favourite: () => '血統的に見ても、素直に信頼できる一頭じゃ。'
    }
  },
  // 直感マキ: hunts for live longshots with some underlying quality.
  kankaku: {
    weights: { longshotAppeal: 0.40, courseFit: 0.30, speed: 0.20, restFit: 0.10 },
    comments: {
      longshotAppeal: (h) => `まだ${h.odds}倍で人気になってないのが不思議なくらい!`,
      courseFit: () => 'コース適性の数値がひそかに高いのが気になります。',
      speed: () => '一瞬の脚に化けそうな気配があります。',
      restFit: () => 'このタイミングでの出走、勘がざわつきます!'
    }
  }
};

function scoreForProfile(factors, weights) {
  return factors.map((f) => {
    let total = 0;
    let topKey = null;
    let topContribution = -Infinity;
    for (const [key, weight] of Object.entries(weights)) {
      const contribution = f[key] * weight;
      total += contribution;
      if (contribution > topContribution) {
        topContribution = contribution;
        topKey = key;
      }
    }
    return { horse: f.horse, total, topKey };
  }).sort((a, b) => b.total - a.total);
}

const MARKS = ['◎', '○', '▲', '△'];

// Blended "overall" mark shown in the horse table: average of all three profiles.
function computeOverallMarks(race) {
  const factors = buildFactors(race.horses);
  const blendedWeights = {
    recentForm: 0.25, speed: 0.2, jockey: 0.1, favourite: 0.15,
    courseFit: 0.15, restFit: 0.05, longshotAppeal: 0.1
  };
  const ranked = scoreForProfile(factors, blendedWeights);
  const markByNumber = {};
  ranked.slice(0, 4).forEach((r, i) => { markByNumber[r.horse.number] = MARKS[i]; });
  return markByNumber;
}

function wakuOf(race, number) {
  const horse = race.horses.find((h) => h.number === number);
  return horse ? horse.waku : number;
}

// レースの出走頭数が少ない(3頭未満)場合でも安全に動くよう、
// taikou・anaanaが無ければその買い方は省略する。
function buildBets(race, honmei, taikou, anaana) {
  const bets = { tansho: String(honmei) };
  if (taikou != null) {
    bets.fukusho = `${honmei},${taikou}`;
    bets.wakuren = [wakuOf(race, honmei), wakuOf(race, taikou)].sort((a, b) => a - b).join('-');
    bets.umaren = `${honmei}-${taikou}`;
    bets.wide = `${honmei}-${taikou}`;
  }
  if (anaana != null) {
    bets.sanrenpuku = [honmei, taikou, anaana].sort((a, b) => a - b).join('-');
    bets.sanrentan = `${honmei}→${taikou}→${anaana}`;
  }
  return bets;
}

function computeTipsterPicks(race) {
  if (!race.horses || race.horses.length === 0) return [];
  const factors = buildFactors(race.horses);
  return Object.entries(TIPSTER_PROFILES).map(([tipsterId, profile]) => {
    const ranked = scoreForProfile(factors, profile.weights);
    const [honmei, taikou, anaana] = ranked;
    const commentFn = profile.comments[honmei.topKey] || profile.comments.recentForm;
    return {
      tipsterId,
      honmei: honmei.horse.number,
      taikou: taikou ? taikou.horse.number : null,
      comment: commentFn(honmei.horse, race),
      bets: buildBets(race, honmei.horse.number, taikou ? taikou.horse.number : null, anaana ? anaana.horse.number : null)
    };
  });
}

module.exports = { computeOverallMarks, computeTipsterPicks };
