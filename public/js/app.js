const form = document.getElementById('diagnosis-form');
const errorEl = document.getElementById('form-error');
const originSelect = document.getElementById('origin');
const submitBtn = document.getElementById('submit-btn');

async function loadOrigins() {
  try {
    const res = await fetch('/api/origins');
    const data = await res.json();
    for (const origin of data.origins) {
      const option = document.createElement('option');
      option.value = origin.id;
      option.textContent = origin.name;
      originSelect.appendChild(option);
    }
  } catch (err) {
    errorEl.textContent = '地域の一覧を読み込めませんでした。ページを再読み込みしてください。';
  }
}

loadOrigins();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const birthdate = document.getElementById('birthdate').value;
  const origin = originSelect.value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  if (!birthdate || !origin) {
    errorEl.textContent = '生年月日とお住まいの地域を入力してください。';
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate, origin, name, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '診断に失敗しました。';
      submitBtn.disabled = false;
      return;
    }
    window.location.href = `/result.html?id=${data.id}`;
  } catch (err) {
    errorEl.textContent = '通信エラーが発生しました。';
    submitBtn.disabled = false;
  }
});
