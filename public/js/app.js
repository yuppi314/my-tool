const form = document.getElementById('diagnosis-form');
const errorEl = document.getElementById('form-error');
const originSelect = document.getElementById('origin');
const addressInput = document.getElementById('address');
const statusEl = document.getElementById('origin-status');
const submitBtn = document.getElementById('submit-btn');

// 方位の基準にする地点: { originLabel, originLat, originLon } または { origin: 都市ID }
let selectedOrigin = null;

function setOrigin(origin, label) {
  selectedOrigin = origin;
  statusEl.textContent = origin ? `「${label}」を基準に方位を計算します` : '';
}

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
    errorEl.textContent = '都市の一覧を読み込めませんでした。ページを再読み込みしてください。';
  }
}

loadOrigins();

async function searchAddress() {
  const q = addressInput.value.trim();
  errorEl.textContent = '';
  if (!q) {
    errorEl.textContent = '住所を入力してください(市区町村まででOK)。';
    return;
  }
  statusEl.textContent = '住所を検索しています...';
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) {
      setOrigin(null);
      errorEl.textContent = data.error || '住所が見つかりませんでした。';
      return;
    }
    originSelect.value = '';
    setOrigin({ originLabel: data.name, originLat: data.lat, originLon: data.lon }, data.name);
  } catch (err) {
    setOrigin(null);
    errorEl.textContent = '通信エラーが発生しました。近くの都市から選ぶこともできます。';
  }
}

document.getElementById('address-btn').addEventListener('click', searchAddress);
addressInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchAddress();
  }
});

document.getElementById('geo-btn').addEventListener('click', () => {
  errorEl.textContent = '';
  if (!navigator.geolocation) {
    errorEl.textContent = 'この端末では現在地を取得できません。住所を入力してください。';
    return;
  }
  statusEl.textContent = '現在地を取得しています...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      originSelect.value = '';
      setOrigin({ originLabel: 'ご自宅(現在地)', originLat: pos.coords.latitude, originLon: pos.coords.longitude }, 'ご自宅(現在地)');
    },
    () => {
      setOrigin(null);
      errorEl.textContent = '現在地を取得できませんでした。住所を入力してください。';
    },
    { timeout: 10000 }
  );
});

originSelect.addEventListener('change', () => {
  const option = originSelect.selectedOptions[0];
  setOrigin(originSelect.value ? { origin: originSelect.value } : null, option ? option.textContent : '');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const birthdate = document.getElementById('birthdate').value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  if (!birthdate || !selectedOrigin) {
    errorEl.textContent = '生年月日と、お住まい(住所・現在地・都市のいずれか)を入力してください。';
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate, name, email, ...selectedOrigin }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '診断に失敗しました。';
      submitBtn.disabled = false;
      return;
    }
    const params = new URLSearchParams({ id: data.id, s: data.s, lat: data.lat, lon: data.lon, o: data.o });
    window.location.href = `/result.html?${params}`;
  } catch (err) {
    errorEl.textContent = '通信エラーが発生しました。';
    submitBtn.disabled = false;
  }
});
