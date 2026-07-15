const form = document.getElementById('diagnosis-form');
const errorEl = document.getElementById('form-error');
const resultCard = document.getElementById('result-card');
const checkoutBtn = document.getElementById('checkout-btn');

const SAFETY_LABEL = { safe: '安全', caution: 'やや意欲的', unsafe: '急ぎすぎ注意' };

let currentDiagnosisId = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const payload = {
    gender: document.getElementById('gender').value,
    age: Number(document.getElementById('age').value),
    heightCm: Number(document.getElementById('heightCm').value),
    weightKg: Number(document.getElementById('weightKg').value),
    activityLevel: Number(document.getElementById('activityLevel').value),
    targetKg: Number(document.getElementById('targetKg').value),
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
  };

  try {
    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
  document.getElementById('r-bmr').textContent = `${data.bmr} kcal`;
  document.getElementById('r-tdee').textContent = `${data.tdee} kcal`;
  document.getElementById('r-target').textContent = `${data.targetCalories} kcal`;
  document.getElementById('r-safety').textContent = SAFETY_LABEL[data.safetyLevel] || data.safetyLevel;
  document.getElementById('r-summary').textContent = `${data.summary} ${data.safetyMessage}`;
  document.getElementById('r-protein').textContent = `${data.macros.proteinG} g`;
  document.getElementById('r-fat').textContent = `${data.macros.fatG} g`;
  document.getElementById('r-carb').textContent = `${data.macros.carbG} g`;
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
      checkoutBtn.textContent = '詳細プランを見る';
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
    checkoutBtn.textContent = '詳細プランを見る';
  }
});
