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

  await loadDaily(data);

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

async function loadDaily(diagnosis) {
  const res = await fetch(`/api/diagnosis/${diagnosisId}/daily`);
  const data = await res.json();
  if (!res.ok) return;

  document.getElementById('d-date').textContent = data.date;
  document.getElementById('d-kin').textContent = `KIN ${data.day.kin}`;
  document.getElementById('d-seal').textContent = `${data.day.seal.name}・${data.day.tone.name}`;

  if (data.locked) {
    document.getElementById('daily-locked').style.display = 'block';
    return;
  }

  document.getElementById('daily-personal').style.display = 'block';
  document.getElementById('d-score').textContent = '★'.repeat(data.score) + '☆'.repeat(5 - data.score);
  document.getElementById('d-theme').textContent = data.theme;
  document.getElementById('d-message').textContent = data.message;
  document.getElementById('d-color').textContent = data.luckyColor;
  document.getElementById('d-action').textContent = data.luckyAction;

  if (diagnosis.cancelAtPeriodEnd) {
    document.getElementById('cancel-sub-btn').style.display = 'none';
    document.getElementById('cancel-note').textContent = '解約手続き済みです。現在の請求期間の終了まではご利用いただけます。';
  }
}

document.getElementById('subscribe-btn').addEventListener('click', async () => {
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId }),
  });
  const data = await res.json();
  if (!res.ok) return;
  window.location.href = data.mock ? data.redirect : data.url;
});

document.getElementById('cancel-sub-btn').addEventListener('click', async () => {
  if (!window.confirm('月額会員を解約しますか?')) return;
  const res = await fetch('/api/subscription/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId }),
  });
  const data = await res.json();
  const note = document.getElementById('cancel-note');
  if (!res.ok) {
    note.textContent = data.error || '解約処理に失敗しました。';
    return;
  }
  if (data.immediate) {
    window.location.reload();
    return;
  }
  document.getElementById('cancel-sub-btn').style.display = 'none';
  note.textContent = '解約を受け付けました。現在の請求期間の終了まではご利用いただけます。';
});

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
