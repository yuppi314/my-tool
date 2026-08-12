const params = new URLSearchParams(window.location.search);
const diagnosisId = params.get('id');
const statusLine = document.getElementById('status-line');
const fullCard = document.getElementById('full-card');
const lockedCard = document.getElementById('locked-card');
const compatCard = document.getElementById('compat-card');

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

  document.getElementById('r-star').textContent = data.star.name;
  document.getElementById('r-kin').textContent = `KIN ${data.kin}`;
  document.getElementById('r-seal').textContent = data.seal.name;
  document.getElementById('r-tone').textContent = data.tone.name;
  document.getElementById('r-summary').textContent = data.summary;

  if (data.paid) {
    statusLine.innerHTML = 'ご購入ありがとうございます <span class="badge">unlocked</span>';
    await loadFull();
    compatCard.style.display = 'block';
  } else {
    statusLine.textContent = '無料診断の結果です。詳細レポートで運勢・相性まで見られます。';
    fullCard.style.display = 'none';
    lockedCard.style.display = 'block';
  }
}

async function loadFull() {
  const res = await fetch(`/api/diagnosis/${diagnosisId}/full`);
  const data = await res.json();
  if (!res.ok) return;
  document.getElementById('f-personality').textContent = data.personality;
  document.getElementById('f-yearly').textContent = data.yearlyFortune;
  document.getElementById('f-monthly').textContent = data.monthlyFortune;
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

document.getElementById('compat-btn').addEventListener('click', async () => {
  const partnerBirthdate = document.getElementById('partner-birthdate').value;
  const resultEl = document.getElementById('compat-result');
  if (!partnerBirthdate) {
    resultEl.innerHTML = '<p class="error-text">お相手の生年月日を入力してください。</p>';
    return;
  }
  const res = await fetch('/api/compatibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId, partnerBirthdate }),
  });
  const data = await res.json();
  if (!res.ok) {
    resultEl.innerHTML = `<p class="error-text">${data.error || '相性診断に失敗しました。'}</p>`;
    return;
  }
  resultEl.innerHTML = `
    <div class="stat-box" style="margin-bottom:12px;">
      <div class="label">相性スコア</div>
      <div class="value">${data.compatibility.score} / 100</div>
    </div>
    <p>${data.compatibility.text}</p>
  `;
});
