const KAIGYO_TOKEN_KEY = 'kaigyoToken';

function getKaigyoToken() {
  return localStorage.getItem(KAIGYO_TOKEN_KEY) || '';
}

function setKaigyoToken(token) {
  localStorage.setItem(KAIGYO_TOKEN_KEY, token);
}

function requireKaigyoLogin() {
  if (!getKaigyoToken()) {
    window.location.href = '/kaigyo/login.html';
  }
}

async function kaigyoFetch(path, options = {}) {
  const opts = { ...options };
  opts.headers = { ...(opts.headers || {}), 'x-kaigyo-token': getKaigyoToken() };
  if (opts.body && typeof opts.body !== 'string') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  if (res.status === 401) {
    window.location.href = '/kaigyo/login.html';
    throw new Error('ログインが必要です');
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function formatDate(dateStr) {
  if (!dateStr) return '期限なし';
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function dueBadgeHtml(dateStr) {
  if (!dateStr) return '<span class="badge">期限なし</span>';
  const days = daysUntil(dateStr);
  if (days < 0) return `<span class="badge badge-overdue">期限切れ(${formatDate(dateStr)})</span>`;
  if (days <= 7) return `<span class="badge badge-soon">あと${days}日(${formatDate(dateStr)})</span>`;
  return `<span class="badge">${formatDate(dateStr)}まで</span>`;
}

function statusLabel(status) {
  return { todo: 'まだやっていない', in_progress: 'やっている途中', done: '終わった' }[status] || status;
}

function renderKaigyoNav(activePage) {
  const items = [
    ['index.html', 'ホーム'],
    ['tasks.html', 'やることリスト'],
    ['documents.html', '書類を作る'],
    ['subsidies.html', '補助金・助成金'],
    ['setup.html', '設定'],
  ];
  const nav = document.getElementById('kaigyo-nav');
  if (!nav) return;
  nav.innerHTML = items
    .map(([href, label]) => `<a href="${href}" class="${href === activePage ? 'active' : ''}">${label}</a>`)
    .join('');
}
