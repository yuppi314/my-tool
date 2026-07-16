(function () {
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');
  const category = params.get('category') || 'central';
  const venue = params.get('venue');
  const raceNumber = params.get('raceNumber');

  const pageTitle = document.getElementById('page-title');
  const pageSub = document.getElementById('page-sub');
  const listEl = document.getElementById('race-list');
  const sortTabs = document.getElementById('sort-tabs');

  let races = [];
  let sortMode = 'time';

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
  }

  function render() {
    if (races.length === 0) {
      listEl.innerHTML = '<p class="empty-state">条件に合うレースが見つかりませんでした。トップページで条件を選び直してください。</p>';
      return;
    }
    const sorted = [...races].sort((a, b) => {
      if (sortMode === 'popularity') {
        const oa = a.honmeiHorse ? a.honmeiHorse.odds : 999;
        const ob = b.honmeiHorse ? b.honmeiHorse.odds : 999;
        return oa - ob;
      }
      return a.postTime.localeCompare(b.postTime);
    });
    listEl.innerHTML = sorted.map((r) => `
      <a class="race-card${r.raceNumber === 11 ? ' is-feature' : ''}" href="/race.html?id=${encodeURIComponent(r.id)}">
        <div class="rc-time">${r.postTime}<small>発走</small></div>
        <div class="rc-body">
          <div class="rc-name">${r.raceNumber}R ${escapeHtml(r.name)}</div>
          <div class="rc-meta">${r.surface}${r.distanceM}m ・ ${r.headcount}頭</div>
          ${r.honmeiHorse ? `<div class="rc-pick"><span class="mark-token mark-1">◎</span> ${r.honmeiHorse.number} ${escapeHtml(r.honmeiHorse.name)}${r.tipstersAgreeOnHonmei ? '' : ' ほか'}</div>` : ''}
        </div>
      </a>
    `).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  sortTabs.querySelectorAll('button[data-sort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sortMode = btn.dataset.sort;
      sortTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      render();
    });
  });

  const query = new URLSearchParams({ date: date || '', category, venue: venue || '' });
  if (raceNumber) query.set('raceNumber', raceNumber);

  fetch('/api/races?' + query)
    .then((r) => r.json())
    .then((data) => {
      races = data;
      if (raceNumber && races.length === 1) {
        window.location.replace('/race.html?id=' + encodeURIComponent(races[0].id));
        return;
      }
      pageTitle.textContent = venue ? `${venue}競馬場` : 'レース一覧';
      pageSub.textContent = date ? formatDate(date) + (races.length ? ` ・ 全${races.length}レース` : '') : '';
      render();
    });
})();
