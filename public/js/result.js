const params = new URLSearchParams(window.location.search);
const diagnosisId = params.get('id');
const statusLine = document.getElementById('status-line');
const fullCard = document.getElementById('full-card');
const lockedCard = document.getElementById('locked-card');

const SAFETY_LABEL = { safe: '安全', caution: 'やや意欲的', unsafe: '急ぎすぎ注意' };

if (!diagnosisId) {
  statusLine.textContent = '診断IDが見つかりません。トップページから診断をやり直してください。';
} else {
  init();
}

async function init() {
  const res = await fetch(`/api/diagnosis/${diagnosisId}`);
  const data = await res.json();
  if (!res.ok) {
    statusLine.textContent = data.error || '結果の取得に失敗しました。';
    return;
  }

  document.getElementById('r-bmr').textContent = `${data.bmr} kcal`;
  document.getElementById('r-tdee').textContent = `${data.tdee} kcal`;
  document.getElementById('r-target').textContent = `${data.targetCalories} kcal`;
  document.getElementById('r-safety').textContent = SAFETY_LABEL[data.safetyLevel] || data.safetyLevel;
  document.getElementById('r-summary').textContent = `${data.summary} ${data.safetyMessage}`;
  document.getElementById('r-protein').textContent = `${data.macros.proteinG} g`;
  document.getElementById('r-fat').textContent = `${data.macros.fatG} g`;
  document.getElementById('r-carb').textContent = `${data.macros.carbG} g`;
  document.getElementById('progress-link').href = `/progress.html?id=${diagnosisId}`;

  if (data.paid) {
    statusLine.innerHTML = 'ご購入ありがとうございます <span class="badge">unlocked</span>';
    await loadFull();
  } else {
    statusLine.textContent = '無料診断の結果です。4週間プログラムで週別プラン・運動アドバイスまで見られます。';
    fullCard.style.display = 'none';
    lockedCard.style.display = 'block';
  }
}

async function loadFull() {
  const res = await fetch(`/api/diagnosis/${diagnosisId}/full`);
  const data = await res.json();
  if (!res.ok) return;

  const table = document.getElementById('week-table');
  table.innerHTML =
    '<tr><th>週</th><th>目標カロリー</th><th>P/F/C</th><th>ポイント</th></tr>' +
    data.weeklyPlan
      .map(
        (w) =>
          `<tr><td>第${w.week}週</td><td>${w.calories} kcal</td><td>${w.macros.proteinG}/${w.macros.fatG}/${w.macros.carbG} g</td><td>${w.note}</td></tr>`
      )
      .join('');

  document.getElementById('f-exercise').textContent = data.exercise;
  document.getElementById('f-plateau').textContent = data.plateauTips;
  document.getElementById('f-advice').textContent = data.advice;
}

document.getElementById('unlock-btn').addEventListener('click', async () => {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId }),
  });
  const data = await res.json();
  if (!res.ok) return;
  window.location.href = data.mock ? data.redirect : data.url;
});
