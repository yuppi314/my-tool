const el = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const resultId = params.get('id');

if (!resultId) {
  el('status-line').textContent = '診断IDが指定されていません。';
} else {
  load();
}

async function load() {
  // まず無料結果(タイプ名・本音の一行)を表示し、その後に有料部分を取得する
  try {
    const res = await fetch(`/api/honne/${encodeURIComponent(resultId)}`);
    const data = await res.json();
    if (!res.ok) {
      el('status-line').textContent = data.error || '診断結果が見つかりません。';
      return;
    }
    renderSummary(data);
    if (params.get('canceled')) {
      el('status-line').textContent = '決済はキャンセルされました。';
    }
    await loadFull();
  } catch (err) {
    el('status-line').textContent = '通信エラーが発生しました。';
  }
}

function renderSummary(data) {
  el('r-headline').textContent = data.headline;
  el('r-type').textContent = data.type.name;
  el('r-catch').textContent = data.type.catch;
  el('r-honne').textContent = `「${data.type.honne}」`;
  el('summary-card').style.display = 'block';
}

async function loadFull() {
  const res = await fetch(`/api/honne/${encodeURIComponent(resultId)}/full`);
  const data = await res.json();

  if (res.status === 402) {
    el('status-line').textContent = '完全版レポートは購入後に表示されます。';
    el('locked-card').style.display = 'block';
    return;
  }
  if (!res.ok) {
    el('status-line').textContent = data.error || 'レポートの取得に失敗しました。';
    return;
  }

  el('status-line').textContent = `${data.target.who}への本音 / 購入済み`;
  el('f-axes').innerHTML = data.axes.map(axisBlock).join('');
  el('f-balance').textContent = data.balance;
  el('f-deep').textContent = data.deep;
  el('f-conflict').textContent = data.conflict;
  el('f-mirror').textContent = data.mirror;
  el('f-forecast').textContent = data.forecast;
  el('f-todo').innerHTML = data.todo.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  el('f-ng').innerHTML = data.ng.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  el('full-card').style.display = 'block';
  el('cross-card').style.display = 'block';
}

function axisBlock(axis) {
  return `
    <div class="axis-row">
      <div class="axis-head"><span>${escapeHtml(axis.name)}</span><span class="axis-score">${axis.score}</span></div>
      <div class="axis-track"><span style="width:${axis.score}%"></span></div>
      <div class="axis-comment">${escapeHtml(axis.comment)}</div>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

el('unlock-btn').addEventListener('click', async () => {
  const btn = el('unlock-btn');
  btn.disabled = true;
  btn.textContent = '処理中...';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosisId: resultId, kind: 'honne' }),
    });
    const data = await res.json();
    if (!res.ok) {
      el('page-error').textContent = data.error || '決済処理に失敗しました。';
      btn.disabled = false;
      btn.textContent = '完全版レポートを購入する';
      return;
    }
    window.location.href = data.mock ? data.redirect : data.url;
  } catch (err) {
    el('page-error').textContent = '通信エラーが発生しました。';
    btn.disabled = false;
    btn.textContent = '完全版レポートを購入する';
  }
});

el('cross-btn').addEventListener('click', async () => {
  const yourBirthdate = el('your-birthdate').value;
  const partnerBirthdate = el('partner-birthdate').value;
  const out = el('cross-result');

  if (!yourBirthdate || !partnerBirthdate) {
    out.innerHTML = '<p class="error-text">2名分の生年月日を入力してください。</p>';
    return;
  }

  out.textContent = '診断中...';
  try {
    const res = await fetch(`/api/honne/${encodeURIComponent(resultId)}/cross`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yourBirthdate, partnerBirthdate }),
    });
    const data = await res.json();
    if (!res.ok) {
      out.innerHTML = `<p class="error-text">${escapeHtml(data.error || 'クロス診断に失敗しました。')}</p>`;
      return;
    }
    out.innerHTML = `
      <div class="stat-box"><div class="label">相性スコア</div><div class="value">${data.compatibility.score} / 100</div></div>
      <div class="summary-text">${escapeHtml(data.compatibility.text)}</div>
      <div class="summary-text">${escapeHtml(data.crossNote)}</div>
      <p class="note-text">あなた: ${escapeHtml(data.you.star.name)} / ${escapeHtml(data.you.seal.name)}　お相手: ${escapeHtml(data.partner.star.name)} / ${escapeHtml(data.partner.seal.name)}</p>`;
  } catch (err) {
    out.innerHTML = '<p class="error-text">通信エラーが発生しました。</p>';
  }
});
