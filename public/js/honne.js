const el = (id) => document.getElementById(id);

const state = {
  questions: [],
  relations: [],
  index: 0,
  answers: {},
  resultId: null,
  prices: { honne: 980 },
};

// 既存の結果URL(?id=...)で開かれた場合は、その結果を再表示する
const params = new URLSearchParams(window.location.search);
const existingId = params.get('id');

init();

async function init() {
  try {
    const [qRes, pRes] = await Promise.all([fetch('/api/honne/questions'), fetch('/api/prices')]);
    const qData = await qRes.json();
    state.questions = qData.questions;
    state.relations = qData.relations;
    if (pRes.ok) state.prices = await pRes.json();
    el('honne-price').textContent = `¥${state.prices.honne}`;
    renderRelations();
  } catch (err) {
    el('intro-error').textContent = '質問の読み込みに失敗しました。ページを再読み込みしてください。';
  }

  if (existingId) loadExistingResult(existingId);
}

function renderRelations() {
  const select = el('relation');
  select.innerHTML = state.relations
    .map((r) => `<option value="${r.key}">${r.label}</option>`)
    .join('');
}

async function loadExistingResult(id) {
  try {
    const res = await fetch(`/api/honne/${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = await res.json();
    state.resultId = data.id;
    el('intro-card').style.display = 'none';
    renderResult(data);
    if (data.paid) {
      window.location.href = `/honne-result.html?id=${encodeURIComponent(id)}`;
    }
  } catch (err) {
    /* 取得できなければ通常の診断フローを表示する */
  }
}

el('start-btn').addEventListener('click', () => {
  if (!state.questions.length) {
    el('intro-error').textContent = '質問の読み込みが完了していません。少し待ってからお試しください。';
    return;
  }
  el('intro-error').textContent = '';
  el('intro-card').style.display = 'none';
  el('quiz-card').style.display = 'block';
  state.index = 0;
  renderQuestion();
});

function renderQuestion() {
  const q = state.questions[state.index];
  const total = state.questions.length;
  const current = state.index + 1;

  el('progress-fill').style.width = `${(current / total) * 100}%`;
  el('progress-label').textContent = `Q${current} / ${total}`;
  el('quiz-question').textContent = q.text;

  const chosen = state.answers[q.id];
  el('quiz-options').innerHTML = q.options
    .map(
      (label, i) =>
        `<button type="button" class="quiz-option${chosen === i ? ' selected' : ''}" data-index="${i}">${label}</button>`
    )
    .join('');

  el('quiz-options')
    .querySelectorAll('.quiz-option')
    .forEach((btn) => btn.addEventListener('click', () => choose(Number(btn.dataset.index))));

  el('back-btn').style.visibility = state.index === 0 ? 'hidden' : 'visible';
  el('quiz-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function choose(optionIndex) {
  const q = state.questions[state.index];
  state.answers[q.id] = optionIndex;

  if (state.index < state.questions.length - 1) {
    state.index += 1;
    renderQuestion();
  } else {
    el('progress-fill').style.width = '100%';
    el('quiz-card').style.display = 'none';
    el('email-card').style.display = 'block';
    el('email-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

el('back-btn').addEventListener('click', () => {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
  }
});

el('submit-btn').addEventListener('click', () => submitDiagnosis(el('email').value.trim()));
el('skip-btn').addEventListener('click', () => submitDiagnosis(''));

async function submitDiagnosis(email) {
  el('quiz-error').textContent = '';
  el('submit-btn').disabled = true;
  el('submit-btn').textContent = '診断中...';

  try {
    const res = await fetch('/api/honne/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: state.answers,
        relation: el('relation').value,
        targetLabel: el('target-label').value,
        email: email || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      el('quiz-error').textContent = data.error || '診断に失敗しました。';
      resetSubmitButton();
      return;
    }
    state.resultId = data.id;
    history.replaceState(null, '', `/honne.html?id=${data.id}`);
    el('email-card').style.display = 'none';
    renderResult(data);
  } catch (err) {
    el('quiz-error').textContent = '通信エラーが発生しました。';
    resetSubmitButton();
  }
}

function resetSubmitButton() {
  el('submit-btn').disabled = false;
  el('submit-btn').textContent = '本音を見る';
}

function renderResult(data) {
  el('r-headline').textContent = data.headline;
  el('r-type').textContent = data.type.name;
  el('r-catch').textContent = data.type.catch;
  el('r-honne').textContent = `「${data.type.honne}」`;

  el('r-open-axes').innerHTML = data.openAxes.map((a) => axisBar(a.name, a.score)).join('');
  el('r-locked-axes').innerHTML = data.lockedAxes.map((a) => lockedBar(a.name)).join('');

  el('result-card').style.display = 'block';
  el('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function axisBar(name, score) {
  return `
    <div class="axis-row">
      <div class="axis-head"><span>${name}</span><span class="axis-score">${score}</span></div>
      <div class="axis-track"><span style="width:${score}%"></span></div>
    </div>`;
}

function lockedBar(name) {
  return `
    <div class="axis-row locked-axis">
      <div class="axis-head"><span>${name}</span><span class="axis-score">🔒 ???</span></div>
      <div class="axis-track"><span style="width:100%"></span></div>
    </div>`;
}

el('checkout-btn').addEventListener('click', async () => {
  if (!state.resultId) return;
  const btn = el('checkout-btn');
  btn.disabled = true;
  btn.textContent = '処理中...';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosisId: state.resultId, kind: 'honne' }),
    });
    const data = await res.json();
    if (!res.ok) {
      el('quiz-error').textContent = data.error || '決済処理に失敗しました。';
      btn.disabled = false;
      btn.textContent = '完全版レポートを読む';
      return;
    }
    window.location.href = data.mock ? data.redirect : data.url;
  } catch (err) {
    el('quiz-error').textContent = '通信エラーが発生しました。';
    btn.disabled = false;
    btn.textContent = '完全版レポートを読む';
  }
});

// シェア導線(結果URLからは回答内容も相手の呼び名も推測できない)
function shareUrl() {
  return `${window.location.origin}/honne.html`;
}

function shareText() {
  const type = el('r-type').textContent;
  return `私の本音は「${type}」でした。あの人を本当はどう思っているかがわかる本音診断 ▼`;
}

el('share-x').addEventListener('click', () => {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(shareUrl())}`;
  window.open(url, '_blank', 'noopener');
});

el('share-line').addEventListener('click', () => {
  const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(shareText())}`;
  window.open(url, '_blank', 'noopener');
});

el('copy-btn').addEventListener('click', async () => {
  const url = state.resultId
    ? `${window.location.origin}/honne.html?id=${state.resultId}`
    : shareUrl();
  try {
    await navigator.clipboard.writeText(url);
    el('share-note').textContent = 'URLをコピーしました。この結果URLを開くと同じ診断結果が見られます。';
  } catch (err) {
    el('share-note').textContent = `コピーできませんでした。このURLをお使いください: ${url}`;
  }
});
