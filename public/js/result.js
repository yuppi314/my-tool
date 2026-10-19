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
  const query = new URLSearchParams({ s: params.get('s') || '', m: params.get('m') || '', lat: params.get('lat') || '', lon: params.get('lon') || '', o: params.get('o') || '' });
  const res = await fetch(`/api/diagnosis/${encodeURIComponent(diagnosisId)}?${query}`);
  const data = await res.json();
  if (!res.ok) {
    statusLine.textContent = data.error || '結果の取得に失敗しました。';
    return;
  }

  document.getElementById('r-star').textContent = data.star.name;
  document.getElementById('r-origin').textContent = data.origin;
  document.getElementById('r-trait').textContent = data.star.trait || data.summary;
  document.getElementById('r-color').textContent = data.star.color || '';
  document.getElementById('r-keywords').innerHTML = (data.star.keyword || '').split('・')
    .map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join('');
  renderGetsumei(data.getsumei);
  renderKeisha(data.keisha);
  renderToday(data.today);
  setupPlan();
  renderCompatible(data.compatible || []);

  renderMonth(data.month);
  renderDestinations(data.month, data.nextBestMonth);
  renderAffiliates(data.affiliates);
  if (window.setupShareCard) window.setupShareCard(data);

  if (data.paid) {
    statusLine.innerHTML = 'ご利用ありがとうございます <span class="badge">会員</span>';
    await loadCalendar();
    if (data.subscribed) setupCancel(data.cancelAtPeriodEnd);
  } else {
    statusLine.textContent = `${data.star.name}のあなたの、今月の吉方位とおすすめ旅先です。`;
    // 12か月カレンダーは公式LINEのプレゼントにしたため、有料の案内は出さない
    // document.getElementById('locked-card').style.display = 'block';
    if (!data.paymentsEnabled) {
      document.getElementById('coming-soon').style.display = 'block';
      document.getElementById('subscribe-btn').style.display = 'none';
      document.getElementById('unlock-btn').style.display = 'none';
    }
  }
}

function luckRow(d) {
  return `<div class="luck-row"><span class="dest-dir">${escapeHtml(d.direction)}</span><span>${escapeHtml(d.luck)}の運気とされます</span></div>`;
}

function renderGetsumei(g) {
  if (!g) return;
  document.getElementById('getsumei-box').style.display = 'block';
  document.getElementById('g-star').textContent = g.name;
  document.getElementById('g-keywords').innerHTML = g.keyword.split('・').map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join('');
  document.getElementById('g-note').textContent = g.note;
}

function renderKeisha(k) {
  if (!k) return;
  document.getElementById('keisha-box').style.display = 'block';
  document.getElementById('k-name').textContent = k.name;
  document.getElementById('k-yomi').textContent = `(${k.yomi})`;
  document.getElementById('k-words').textContent = k.words;
  document.getElementById('k-text').textContent = k.text;
}

// ===== 旅の計画(出かける日から / 行きたい場所から) =====
const LINE_URL = 'https://lin.ee/v27SJz85';
function planQuery(extra) {
  return new URLSearchParams({ s: params.get('s') || '', m: params.get('m') || '', lat: params.get('lat') || '',
    lon: params.get('lon') || '', o: params.get('o') || '', ...extra });
}
async function fetchPlan(path, extra) {
  const err = document.getElementById('plan-error');
  err.textContent = '';
  const res = await fetch(`/api/plan/${path}?${planQuery(extra)}`);
  const data = await res.json();
  if (!res.ok) { err.textContent = data.error || '調べられませんでした。'; return null; }
  return data;
}
function renderPlanDate(d) {
  let html = `<div class="plan-head">${escapeHtml(d.dateLabel)} は「${escapeHtml(d.monthLabel)}(${escapeHtml(d.period)})」の期間です</div>`;
  if (d.blocked || !d.best.length) {
    html += `<p>${escapeHtml(d.message)}</p>`;
  } else {
    html += '<p class="sub-label">この期間の最大吉方(◎はその日も吉の方角)</p>';
    html += d.best.map((b) => `<div class="luck-row"><span class="dest-dir">${escapeHtml(b.direction)}</span><span>${b.dayGood ? '◎ ' : ''}${escapeHtml(b.luck)}の運気とされます</span></div>`).join('');
    if (d.destinations.length) html += '<div class="sub-label" style="margin-top:12px;">ご自宅から行ける旅先</div>' + d.destinations.map(destinationHtml).join('');
  }
  if (!d.dayBlocked && d.dayDirections.length) {
    html += `<p class="board-legend">その日だけで見た吉方位(日帰りの目安): ${d.dayDirections.map((x) => escapeHtml(x.direction)).join('・')}</p>`;
  }
  document.getElementById('plan-date-result').innerHTML = html;
}
function renderPlanPlace(p) {
  let html = `<div class="plan-head">${escapeHtml(p.place)} は、ご自宅から <span class="dest-dir">${escapeHtml(p.direction)}</span> 約${p.distanceKm.toLocaleString()}km</div>`;
  html += `<p class="sub-label">${escapeHtml(p.direction)}は「${escapeHtml(p.luck)}」の運気とされる方角です。</p>`;
  if (p.tooClose) html += '<p class="sub-label">※吉方位旅は、ご自宅から100km以上離れた場所が目安とされます。</p>';
  if (p.months.length) {
    html += `<p>この先${p.freeMonths}か月で行くといい時期</p>` + p.months.map((m) =>
      `<div class="luck-row"><span class="dest-dir">◎</span><span><strong>${escapeHtml(m.label)}</strong>(${escapeHtml(m.period)})</span></div>`).join('');
  } else {
    html += `<p>この先${p.freeMonths}か月は、${escapeHtml(p.direction)}が最大吉方になる月はありません。</p>`;
  }
  if (p.moreCount) {
    html += `<div class="more-box">この先12か月では、ほかに<strong>${p.moreCount}回</strong>チャンスがあります🌙<br>12か月ぶんは、公式LINEのプレゼント「吉方位カレンダー」でチェックしてね<a class="line-btn" href="${LINE_URL}" target="_blank" rel="noopener">LINEで受け取る（無料）</a></div>`;
  } else if (!p.months.length) {
    html += '<p class="sub-label">この先1年は、この方角に吉方位が巡りません。ほかの旅先も調べてみてね。</p>';
  }
  document.getElementById('plan-place-result').innerHTML = html;
}
function renderPlanTrip(t) {
  let html = `<div class="plan-head">${escapeHtml(t.dateLabel)}に ${escapeHtml(t.place)} へ<br>ご自宅から <span class="dest-dir">${escapeHtml(t.direction)}</span> 約${t.distanceKm.toLocaleString()}km</div>`;
  html += `<div class="trip-verdict trip-${escapeHtml(t.level)}">${escapeHtml(t.title)}</div>`;
  html += `<p>${escapeHtml(t.message)}</p>`;
  if (t.near) html += '<p class="board-legend">※ご自宅から100km未満の近い場所なので、その日の吉方位(日盤)で見ています。</p>';
  else html += `<p class="board-legend">${escapeHtml(t.monthLabel)}(${escapeHtml(t.period)})の期間で見ています。年盤 ${t.year ? '○' : '×'}・月盤 ${t.month ? '○' : '×'}・その日 ${t.day ? '○' : '×'}</p>`;
  if (t.cautions.length) {
    html += '<div class="sub-label" style="margin-top:12px;">気をつけたいこと</div>' + t.cautions.map((c) =>
      `<div class="luck-row"><span class="dest-dir">${escapeHtml(c.name)}</span><span>${escapeHtml(c.note)}</span></div>`).join('');
  }
  html += `<div class="sub-label" style="margin-top:12px;">${t.level === 'caution' || t.level === 'rest' ? 'こう過ごすのがおすすめ' : '旅先でやるといいこと'}</div>`;
  html += '<ul class="todo-list">' + t.todo.map((x) => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>';
  if (t.level !== 'best') {
    html += t.next
      ? `<p class="sub-label">${escapeHtml(t.place)}が最大吉方になるのは <strong>${escapeHtml(t.next.label)}</strong>(${escapeHtml(t.next.period)})です。</p>`
      : `<p class="sub-label">この先1年は、${escapeHtml(t.direction)}が最大吉方になる月はありません。</p>`;
  }
  document.getElementById('plan-trip-result').innerHTML = html;
}
async function setupPlan() {
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    document.getElementById('tab-date').style.display = t.dataset.tab === 'date' ? 'block' : 'none';
    document.getElementById('tab-place').style.display = t.dataset.tab === 'place' ? 'block' : 'none';
    document.getElementById('tab-trip').style.display = t.dataset.tab === 'trip' ? 'block' : 'none';
  }));
  const dateInput = document.getElementById('plan-date');
  const today = new Date();
  dateInput.min = today.toISOString().slice(0, 10);
  document.getElementById('trip-date').min = dateInput.min;
  document.getElementById('plan-date-btn').addEventListener('click', async () => {
    if (!dateInput.value) { document.getElementById('plan-error').textContent = '日付を選んでください。'; return; }
    const d = await fetchPlan('date', { date: dateInput.value });
    if (d) renderPlanDate(d);
  });
  const sel = document.getElementById('plan-dest');
  try {
    const list = await (await fetch('/api/destinations')).json();
    const opt = (r, label) => `<optgroup label="${label}">${list.destinations.filter((x) => x.region === r).map((x) => `<option>${escapeHtml(x.name)}</option>`).join('')}</optgroup>`;
    sel.innerHTML += opt('domestic', '国内') + opt('overseas', '海外');
    document.getElementById('trip-dest').innerHTML += opt('domestic', '国内') + opt('overseas', '海外');
  } catch (e) { /* 一覧が取れなくても地名検索は使える */ }
  const runPlace = async () => {
    const dest = sel.value;
    const q = document.getElementById('plan-q').value.trim();
    if (!dest && !q) { document.getElementById('plan-error').textContent = '旅先を選ぶか、地名を入力してください。'; return; }
    const p = await fetchPlan('place', dest ? { dest } : { q });
    if (p) renderPlanPlace(p);
  };
  sel.addEventListener('change', () => { document.getElementById('plan-q').value = ''; if (sel.value) runPlace(); });
  document.getElementById('plan-place-btn').addEventListener('click', () => { sel.value = ''; runPlace(); });
  const tripSel = document.getElementById('trip-dest');
  const runTrip = async () => {
    const date = document.getElementById('trip-date').value;
    const dest = tripSel.value;
    const q = document.getElementById('trip-q').value.trim();
    if (!date) { document.getElementById('plan-error').textContent = '出かける日を選んでください。'; return; }
    if (!dest && !q) { document.getElementById('plan-error').textContent = '旅先を選ぶか、地名を入力してください。'; return; }
    const t = await fetchPlan('trip', dest ? { date, dest } : { date, q });
    if (t) renderPlanTrip(t);
  };
  tripSel.addEventListener('change', () => { document.getElementById('trip-q').value = ''; });
  document.getElementById('trip-btn').addEventListener('click', runTrip);
}

function renderToday(today) {
  if (!today) return;
  document.getElementById('t-label').textContent = today.label;
  const el = document.getElementById('t-list');
  if (today.blocked) {
    el.innerHTML = '<p>今日は八方塞がり。ゆっくり過ごして、次のお出かけの計画を立てる日にしましょう☕</p>';
  } else if (!today.directions.length) {
    el.innerHTML = '<p>今日は吉方位がありません。近所でのんびり過ごす日にしましょう。</p>';
  } else {
    el.innerHTML = today.directions.map(luckRow).join('');
  }
}

function renderCompatible(groups) {
  document.getElementById('c-list').innerHTML = groups.map((g) => `
    <div class="compat">
      <strong>${escapeHtml(g.title)}</strong>
      <div class="chips">${g.stars.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>
      <p class="sub-label">${escapeHtml(g.note)}</p>
    </div>`).join('');
}

function renderMonth(month) {
  document.getElementById('m-period').textContent = `${month.label}(${month.period})`;
  document.getElementById('m-centers').textContent = `年盤: ${month.yearCenter}中宮 / 月盤: ${month.monthCenter}中宮`;
  document.getElementById('m-message').textContent = month.message;
  document.getElementById('m-luck').innerHTML = (month.bestLuck || []).map(luckRow).join('');

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
