const SHOT_TYPES = ['標準', '大ゴマ', '寄り(アップ)', '引き(ロング)', '俯瞰', 'あおり', '効果・見開き'];

const TEMPLATE_SHAPES = {
  splash: { label: '1コマ(見開き大ゴマ)', rects: [[0, 0, 100, 100]] },
  h2: { label: '横2分割', rects: [[0, 0, 100, 49], [0, 51, 100, 49]] },
  v2: { label: '縦2分割', rects: [[0, 0, 49, 100], [51, 0, 49, 100]] },
  t3: { label: '3分割(上1下2)', rects: [[0, 0, 100, 32], [0, 34, 49, 66], [51, 34, 49, 66]] },
  grid4: { label: '4分割', rects: [[0, 0, 49, 49], [51, 0, 49, 49], [0, 51, 49, 49], [51, 51, 49, 49]] },
  grid6: { label: '6分割', rects: [[0, 0, 32, 32], [34, 0, 32, 32], [68, 0, 32, 32], [0, 34, 32, 32], [34, 34, 32, 32], [68, 34, 32, 32]] },
  grid8: { label: '8分割', rects: [[0, 0, 49, 24], [51, 0, 49, 24], [0, 25.5, 49, 24], [51, 25.5, 49, 24], [0, 51, 49, 24], [51, 51, 49, 24], [0, 76.5, 49, 23.5], [51, 76.5, 49, 23.5]] },
};

const Storyboard = (() => {
  let projectId = null;
  let chapters = [];
  let currentChapterId = null;
  let pages = [];
  let currentPageId = null;
  let selectedPanelId = null;
  let characterCache = [];

  function render() {
    const root = qs('#tab-storyboard');
    root.innerHTML = `
      <div class="card">
        <label>対象の章</label>
        <select id="sb-chapter-select" style="max-width:400px"></select>
      </div>
      <div class="storyboard-layout" id="sb-body" style="display:none">
        <div>
          <div class="toolbar"><button class="primary" id="sb-add-page">+ ページ追加</button></div>
          <div class="page-thumb-list" id="sb-page-list"></div>
        </div>
        <div>
          <div class="template-palette" id="sb-template-palette"></div>
          <div class="toolbar">
            <button id="sb-add-panel">+ コマ追加</button>
            <span class="spacer"></span>
            <label style="margin:0;display:flex;align-items:center;gap:6px;font-weight:400">ページメモ</label>
          </div>
          <input type="text" id="sb-page-notes" placeholder="このページの演出メモ(任意)">
          <div class="page-canvas-wrap" style="margin-top:12px">
            <div class="page-canvas" id="sb-canvas"></div>
          </div>
        </div>
        <div class="card panel-form" id="sb-panel-form"></div>
      </div>
      <div id="sb-empty" class="empty-state">まだ章がありません。「章立て・シナリオ」タブで章を作成してください。</div>
    `;
    renderTemplatePalette();
    qs('#sb-add-page').addEventListener('click', addPage);
    qs('#sb-add-panel').addEventListener('click', addPanel);
    qs('#sb-page-notes').addEventListener('input', debounce(savePageNotes, 500));
    qs('#sb-chapter-select').addEventListener('change', (e) => selectChapter(e.target.value));
    renderChapterSelect();
  }

  function renderTemplatePalette() {
    const wrap = qs('#sb-template-palette');
    wrap.innerHTML = '';
    Object.entries(TEMPLATE_SHAPES).forEach(([key, tpl]) => {
      const btn = document.createElement('button');
      btn.className = 'template-btn';
      btn.title = tpl.label;
      tpl.rects.forEach(([x, y, w, hh]) => {
        const r = document.createElement('div');
        r.className = 't-panel';
        r.style.cssText = `left:${x}%;top:${y}%;width:${w}%;height:${hh}%`;
        btn.appendChild(r);
      });
      btn.addEventListener('click', () => applyTemplate(key));
      wrap.appendChild(btn);
    });
  }

  function renderChapterSelect() {
    const sel = qs('#sb-chapter-select');
    sel.innerHTML = chapters.map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
    if (chapters.length) {
      qs('#sb-empty').style.display = 'none';
      qs('#sb-body').style.display = 'grid';
      currentChapterId = currentChapterId && chapters.some((c) => c.id === currentChapterId) ? currentChapterId : chapters[0].id;
      sel.value = currentChapterId;
      loadPages();
    } else {
      qs('#sb-empty').style.display = 'block';
      qs('#sb-body').style.display = 'none';
    }
  }

  async function selectChapter(chapterId) {
    currentChapterId = chapterId;
    currentPageId = null;
    selectedPanelId = null;
    await loadPages();
  }

  async function loadPages() {
    pages = await Api.get(`/api/chapters/${currentChapterId}/pages`);
    if (!pages.some((p) => p.id === currentPageId)) {
      currentPageId = pages.length ? pages[0].id : null;
    }
    renderPageList();
    renderCanvas();
  }

  function renderPageList() {
    const listEl = qs('#sb-page-list');
    listEl.innerHTML = '';
    pages.forEach((page, idx) => {
      const thumb = h(`
        <div class="page-thumb ${page.id === currentPageId ? 'active' : ''}">
          <div class="mini-canvas"></div>
          <div>p.${idx + 1}</div>
          <button class="ghost danger sb-del-page" style="padding:2px 6px;font-size:11px">削除</button>
        </div>
      `);
      const mini = thumb.querySelector('.mini-canvas');
      page.panels.forEach((panel) => {
        const r = document.createElement('div');
        r.className = 'mini-panel';
        r.style.cssText = `left:${panel.x}%;top:${panel.y}%;width:${panel.w}%;height:${panel.h}%`;
        mini.appendChild(r);
      });
      thumb.addEventListener('click', (e) => {
        if (e.target.closest('.sb-del-page')) return;
        currentPageId = page.id;
        selectedPanelId = null;
        renderPageList();
        renderCanvas();
      });
      thumb.querySelector('.sb-del-page').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`p.${idx + 1} を削除しますか?`)) return;
        await Api.del(`/api/pages/${page.id}`);
        await loadPages();
      });
      listEl.appendChild(thumb);
    });
  }

  function currentPage() {
    return pages.find((p) => p.id === currentPageId);
  }

  async function ensureCharacters() {
    characterCache = await Characters.list(projectId);
  }

  async function renderCanvas() {
    await ensureCharacters();
    const canvas = qs('#sb-canvas');
    canvas.innerHTML = '';
    const page = currentPage();
    qs('#sb-page-notes').value = page ? (page.notes || '') : '';
    qs('#sb-page-notes').disabled = !page;
    if (!page) {
      renderPanelForm(null);
      return;
    }
    page.panels.forEach((panel, idx) => {
      const box = document.createElement('div');
      box.className = 'panel-box' + (panel.id === selectedPanelId ? ' selected' : '');
      box.style.cssText = `left:${panel.x}%;top:${panel.y}%;width:${panel.w}%;height:${panel.h}%`;
      box.dataset.id = panel.id;
      box.innerHTML = `
        <div class="panel-num">${idx + 1}</div>
        <div class="panel-preview-text">${escapeHtml((panel.description || '').slice(0, 40))}</div>
        <div class="resize-handle"></div>
      `;
      attachDragResize(box, canvas, panel);
      box.addEventListener('pointerdown', () => {
        selectedPanelId = panel.id;
        qsa('.panel-box', canvas).forEach((b) => b.classList.toggle('selected', b === box));
        renderPanelForm(panel);
      });
      canvas.appendChild(box);
    });
    const selected = page.panels.find((p) => p.id === selectedPanelId) || null;
    renderPanelForm(selected);
  }

  function attachDragResize(box, canvas, panel) {
    // Pointer Events unify mouse・touch・ペン操作なので、スマホでもコマの移動/リサイズができる。
    const handle = box.querySelector('.resize-handle');
    let mode = null;
    let startX, startY, startRect;

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      const dxPct = ((e.clientX - startX) / rect.width) * 100;
      const dyPct = ((e.clientY - startY) / rect.height) * 100;
      if (mode === 'move') {
        let x = clamp(startRect.x + dxPct, 0, 100 - startRect.w);
        let y = clamp(startRect.y + dyPct, 0, 100 - startRect.h);
        box.style.left = x + '%';
        box.style.top = y + '%';
        panel._pending = { x, y, w: startRect.w, h: startRect.h };
      } else if (mode === 'resize') {
        let w = clamp(startRect.w + dxPct, 5, 100 - startRect.x);
        let hh = clamp(startRect.h + dyPct, 5, 100 - startRect.y);
        box.style.width = w + '%';
        box.style.height = hh + '%';
        panel._pending = { x: startRect.x, y: startRect.y, w, h: hh };
      }
    }
    async function onPointerUp() {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      if (panel._pending) {
        Object.assign(panel, panel._pending);
        await Api.put(`/api/panels/${panel.id}`, panel._pending);
        delete panel._pending;
        renderPageList();
      }
      mode = null;
    }
    box.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      e.preventDefault();
      mode = 'move';
      startX = e.clientX; startY = e.clientY;
      startRect = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      mode = 'resize';
      startX = e.clientX; startY = e.clientY;
      startRect = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function renderPanelForm(panel) {
    const wrap = qs('#sb-panel-form');
    if (!panel) {
      wrap.innerHTML = `<p class="empty">コマを選択すると、内容・セリフ・登場キャラを編集できます。</p>`;
      return;
    }
    wrap.innerHTML = `
      <div class="toolbar">
        <strong>コマの内容</strong>
        <span class="spacer"></span>
        <button class="danger" id="panel-delete">コマ削除</button>
      </div>
      <label>ショット種別</label>
      <select id="pf-shot">
        ${SHOT_TYPES.map((s) => `<option ${s === panel.shot_type ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <label>コマの内容(構図・アクション)</label>
      <textarea id="pf-desc">${escapeHtml(panel.description || '')}</textarea>
      <label>セリフ・モノローグ</label>
      <textarea id="pf-dialogue">${escapeHtml(panel.dialogue || '')}</textarea>
      <label>登場キャラクター</label>
      <div id="pf-chars"></div>
    `;
    const charsWrap = qs('#pf-chars');
    characterCache.forEach((c) => {
      const label = document.createElement('label');
      label.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:0 10px 6px 0;font-weight:400;color:var(--text)';
      const checked = (panel.character_ids || []).includes(c.id);
      label.innerHTML = `<input type="checkbox" value="${c.id}" ${checked ? 'checked' : ''} style="width:auto"> ${escapeHtml(c.name)}`;
      charsWrap.appendChild(label);
    });
    const save = debounce(async () => {
      const character_ids = Array.from(charsWrap.querySelectorAll('input:checked')).map((i) => i.value);
      const updated = await Api.put(`/api/panels/${panel.id}`, {
        shot_type: qs('#pf-shot').value,
        description: qs('#pf-desc').value,
        dialogue: qs('#pf-dialogue').value,
        character_ids,
      });
      Object.assign(panel, updated);
      const box = qs(`.panel-box[data-id="${panel.id}"]`);
      if (box) box.querySelector('.panel-preview-text').textContent = (panel.description || '').slice(0, 40);
    }, 400);
    qs('#pf-shot').addEventListener('change', save);
    qs('#pf-desc').addEventListener('input', save);
    qs('#pf-dialogue').addEventListener('input', save);
    charsWrap.addEventListener('change', save);
    qs('#panel-delete').addEventListener('click', async () => {
      await Api.del(`/api/panels/${panel.id}`);
      selectedPanelId = null;
      await loadPages();
    });
  }

  async function addPage() {
    const created = await Api.post(`/api/chapters/${currentChapterId}/pages`, { template: 'grid4' });
    pages.push(created);
    currentPageId = created.id;
    selectedPanelId = null;
    renderPageList();
    renderCanvas();
  }

  async function applyTemplate(key) {
    const page = currentPage();
    if (!page) return alert('先にページを追加してください');
    const updated = await Api.post(`/api/pages/${page.id}/apply-template`, { template: key });
    Object.assign(page, updated);
    selectedPanelId = null;
    renderPageList();
    renderCanvas();
  }

  async function addPanel() {
    const page = currentPage();
    if (!page) return alert('先にページを追加してください');
    const created = await Api.post(`/api/pages/${page.id}/panels`, { x: 20, y: 20, w: 30, h: 30 });
    page.panels.push(created);
    selectedPanelId = created.id;
    renderPageList();
    renderCanvas();
  }

  async function savePageNotes() {
    const page = currentPage();
    if (!page) return;
    await Api.put(`/api/pages/${page.id}`, { notes: qs('#sb-page-notes').value });
  }

  async function init(pid) {
    projectId = pid;
    chapters = await Chapters.list(pid);
    render();
  }

  return { init };
})();
