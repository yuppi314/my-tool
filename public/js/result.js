const params = new URLSearchParams(window.location.search);
const diagnosisId = params.get('id');
const statusLine = document.getElementById('status-line');

// 方位盤は北を上にした 3x3 で表示する
const BOARD_LAYOUT = ['北西', '北', '北東', '西', '中央', '東', '南西', '南', '南東'];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

if (!diagnosisId) {
  statusLine.textContent = '診断IDが見つかりません。トップページから診断をやり直してください。';
} else {
  init();
}

async function init() {
  // URLの本命星・地点も渡し、サーバーに記録が残っていなくても無料結果を表示できるようにする
  const query = new URLSearchParams({ s: params.get('s') || '', lat: params.get('lat') || '', lon: params.get('lon') || '', o: params.get('o') || '' });
  const res = await fetch(`/api/diagnosis/${encodeURIComponent(diagnosisId)}?${query}`);
  const data = await res.json();
  if (!res.ok) {
    statusLine.textContent = data.error || '結果の取得に失敗しました。';
    return;
  }

  document.getElementById('r-star').textContent = data.star.name;
  document.getElementById('r-origin').textContent = data.origin;
  document.getElementById('r-summary').textContent = data.summary;

  renderMonth(data.month);
  renderDestinations(data.month, data.nextBestMonth);
  renderAffiliates(data.affiliates);

  if (data.paid) {
    statusLine.innerHTML = 'ご利用ありがとうございます <span class="badge">会員</span>';
    await loadCalendar();
    if (data.subscribed) setupCancel(data.cancelAtPeriodEnd);
  } else {
    statusLine.textContent = `${data.star.name}のあなたの、今月の吉方位とおすすめ旅先です。`;
    document.getElementById('locked-card').style.display = 'block';
    if (!data.paymentsEnabled) {
      document.getElementById('coming-soon').style.display = 'block';
      document.getElementById('subscribe-btn').style.display = 'none';
      document.getElementById('unlock-btn').style.display = 'none';
    }
  }
}

function renderMonth(month) {
  document.getElementById('m-period').textContent = `${month.label}(${month.period})`;
  document.getElementById('m-centers').textContent = `年盤: ${month.yearCenter}中宮 / 月盤: ${month.monthCenter}中宮`;
  document.getElementById('m-message').textContent = month.message;

  const byDir = Object.fromEntries(month.directions.map((d) => [d.direction, d]));
  document.getElementById('m-board').innerHTML = BOARD_LAYOUT.map((dir) => {
    if (dir === '中央') {
      return `<div class="houi-cell center"><div class="dir">中宮</div><div class="star">${escapeHtml(month.monthCenter)}</div></div>`;
    }
    const d = byDir[dir];
    const cls = d.best ? 'best' : d.reasons.length ? 'bad' : '';
    const mark = d.best ? '◎' : d.reasons.length ? d.reasons.join('・') : '';
    return `<div class="houi-cell ${cls}"><div class="dir">${dir}</div><div class="star">${escapeHtml(d.monthStar)}</div><div class="mark">${escapeHtml(mark)}</div></div>`;
  }).join('');
}

function destinationHtml(d) {
  return `
    <div class="dest">
      <div class="dest-head"><span class="dest-dir">${escapeHtml(d.direction)}</span><strong>${escapeHtml(d.name)}</strong></div>
      <div class="dest-meta">約${d.distanceKm.toLocaleString()}km・${escapeHtml(d.airport)}空港・${escapeHtml(d.miles)}</div>
      <p class="dest-hint">${escapeHtml(d.hint)}</p>
      ${d.hotelUrl ? `<a class="hotel-link" href="${escapeHtml(d.hotelUrl)}" target="_blank" rel="sponsored noopener">${escapeHtml(d.name.split('・')[0])}周辺の宿を探す(楽天トラベル)<span class="pr-label">PR</span></a>` : ''}
    </div>`;
}

function renderDestinations(month, nextBestMonth) {
  const el = document.getElementById('dest-list');
  if (month.destinations.length) {
    el.innerHTML = month.destinations.map(destinationHtml).join('');
    return;
  }
  if (month.bestDirections.length) {
    el.innerHTML = '<p>吉方位はありますが、お住まいの地域からその方位にある登録済みの旅先がありません。</p>';
    return;
  }
  el.innerHTML = nextBestMonth
    ? `<p>今月は吉方位旅はお休み。次の最大吉方は <strong>${escapeHtml(nextBestMonth.label)}(${escapeHtml(nextBestMonth.period)})の「${escapeHtml(nextBestMonth.bestDirections.join('・'))}」</strong> です。それまでにマイルを貯めておきましょう。</p>`
    : '<p>この先12ヶ月は最大吉方がありません。近場の散策や、自宅の整理で気を整える時期です。</p>';
}

function renderAffiliates(items) {
  if (!items.length) return;
  document.getElementById('affiliate-card').style.display = 'block';
  document.getElementById('affiliate-list').innerHTML = items.map((a) => `
    <a class="affiliate" href="${escapeHtml(a.url)}" target="_blank" rel="sponsored noopener">
      <strong>${escapeHtml(a.title)}</strong>
      <span>${escapeHtml(a.description)}</span>
    </a>`).join('');
}

async function loadCalendar() {
  const res = await fetch(`/api/diagnosis/${diagnosisId}/calendar`);
  const data = await res.json();
  if (!res.ok) return;
  document.getElementById('calendar-card').style.display = 'block';
  document.getElementById('calendar-list').innerHTML = data.months.map((m) => {
    const head = `<div class="cal-head"><strong>${escapeHtml(m.label)}</strong><span class="sub-label">${escapeHtml(m.period)}</span></div>`;
    if (m.blocked) return `<div class="cal-month">${head}<p class="sub-label">八方塞がり(吉方位なし)</p></div>`;
    if (!m.bestDirections.length) return `<div class="cal-month">${head}<p class="sub-label">最大吉方なし</p></div>`;
    const places = m.destinations.map((d) => `${escapeHtml(d.name)}(${escapeHtml(d.direction)})`).join('、') || '登録済みの旅先なし';
    return `<div class="cal-month good">${head}<p>◎ ${escapeHtml(m.bestDirections.join('・'))}</p><p class="sub-label">${places}</p></div>`;
  }).join('');
}

function setupCancel(cancelAtPeriodEnd) {
  const btn = document.getElementById('cancel-sub-btn');
  const note = document.getElementById('cancel-note');
  if (cancelAtPeriodEnd) {
    note.textContent = '解約手続き済みです。現在の請求期間の終了まではご利用いただけます。';
    return;
  }
  btn.style.display = 'inline-block';
  btn.addEventListener('click', async () => {
    if (!window.confirm('月額会員を解約しますか?')) return;
    const res = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosisId }),
    });
    const data = await res.json();
    if (!res.ok) {
      note.textContent = data.error || '解約処理に失敗しました。';
      return;
    }
    if (data.immediate) {
      window.location.reload();
      return;
    }
    btn.style.display = 'none';
    note.textContent = '解約を受け付けました。現在の請求期間の終了まではご利用いただけます。';
  });
}

async function startCheckout(endpoint) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosisId }),
  });
  const data = await res.json();
  if (!res.ok) {
    statusLine.textContent = data.error || '決済の準備に失敗しました。';
    return;
  }
  window.location.href = data.mock ? data.redirect : data.url;
}

document.getElementById('subscribe-btn').addEventListener('click', () => startCheckout('/api/subscribe'));
document.getElementById('unlock-btn').addEventListener('click', () => startCheckout('/api/checkout'));
