requireKaigyoLogin();
renderKaigyoNav('subsidies.html');

function toDateOnly(datetimeStr) {
  if (!datetimeStr) return null;
  return String(datetimeStr).slice(0, 10);
}

function yenLabel(value) {
  if (value === null || value === undefined || value === '') return '金額の情報なし';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `上限 ${num.toLocaleString()}円くらい`;
}

document.getElementById('keyword-preset').addEventListener('change', (e) => {
  if (!e.target.value) return;
  document.getElementById('keyword').value = e.target.value;
  document.getElementById('keyword').focus();
});

async function prefillFromProfile() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/profile');
  if (ok && data.profile) {
    if (data.profile.industryKeyword) document.getElementById('keyword').value = data.profile.industryKeyword;
    if (data.profile.prefecture) document.getElementById('prefecture').value = data.profile.prefecture;
  }
}

async function loadBookmarks() {
  const { ok, data } = await kaigyoFetch('/api/subsidy-bookmarks');
  const el = document.getElementById('bookmark-list');
  if (!ok) {
    el.innerHTML = '<p class="error-text">読み込みに失敗しました。</p>';
    return;
  }
  if (data.bookmarks.length === 0) {
    el.innerHTML = '<p class="muted">まだ検討リストに追加したものはありません。</p>';
    return;
  }
  el.innerHTML = data.bookmarks
    .map(
      (b) => `
    <div class="task-item" data-id="${b.id}">
      <div class="task-top">
        <span class="task-title">${b.title || '(名前不明の補助金)'}</span>
        ${b.deadline ? dueBadgeHtml(b.deadline) : ''}
      </div>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <select class="bm-status">
          <option value="considering" ${b.status === 'considering' ? 'selected' : ''}>検討中</option>
          <option value="planning_to_apply" ${b.status === 'planning_to_apply' ? 'selected' : ''}>申請する予定</option>
          <option value="not_applicable" ${b.status === 'not_applicable' ? 'selected' : ''}>対象外だった</option>
        </select>
        <button class="btn btn-secondary bm-save">保存</button>
        <button class="btn btn-danger bm-delete">削除</button>
      </div>
      <textarea class="bm-memo" style="margin-top:8px;" placeholder="メモ">${b.memo || ''}</textarea>
    </div>`
    )
    .join('');

  el.querySelectorAll('.task-item').forEach((item) => {
    const id = item.dataset.id;
    item.querySelector('.bm-save').addEventListener('click', async () => {
      await kaigyoFetch(`/api/subsidy-bookmarks/${id}`, {
        method: 'PATCH',
        body: { status: item.querySelector('.bm-status').value, memo: item.querySelector('.bm-memo').value },
      });
      loadBookmarks();
    });
    item.querySelector('.bm-delete').addEventListener('click', async () => {
      await kaigyoFetch(`/api/subsidy-bookmarks/${id}`, { method: 'DELETE' });
      loadBookmarks();
    });
  });
}

document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('search-error');
  const resultsEl = document.getElementById('search-results');
  errorEl.textContent = '';
  resultsEl.innerHTML = '<p class="muted">さがしています...(無料サーバーがお休みしていた場合、最初の1回だけ30秒くらいかかることがあります)</p>';

  const keyword = document.getElementById('keyword').value.trim();
  const prefecture = document.getElementById('prefecture').value.trim();
  const acceptingOnly = document.getElementById('acceptingOnly').checked;

  const qs = new URLSearchParams({ keyword, acceptingOnly: acceptingOnly ? '1' : '0' });
  if (prefecture) qs.set('prefecture', prefecture);

  const { ok, data } = await kaigyoFetch(`/api/subsidies/search?${qs.toString()}`);
  if (!ok || data.ok === false) {
    resultsEl.innerHTML = '';
    errorEl.textContent = (data && data.message) || '検索できませんでした。';
    return;
  }

  if (data.results.length === 0) {
    resultsEl.innerHTML = '<p class="muted">見つかりませんでした。キーワードを変えてみてください。</p>';
    return;
  }

  resultsEl.innerHTML = data.results
    .map((r) => {
      const deadline = toDateOnly(r.acceptanceEnd);
      return `
      <div class="task-item" data-id="${r.id}" data-title="${(r.title || '').replace(/"/g, '&quot;')}" data-deadline="${deadline || ''}">
        <div class="task-top">
          <span class="task-title">${r.title}</span>
          ${deadline ? dueBadgeHtml(deadline) : '<span class="badge">締め切り情報なし</span>'}
        </div>
        <div class="task-desc">${r.catchCopy || ''}</div>
        <div class="task-meta">${yenLabel(r.maxLimit)}${r.targetArea ? ' ・ 対象地域: ' + r.targetArea : ''}</div>
        <button class="btn btn-secondary bm-add" style="margin-top:8px;">検討リストに入れる</button>
      </div>`;
    })
    .join('');

  resultsEl.querySelectorAll('.bm-add').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = btn.closest('.task-item');
      await kaigyoFetch('/api/subsidy-bookmarks', {
        method: 'POST',
        body: { subsidyId: item.dataset.id, title: item.dataset.title, deadline: item.dataset.deadline || null },
      });
      btn.textContent = '追加しました';
      btn.disabled = true;
      loadBookmarks();
    });
  });
});

prefillFromProfile();
loadBookmarks();
