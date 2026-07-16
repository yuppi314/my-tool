(function () {
  const state = { date: null, category: 'central', venue: null, raceNumber: null, meta: null };

  const dateChips = document.getElementById('date-chips');
  const venueChips = document.getElementById('venue-chips');
  const raceGrid = document.getElementById('race-grid');
  const submitBtn = document.getElementById('submit-btn');
  const categoryToggle = document.getElementById('category-toggle');

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  }

  function renderDateChips() {
    dateChips.innerHTML = '';
    state.meta.dates.forEach((date) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (date === state.date ? ' is-active' : '');
      btn.textContent = formatDate(date);
      btn.addEventListener('click', () => { state.date = date; onSelectionChanged(); });
      dateChips.appendChild(btn);
    });
  }

  function renderVenueChips() {
    venueChips.innerHTML = '';
    const venues = (state.meta.venuesByCategory[state.category] || []);
    if (venues.length === 0) {
      venueChips.innerHTML = '<p class="sample-note">この区分のレースはまだありません。</p>';
      return;
    }
    venues.forEach((venue) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (venue === state.venue ? ' is-active' : '');
      btn.textContent = venue;
      btn.addEventListener('click', () => { state.venue = venue; state.raceNumber = null; onSelectionChanged(); });
      venueChips.appendChild(btn);
    });
  }

  async function renderRaceGrid() {
    raceGrid.innerHTML = '';
    let available = new Set();
    if (state.date && state.venue) {
      const params = new URLSearchParams({ date: state.date, category: state.category, venue: state.venue });
      const races = await fetch('/api/races?' + params).then((r) => r.json());
      available = new Set(races.map((r) => r.raceNumber));
    }
    for (let n = 1; n <= 12; n++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rnum' + (n === state.raceNumber ? ' is-active' : '');
      btn.textContent = n + 'R';
      if (!available.has(n)) {
        btn.disabled = true;
        btn.style.opacity = '.35';
      } else {
        btn.addEventListener('click', () => {
          state.raceNumber = state.raceNumber === n ? null : n;
          renderRaceGrid();
          updateSubmit();
        });
      }
      raceGrid.appendChild(btn);
    }
    updateSubmit();
  }

  function updateSubmit() {
    submitBtn.disabled = !(state.date && state.category && state.venue);
  }

  function onSelectionChanged() {
    renderDateChips();
    renderVenueChips();
    renderRaceGrid();
  }

  categoryToggle.querySelectorAll('button[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.category = btn.dataset.category;
      state.venue = null;
      state.raceNumber = null;
      categoryToggle.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
      onSelectionChanged();
    });
  });

  submitBtn.addEventListener('click', () => {
    const params = new URLSearchParams({ date: state.date, category: state.category, venue: state.venue });
    if (state.raceNumber) params.set('raceNumber', state.raceNumber);
    window.location.href = '/races.html?' + params;
  });

  fetch('/api/meta')
    .then((r) => r.json())
    .then((meta) => {
      state.meta = meta;
      state.date = meta.dates[0] || null;
      const venues = meta.venuesByCategory[state.category] || [];
      state.venue = venues[0] || null;
      onSelectionChanged();
    });
})();
