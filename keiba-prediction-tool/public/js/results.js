(function () {
  // Sample/illustrative datasets only — swapped in until real settlement data exists.
  const DATASETS = {
    week: {
      trend: [56, 60, 54, 57, 58],
      bets: { 単勝: 30, 複勝: 57, 枠連: 22, 馬連: 18, ワイド: 39, 三連複: 11, 三連単: 5 },
      tipsters: { データ丸: 32, 血統じい: 27, 直感マキ: 16 },
      venues: { 小倉: 58, 福島: 52 }
    },
    month: {
      trend: [54, 57, 52, 60, 63, 59, 61, 58],
      bets: { 単勝: 32, 複勝: 58, 枠連: 24, 馬連: 19, ワイド: 41, 三連複: 12, 三連単: 6 },
      tipsters: { データ丸: 34, 血統じい: 29, 直感マキ: 18 },
      venues: { 小倉: 61, 福島: 55, 新潟: 48 }
    },
    all: {
      trend: [51, 55, 58, 56, 60, 62, 59, 63, 60, 63],
      bets: { 単勝: 34, 複勝: 60, 枠連: 26, 馬連: 21, ワイド: 43, 三連複: 14, 三連単: 7 },
      tipsters: { データ丸: 36, 血統じい: 31, 直感マキ: 20 },
      venues: { 小倉: 63, 福島: 57, 新潟: 51 }
    }
  };

  const HISTORY = [
    { race: '7/13 小倉12R', pick: '◎7', result: '1着', hit: true },
    { race: '7/13 小倉11R', pick: '◎3', result: '4着', hit: false },
    { race: '7/12 福島9R', pick: '◎9', result: '2着', hit: true },
    { race: '7/12 福島6R', pick: '◎1', result: '1着', hit: true }
  ];

  function renderSparkline(values) {
    const w = 300, h = 60, pad = 6;
    const min = Math.min(...values) - 4;
    const max = Math.max(...values) + 4;
    const stepX = w / (values.length - 1);
    const yFor = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    const points = values.map((v, i) => [i * stepX, yFor(v)]);
    const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = linePath + ` L${w},${h} L0,${h} Z`;
    document.getElementById('spark-line').setAttribute('d', linePath);
    document.getElementById('spark-area').setAttribute('d', areaPath);
    const last = points[points.length - 1];
    document.getElementById('spark-dot').setAttribute('cx', last[0]);
    document.getElementById('spark-dot').setAttribute('cy', last[1]);
    const label = document.getElementById('spark-label');
    label.textContent = values[values.length - 1] + '%';
    label.setAttribute('x', Math.max(last[0] - 8, 20));
    label.setAttribute('y', Math.max(last[1] - 8, 10));

    const current = values[values.length - 1];
    const prev = values[0];
    const delta = current - prev;
    document.getElementById('sp-value').innerHTML = current + '<small>%</small>';
    const deltaEl = document.getElementById('sp-delta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + delta + 'pt(期間内)';
  }

  function renderBars(bets) {
    const max = Math.max(...Object.values(bets));
    const entries = Object.entries(bets).sort((a, b) => b[1] - a[1]);
    document.getElementById('bet-bars').innerHTML = entries.map(([label, pct]) => `
      <div class="stat-bar-row">
        <div class="stat-bar-label">${label} <b>${pct}%</b></div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
      </div>`).join('');
  }

  function renderCompare(elId, data, color) {
    document.getElementById(elId).innerHTML = Object.entries(data).map(([name, pct]) => `
      <div class="compare-row">
        <span class="name">${name}</span>
        <div class="track"><div class="fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="pct">${pct}%</span>
      </div>`).join('');
  }

  function renderHistory() {
    document.getElementById('history-list').innerHTML = HISTORY.map((h) => `
      <div class="history-row">
        <span class="history-race">${h.race} <b>${h.pick}</b>→結果${h.result}</span>
        <span class="badge ${h.hit ? 'hit' : 'miss'}">${h.hit ? '的中' : '不的中'}</span>
      </div>`).join('');
  }

  function applyPeriod(period) {
    const data = DATASETS[period];
    renderSparkline(data.trend);
    renderBars(data.bets);
    renderCompare('tipster-compare', data.tipsters, 'var(--accent)');
    renderCompare('venue-compare', data.venues, 'var(--turf)');
  }

  document.getElementById('period-tabs').querySelectorAll('button[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#period-tabs button').forEach((b) => b.classList.toggle('is-active', b === btn));
      applyPeriod(btn.dataset.period);
    });
  });

  renderHistory();
  applyPeriod('month');
})();
