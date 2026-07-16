(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const MARK_CLASS = { '◎': 'mark-1', '○': 'mark-2', '▲': 'mark-3', '△': 'mark-4' };
  const SILKS = [
    ['#2757c4', '#fbfaf6'], ['#ef9fc0', '#171310'], ['#dd7c1e', '#fbfaf6'],
    ['#2c8a4e', '#fbfaf6'], ['#c9342a', '#fbfaf6'], ['#eec22e', '#171310']
  ];
  const BET_ROWS = [
    ['単勝', 'tansho'], ['複勝', 'fukusho'], ['枠連', 'wakuren'], ['馬連', 'umaren'],
    ['ワイド', 'wide'], ['三連複', 'sanrenpuku'], ['三連単', 'sanrentan']
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderHead(race) {
    document.getElementById('back-link').href = `/races.html?date=${race.date}&category=${race.category}&venue=${encodeURIComponent(race.venue)}`;
    document.getElementById('race-head-block').innerHTML = `
      <div class="race-head">
        <div class="rh-name">${race.raceNumber}R ${escapeHtml(race.name)}</div>
        <div class="rh-meta">
          <span>${escapeHtml(race.venue)}・${race.surface}${race.distanceM}m</span>
          <span>${race.postTime}発走</span>
          <span>${race.weather} / ${race.trackCondition}</span>
          <span>${race.headcount}頭立て</span>
        </div>
        <p class="pace-note">展開メモ: ${escapeHtml(race.paceNote)}</p>
      </div>`;
    document.title = `${race.raceNumber}R ${race.name} | 予想びより`;
  }

  function renderHorses(race) {
    const rows = race.horses.map((h, i) => {
      const [c1, c2] = SILKS[i % SILKS.length];
      const markClass = MARK_CLASS[h.overallMark] || '';
      const move = h.oddsMove === 'down'
        ? '<span class="odds-move down">▼</span>'
        : h.oddsMove === 'up' ? '<span class="odds-move up">▲</span>' : '';
      return `
        <tr>
          <td class="num"><span class="waku waku-${h.waku}">${h.waku}</span></td>
          <td class="num">${h.number}</td>
          <td class="horse-name">
            <span class="silks" style="background:linear-gradient(135deg,${c1} 50%,${c2} 50%)"></span>
            ${escapeHtml(h.name)}<small>${h.sex}${h.age}・${escapeHtml(h.jockey)}</small>
          </td>
          <td class="odds">${h.odds.toFixed(1)}${move}</td>
          <td class="mark ${markClass}">${h.overallMark || ''}</td>
        </tr>`;
    }).join('');
    document.getElementById('horses-table').innerHTML = `
      <tr><th>枠</th><th>馬</th><th>馬名</th><th>オッズ</th><th>総合印</th></tr>
      ${rows}`;
  }

  function renderTipsters(race, tipsters) {
    const byId = Object.fromEntries(tipsters.map((t) => [t.id, t]));
    const cards = race.tipsterPicks.map((pick) => {
      const t = byId[pick.tipsterId];
      const honmeiHorse = race.horses.find((h) => h.number === pick.honmei);
      const taikouHorse = race.horses.find((h) => h.number === pick.taikou);
      return `
        <div class="tipster-card">
          <div class="tipster-avatar ${t.id}">${tipsterAvatarSvg(t.id)}</div>
          <div class="tipster-body">
            <div class="tipster-name">${escapeHtml(t.name)}<span class="tipster-role">・${escapeHtml(t.style)}</span></div>
            <div class="tipster-pick">
              <span class="mark-token mark-1">◎</span>${pick.honmei} ${escapeHtml(honmeiHorse ? honmeiHorse.name : '')}
              <span class="mark-token mark-2">○</span>${pick.taikou} ${escapeHtml(taikouHorse ? taikouHorse.name : '')}
            </div>
            <div class="tipster-comment">「${escapeHtml(pick.comment)}」</div>
          </div>
        </div>`;
    }).join('');
    document.getElementById('tipster-cards').innerHTML = cards;

    const honmeiCounts = {};
    race.tipsterPicks.forEach((p) => { honmeiCounts[p.honmei] = (honmeiCounts[p.honmei] || 0) + 1; });
    const [topNumber, topCount] = Object.entries(honmeiCounts).sort((a, b) => b[1] - a[1])[0];
    const consensusEl = document.getElementById('consensus-note');
    if (topCount > 1) {
      const horse = race.horses.find((h) => h.number === Number(topNumber));
      consensusEl.textContent = `3人中${topCount}人が「${topNumber} ${horse ? horse.name : ''}」を◎に推しています`;
    } else {
      consensusEl.textContent = '今回は3人の◎(本命)がすべて割れています。見比べて参考にしてください。';
    }
  }

  function renderBets(race) {
    const picks = race.tipsterPicks;
    const rows = BET_ROWS.map(([label, key]) => {
      const values = picks.map((p) => p.bets[key]);
      const counts = {};
      values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      const cells = values.map((v) => `<td class="${counts[v] > 1 ? 'agree' : ''}">${escapeHtml(v)}</td>`).join('');
      return `<tr><td>${label}</td>${cells}</tr>`;
    }).join('');
    const headerCells = picks.map((p) => `<th>${escapeHtml(p.tipsterId === 'databall' ? 'データ丸' : p.tipsterId === 'ketto' ? '血統じい' : '直感マキ')}</th>`).join('');
    document.getElementById('bets-table').innerHTML = `<tr><th></th>${headerCells}</tr>${rows}`;
  }

  if (!id) {
    document.querySelector('.container').innerHTML = '<p class="empty-state">レースが指定されていません。<a href="/">トップページに戻る</a></p>';
  } else {
    Promise.all([
      fetch('/api/races/' + encodeURIComponent(id)).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/tipsters').then((r) => r.json())
    ]).then(([race, tipsters]) => {
      renderHead(race);
      renderHorses(race);
      renderTipsters(race, tipsters);
      renderBets(race);
    }).catch(() => {
      document.querySelector('.container').innerHTML = '<p class="empty-state">レースが見つかりませんでした。<a href="/">トップページに戻る</a></p>';
    });
  }
})();
