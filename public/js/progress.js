const params = new URLSearchParams(window.location.search);
const diagnosisId = params.get('id');
const statusLine = document.getElementById('status-line');
const backLink = document.getElementById('back-link');

if (!diagnosisId) {
  statusLine.textContent = '診断IDが見つかりません。トップページから診断をやり直してください。';
} else {
  backLink.href = `/result.html?id=${diagnosisId}`;
  init();
}

let diagnosis = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function init() {
  document.getElementById('w-date').value = todayStr();
  document.getElementById('m-date').value = todayStr();
  document.getElementById('meal-date-label').textContent = todayStr();

  const res = await fetch(`/api/diagnosis/${diagnosisId}`);
  diagnosis = await res.json();
  if (!res.ok) {
    statusLine.textContent = diagnosis.error || '診断結果の取得に失敗しました。';
    return;
  }
  document.getElementById('m-target-cal').textContent = `${diagnosis.targetCalories} kcal`;

  await loadFoods();
  await loadWeightLogs();
  await loadMealLogs(todayStr());
}

async function loadFoods() {
  const res = await fetch('/api/foods');
  const data = await res.json();
  const select = document.getElementById('m-food');
  const manualOption = '<option value="manual">その他(手入力)</option>';
  select.innerHTML =
    manualOption +
    data.foods.map((f) => `<option value="${f.key}" data-grams="${f.defaultGrams}">${f.name}(${f.kcal100}kcal/100g)</option>`).join('');

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    const isManual = select.value === 'manual';
    document.getElementById('grams-field').style.display = isManual ? 'none' : 'block';
    document.getElementById('manual-fields').style.display = isManual ? 'block' : 'none';
    document.getElementById('m-grams').required = !isManual;
    if (!isManual) {
      document.getElementById('m-grams').value = opt.dataset.grams;
    }
  });
  select.dispatchEvent(new Event('change'));
}

document.getElementById('weight-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('weight-error');
  errorEl.textContent = '';
  const date = document.getElementById('w-date').value;
  const weightKg = Number(document.getElementById('w-value').value);

  const res = await fetch('/api/weight-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId, date, weightKg }),
  });
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || '記録に失敗しました。';
    return;
  }
  await loadWeightLogs();
});

async function loadWeightLogs() {
  const res = await fetch(`/api/weight-logs/${diagnosisId}`);
  const data = await res.json();
  if (!res.ok) return;
  renderChart(data.logs);
}

function renderChart(logs) {
  const wrap = document.getElementById('chart-wrap');
  if (logs.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-dim);font-size:0.9rem;">まだ記録がありません。今日の体重を記録してみましょう。</p>';
    return;
  }

  const startDate = new Date(diagnosis.createdAt.replace(' ', 'T') + 'Z');
  const startWeight = diagnosis.weightKg;
  const targetWeight = diagnosis.weightKg - diagnosis.targetKg;
  const periodDays = 30;

  const points = logs.map((l) => ({
    day: Math.round((new Date(l.date).getTime() - startDate.getTime()) / 86400000),
    weight: l.weightKg,
  }));

  const maxDay = Math.max(periodDays, ...points.map((p) => p.day), 1);
  const weights = points.map((p) => p.weight).concat([startWeight, targetWeight]);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;

  const W = 440;
  const H = 220;
  const padL = 42;
  const padR = 12;
  const padT = 16;
  const padB = 28;

  const x = (day) => padL + (day / maxDay) * (W - padL - padR);
  const y = (w) => padT + (1 - (w - minW) / (maxW - minW)) * (H - padT - padB);

  const targetLine = `M ${x(0)} ${y(startWeight)} L ${x(periodDays)} ${y(targetWeight)}`;
  const weightLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day)} ${y(p.weight)}`).join(' ');
  const circles = points.map((p) => `<circle cx="${x(p.day)}" cy="${y(p.weight)}" r="3.5" fill="#4ecb8f" />`).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:#0f2e26;border-radius:12px;">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#245b48" />
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#245b48" />
      <text x="4" y="${y(maxW) + 4}" fill="#b7ddc9" font-size="10">${maxW.toFixed(1)}</text>
      <text x="4" y="${y(minW) + 4}" fill="#b7ddc9" font-size="10">${minW.toFixed(1)}</text>
      <text x="${x(0)}" y="${H - 8}" fill="#b7ddc9" font-size="10">開始</text>
      <text x="${x(periodDays) - 24}" y="${H - 8}" fill="#b7ddc9" font-size="10">30日目</text>
      <path d="${targetLine}" stroke="#f2c14e" stroke-width="1.5" stroke-dasharray="4 4" fill="none" />
      <path d="${weightLine}" stroke="#4ecb8f" stroke-width="2.5" fill="none" />
      ${circles}
    </svg>
    <p style="color:var(--text-dim);font-size:0.75rem;margin-top:6px;">緑線: 実際の体重推移 / 黄色破線: 目標ペース(開始${startWeight}kg → 30日で${targetWeight.toFixed(1)}kg)</p>
  `;
}

document.getElementById('m-date').addEventListener('change', (e) => {
  document.getElementById('meal-date-label').textContent = e.target.value;
  loadMealLogs(e.target.value);
});

document.getElementById('meal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('meal-error');
  errorEl.textContent = '';
  const date = document.getElementById('m-date').value;
  const foodKey = document.getElementById('m-food').value;

  let payload;
  if (foodKey === 'manual') {
    const foodName = document.getElementById('m-manual-name').value.trim();
    const calories = Number(document.getElementById('m-manual-cal').value);
    if (!foodName) {
      errorEl.textContent = '食品名を入力してください。';
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      errorEl.textContent = 'カロリーを入力してください。';
      return;
    }
    payload = {
      diagnosisId,
      date,
      foodKey: 'manual',
      foodName,
      calories,
      proteinG: document.getElementById('m-manual-p').value || undefined,
      fatG: document.getElementById('m-manual-f').value || undefined,
      carbG: document.getElementById('m-manual-c').value || undefined,
    };
  } else {
    payload = { diagnosisId, date, foodKey, grams: Number(document.getElementById('m-grams').value) };
  }

  const res = await fetch('/api/meal-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || '記録に失敗しました。';
    return;
  }
  if (foodKey === 'manual') {
    document.getElementById('m-manual-name').value = '';
    document.getElementById('m-manual-cal').value = '';
    document.getElementById('m-manual-p').value = '';
    document.getElementById('m-manual-f').value = '';
    document.getElementById('m-manual-c').value = '';
  }
  await loadMealLogs(date);
});

async function loadMealLogs(date) {
  const res = await fetch(`/api/meal-logs/${diagnosisId}?date=${date}`);
  const data = await res.json();
  if (!res.ok) return;

  document.getElementById('m-total-cal').textContent = `${data.totals.calories} kcal`;

  const table = document.getElementById('meal-table');
  if (data.logs.length === 0) {
    table.innerHTML = '<tr><td style="color:var(--text-dim);">この日の記録はまだありません。</td></tr>';
    return;
  }
  table.innerHTML =
    '<tr><th>食品</th><th>量</th><th>カロリー</th><th>P/F/C</th><th></th></tr>' +
    data.logs
      .map(
        (l) =>
          `<tr><td>${l.foodName}</td><td>${l.grams != null ? l.grams + 'g' : '-'}</td><td>${l.calories}kcal</td><td>${l.proteinG}/${l.fatG}/${l.carbG}g</td><td style="white-space:nowrap;"><a href="#" data-id="${l.id}" class="delete-meal" style="color:var(--danger);">削除</a></td></tr>`
      )
      .join('');

  document.querySelectorAll('.delete-meal').forEach((el) => {
    el.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await fetch(`/api/meal-logs/${ev.target.dataset.id}`, { method: 'DELETE' });
      await loadMealLogs(document.getElementById('m-date').value);
    });
  });
}
