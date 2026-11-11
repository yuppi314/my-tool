const STATUS_OPTIONS = [
  { value: 'plot', label: 'プロット' },
  { value: 'script', label: 'シナリオ' },
  { value: 'name', label: 'ネーム' },
  { value: 'final', label: '完成' },
];

const Chapters = (() => {
  let projectId = null;
  let chapters = [];
  let selectedId = null;
  let characterCache = [];

  function render() {
    const root = qs('#tab-chapters');
    root.innerHTML = `
      <div class="workspace-split">
        <div>
          <div class="toolbar">
            <button class="primary" id="chapter-new">+ 新しい章</button>
          </div>
          <div id="chapter-list"></div>
        </div>
        <div id="chapter-detail"></div>
      </div>
    `;
    qs('#chapter-new').addEventListener('click', createChapter);
    renderList();
    renderDetail();
  }

  function renderList() {
    const listEl = qs('#chapter-list');
    listEl.innerHTML = '';
    if (!chapters.length) {
      listEl.appendChild(h(`<div class="empty-state">章がまだありません。「+ 新しい章」から作成してください。</div>`));
      return;
    }
    chapters.forEach((c, idx) => {
      const item = h(`
        <div class="list-item ${c.id === selectedId ? 'selected' : ''}" data-id="${c.id}">
          <div class="grow">
            <div>${escapeHtml(c.title)}</div>
            <span class="badge">${STATUS_OPTIONS.find((s) => s.value === c.status)?.label || c.status}</span>
          </div>
          <button class="ghost move-up" ${idx === 0 ? 'disabled' : ''} title="上へ">▲</button>
          <button class="ghost move-down" ${idx === chapters.length - 1 ? 'disabled' : ''} title="下へ">▼</button>
        </div>
      `);
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectedId = c.id;
        renderList();
        renderDetail();
      });
      item.querySelector('.move-up').addEventListener('click', () => moveChapter(idx, -1));
      item.querySelector('.move-down').addEventListener('click', () => moveChapter(idx, 1));
      listEl.appendChild(item);
    });
  }

  async function moveChapter(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    [chapters[idx], chapters[target]] = [chapters[target], chapters[idx]];
    renderList();
    await Api.post(`/api/projects/${projectId}/chapters/reorder`, { orderedIds: chapters.map((c) => c.id) });
  }

  async function createChapter() {
    const created = await Api.post(`/api/projects/${projectId}/chapters`, { title: `第${chapters.length + 1}章` });
    chapters.push(created);
    selectedId = created.id;
    renderList();
    renderDetail();
  }

  function renderDetail() {
    const wrap = qs('#chapter-detail');
    const chapter = chapters.find((c) => c.id === selectedId);
    if (!chapter) {
      wrap.innerHTML = `<div class="card"><p class="empty">左の一覧から章を選ぶと、章立て情報とシナリオ(コマ割り前のあらすじ・セリフ台本)を編集できます。</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <strong>章の設定</strong>
          <span class="spacer"></span>
          <button class="danger" id="chapter-delete">この章を削除</button>
        </div>
        <div class="two-col">
          <div>
            <label>章タイトル</label>
            <input type="text" id="ch-title" value="${escapeHtml(chapter.title)}">
            <label>進行ステータス</label>
            <select id="ch-status">
              ${STATUS_OPTIONS.map((s) => `<option value="${s.value}" ${s.value === chapter.status ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>目次に表示するページ表記(任意・例: p.5)</label>
            <input type="text" id="ch-page-label" value="${escapeHtml(chapter.page_label || '')}">
            <label><input type="checkbox" id="ch-show-toc" ${chapter.show_in_toc ? 'checked' : ''} style="width:auto;margin-right:6px">目次に表示する</label>
          </div>
        </div>
        <label>あらすじ・メモ</label>
        <textarea id="ch-summary">${escapeHtml(chapter.summary || '')}</textarea>
        <div class="toolbar" style="margin-top:10px">
          <button class="primary" id="chapter-save">章の設定を保存</button>
        </div>
      </div>
      <div class="card">
        <div class="toolbar">
          <strong>シナリオ(シーン台本)</strong>
          <span class="spacer"></span>
          <button id="scene-new">+ シーンを追加</button>
        </div>
        <div id="scene-list"></div>
      </div>
    `;
    qs('#chapter-delete').addEventListener('click', async () => {
      if (!confirm(`「${chapter.title}」を削除しますか?(シナリオ・コマ割りも削除されます)`)) return;
      await Api.del(`/api/chapters/${chapter.id}`);
      chapters = chapters.filter((c) => c.id !== chapter.id);
      selectedId = null;
      renderList();
      renderDetail();
    });
    qs('#chapter-save').addEventListener('click', async () => {
      const updated = await Api.put(`/api/chapters/${chapter.id}`, {
        title: qs('#ch-title').value.trim() || chapter.title,
        status: qs('#ch-status').value,
        page_label: qs('#ch-page-label').value.trim(),
        show_in_toc: qs('#ch-show-toc').checked ? 1 : 0,
        summary: qs('#ch-summary').value,
      });
      const idx = chapters.findIndex((c) => c.id === chapter.id);
      chapters[idx] = updated;
      renderList();
    });
    qs('#scene-new').addEventListener('click', () => createScene(chapter.id));
    loadScenes(chapter.id);
  }

  async function ensureCharacters() {
    characterCache = await Characters.list(projectId);
    return characterCache;
  }

  async function loadScenes(chapterId) {
    await ensureCharacters();
    const scenes = await Api.get(`/api/chapters/${chapterId}/scenes`);
    const listEl = qs('#scene-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!scenes.length) {
      listEl.appendChild(h(`<p class="empty" style="color:var(--muted);font-size:13px">シーンがありません。「+ シーンを追加」で台本(状況説明・セリフ)を書いていきましょう。</p>`));
      return;
    }
    scenes.forEach((scene, idx) => {
      const block = h(`
        <div class="card" style="background:#fbfaf8">
          <div class="toolbar">
            <input type="text" class="scene-heading" placeholder="シーン見出し(例: 教室・放課後)" value="${escapeHtml(scene.heading || '')}" style="max-width:300px">
            <span class="spacer"></span>
            <button class="danger scene-delete">シーン削除</button>
          </div>
          <div class="scene-chars" style="margin:8px 0"></div>
          <textarea class="scene-script" placeholder="状況・セリフ・ト書きを書きます">${escapeHtml(scene.script || '')}</textarea>
        </div>
      `);
      const charsWrap = block.querySelector('.scene-chars');
      characterCache.forEach((c) => {
        const label = document.createElement('label');
        label.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:0 10px 6px 0;font-weight:400;color:var(--text)';
        const checked = (scene.character_ids || []).includes(c.id);
        label.innerHTML = `<input type="checkbox" value="${c.id}" ${checked ? 'checked' : ''} style="width:auto"> ${escapeHtml(c.name)}`;
        charsWrap.appendChild(label);
      });
      const save = debounce(async () => {
        const character_ids = Array.from(charsWrap.querySelectorAll('input:checked')).map((i) => i.value);
        await Api.put(`/api/scenes/${scene.id}`, {
          heading: block.querySelector('.scene-heading').value,
          script: block.querySelector('.scene-script').value,
          character_ids,
        });
      }, 500);
      block.querySelector('.scene-heading').addEventListener('input', save);
      block.querySelector('.scene-script').addEventListener('input', save);
      charsWrap.addEventListener('change', save);
      block.querySelector('.scene-delete').addEventListener('click', async () => {
        await Api.del(`/api/scenes/${scene.id}`);
        loadScenes(chapterId);
      });
      listEl.appendChild(block);
    });
  }

  async function createScene(chapterId) {
    await Api.post(`/api/chapters/${chapterId}/scenes`, { heading: '', script: '' });
    loadScenes(chapterId);
  }

  async function list(pid) {
    return Api.get(`/api/projects/${pid}/chapters`);
  }

  async function init(pid) {
    projectId = pid;
    chapters = await list(pid);
    render();
  }

  return { init, list };
})();
