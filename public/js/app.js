const form = document.getElementById('diagnosis-form');
const errorEl = document.getElementById('form-error');
const resultCard = document.getElementById('result-card');
const checkoutBtn = document.getElementById('checkout-btn');

let currentDiagnosisId = null;
let paymentMode = 'comingsoon';

// 販売準備中は購入ボタンを「近日公開」に差し替える(押しても買えないボタンを残さない)
fetch('/api/config')
  .then((res) => (res.ok ? res.json() : null))
  .then((config) => {
    if (!config) return;
    paymentMode = config.paymentMode;
    document.getElementById('price-label').textContent = `¥${config.prices.birth.toLocaleString()}`;
    if (paymentMode === 'comingsoon') {
      document.getElementById('price-label').textContent = '近日公開';
      checkoutBtn.textContent = '詳細レポートは近日公開';
      checkoutBtn.disabled = true;
    }
  })
  .catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const birthdate = document.getElementById('birthdate').value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  if (!birthdate) {
    errorEl.textContent = '生年月日を入力してください。';
    return;
  }

  try {
    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate, name, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '診断に失敗しました。';
      return;
    }
    currentDiagnosisId = data.id;
    renderResult(data);
  } catch (err) {
    errorEl.textContent = '通信エラーが発生しました。';
  }
});

function renderResult(data) {
  document.getElementById('r-star').textContent = `${data.star.name}`;
  document.getElementById('r-kin').textContent = `KIN ${data.kin}`;
  document.getElementById('r-seal').textContent = data.seal.name;
  document.getElementById('r-tone').textContent = data.tone.name;
  document.getElementById('r-summary').textContent = data.summary;
  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

checkoutBtn.addEventListener('click', async () => {
  if (!currentDiagnosisId) return;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = '処理中...';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosisId: currentDiagnosisId }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '決済処理に失敗しました。';
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = '詳細レポートを見る';
      return;
    }
    if (data.mock) {
      window.location.href = data.redirect;
    } else {
      window.location.href = data.url;
    }
  } catch (err) {
    errorEl.textContent = '通信エラーが発生しました。';
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = '詳細レポートを見る';
  }
});
