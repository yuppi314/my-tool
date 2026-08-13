const form = document.getElementById('itinerary-form');
const resultEl = document.getElementById('result');

const TYPE_LABEL = { transport: '移動', gourmet: 'グルメ', free: '自由時間' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildThumbnail(photoUrl) {
  if (photoUrl) {
    const img = el('img', 'option-thumb');
    img.src = photoUrl;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }
  return el('div', 'option-thumb option-thumb-placeholder', '写真準備中');
}

function placesPhotoUrl(photoRef) {
  return photoRef ? `/api/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=300` : null;
}

function buildArrivalPayload(prefix) {
  const type = document.getElementById(`${prefix}-type`).value;
  if (type === 'none') return { type: 'none' };
  const place = document.getElementById(`${prefix}-place`).value.trim();
  const datetime = document.getElementById(`${prefix}-datetime`).value;
  return { type, airport: place, datetime: datetime || null };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultEl.innerHTML = '';

  const destination = document.getElementById('destination').value.trim();
  const days = document.getElementById('days').value;
  const gourmetGenre = document.getElementById('gourmet-genre').value;
  const arrival = buildArrivalPayload('arrival');
  const departure = buildArrivalPayload('departure');

  try {
    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, days, arrival, departure, gourmetGenre })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '日程表の作成に失敗しました');
    }
    renderItinerary(data, destination);
  } catch (err) {
    const errorEl = el('p', 'error', err.message);
    resultEl.appendChild(errorEl);
  }
});

function renderItinerary(data, destination) {
  resultEl.innerHTML = '';
  data.itinerary.forEach((day) => {
    const card = el('div', 'day-card');
    const heading = `${day.day}日目` + (day.date ? `(${day.date})` : '');
    card.appendChild(el('h2', null, heading));

    day.items.forEach((item) => {
      const itemEl = el('div', `item type-${item.type}`);
      itemEl.appendChild(el('div', 'item-time', item.time));

      const body = el('div', 'item-body');
      body.appendChild(el('div', 'item-title', `[${TYPE_LABEL[item.type] || ''}] ${item.title}`));
      if (item.note) body.appendChild(el('div', 'item-note', item.note));

      if (item.type === 'gourmet') {
        const btn = el('button', 'gourmet-search-btn', 'お店を探す');
        const genre = item.genreQuery || '';
        btn.addEventListener('click', () => searchGourmet(destination, genre, body, btn, itemEl));
        body.appendChild(btn);
      }

      if (item.type === 'free') {
        const btnGroup = el('div', 'spot-btn-group');
        const popularBtn = el('button', 'gourmet-search-btn', '定番観光地を探す');
        popularBtn.addEventListener('click', () => searchSpots(destination, 'popular', body, popularBtn, itemEl));
        const hiddenBtn = el('button', 'gourmet-search-btn', '穴場スポットを探す');
        hiddenBtn.addEventListener('click', () => searchSpots(destination, 'hidden', body, hiddenBtn, itemEl));
        btnGroup.appendChild(popularBtn);
        btnGroup.appendChild(hiddenBtn);
        body.appendChild(btnGroup);
      }

      itemEl.appendChild(body);
      card.appendChild(itemEl);
    });

    resultEl.appendChild(card);
  });
}

async function searchGourmet(area, genre, body, btn, itemEl) {
  btn.disabled = true;
  btn.textContent = '検索中...';
  try {
    const params = new URLSearchParams({ area, genre });
    const res = await fetch(`/api/gourmet?${params.toString()}`);
    const data = await res.json();

    const existing = body.querySelector('.gourmet-results');
    if (existing) existing.remove();

    const container = el('div', 'gourmet-results');
    (data.results || []).forEach((shop) => {
      const opt = el('div', 'gourmet-option');
      opt.appendChild(buildThumbnail(shop.photoUrl));
      const info = el('div', 'option-info');
      info.appendChild(el('div', null, `${shop.name}(${shop.genre || 'ジャンル不明'})`));
      if (shop.access) info.appendChild(el('div', 'item-note', shop.access));
      if (shop.budget) info.appendChild(el('div', 'item-note', `予算目安: ${shop.budget}`));
      opt.appendChild(info);
      opt.addEventListener('click', () => {
        const titleEl = itemEl.querySelector('.item-title');
        titleEl.textContent = `[グルメ] ${shop.name}`;
      });
      container.appendChild(opt);
    });

    if (data.mock) {
      container.appendChild(el('div', 'gourmet-mock-note', data.error || 'サンプルデータを表示しています(HOTPEPPER_API_KEY未設定)'));
    }

    body.appendChild(container);
  } catch (err) {
    body.appendChild(el('div', 'error', 'グルメ検索に失敗しました'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'お店を探す';
  }
}

const SPOT_MODE_LABEL = { popular: '定番観光地', hidden: '穴場スポット' };

async function searchSpots(area, mode, body, btn, itemEl) {
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '検索中...';
  try {
    const params = new URLSearchParams({ area, mode });
    const res = await fetch(`/api/spots?${params.toString()}`);
    const data = await res.json();

    const existing = body.querySelector(`.spot-results-${mode}`);
    if (existing) existing.remove();

    const container = el('div', `gourmet-results spot-results-${mode}`);
    container.appendChild(el('div', 'spot-results-heading', `${SPOT_MODE_LABEL[mode]}候補`));
    (data.results || []).forEach((spot) => {
      const opt = el('div', 'gourmet-option');
      opt.appendChild(buildThumbnail(placesPhotoUrl(spot.photoRef)));
      const info = el('div', 'option-info');
      const ratingText = spot.rating ? `評価 ${spot.rating}(${spot.ratingsTotal}件)` : '評価情報なし';
      info.appendChild(el('div', null, spot.name));
      info.appendChild(el('div', 'item-note', ratingText));
      if (spot.address) info.appendChild(el('div', 'item-note', spot.address));
      opt.appendChild(info);
      opt.addEventListener('click', () => {
        const titleEl = itemEl.querySelector('.item-title');
        titleEl.textContent = `[自由時間] ${spot.name}`;
      });
      container.appendChild(opt);
    });

    if (data.mock) {
      container.appendChild(el('div', 'gourmet-mock-note', data.error || 'サンプルデータを表示しています(GOOGLE_PLACES_API_KEY未設定)'));
    }

    body.appendChild(container);
  } catch (err) {
    body.appendChild(el('div', 'error', '観光地検索に失敗しました'));
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}
