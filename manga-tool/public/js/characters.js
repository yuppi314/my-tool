const Characters = (() => {
  let projectId = null;
  let items = [];
  let selectedId = null;

  async function list(pid) {
    return Api.get(`/api/projects/${pid}/characters`);
  }

  function render() {
    const root = qs('#tab-characters');
    root.innerHTML = `
      <div class="workspace-split">
        <div>
          <div class="toolbar">
            <button class="primary" id="char-new">+ 新規キャラクター</button>
          </div>
          <div class="char-grid" id="char-grid"></div>
        </div>
        <div class="card side" id="char-form-wrap"></div>
      </div>
    `;
    qs('#char-new').addEventListener('click', createCharacter);
    renderGrid();
    renderForm(null);
  }

  function renderGrid() {
    const grid = qs('#char-grid');
    grid.innerHTML = '';
    if (!items.length) {
      grid.appendChild(h(`<div class="empty-state">キャラクターがまだいません。「+ 新規キャラクター」から追加してください。<br>外見・性格・口調をここに記録しておくと、各話を描くときの「絵柄・キャラがブレる」問題を防げます。</div>`));
      return;
    }
    items.forEach((c) => {
      const card = h(`
        <div class="char-card" style="border-color:${c.color_tag || '#6c5ce7'}" data-id="${c.id}">
          ${c.image_data ? `<img src="${c.image_data}">` : ''}
          <h4>${escapeHtml(c.name)}</h4>
          <p class="role">${escapeHtml(c.role || '役割未設定')}</p>
        </div>
      `);
      card.addEventListener('click', () => {
        selectedId = c.id;
        renderForm(c);
      });
      grid.appendChild(card);
    });
  }

  function renderForm(char) {
    const wrap = qs('#char-form-wrap');
    if (!char) {
      wrap.innerHTML = `<p class="empty">左のカードを選ぶか、新規作成すると詳細を編集できます。</p>`;
      return;
    }
    wrap.innerHTML = `
      <div class="toolbar">
        <strong>${escapeHtml(char.name)}</strong>
        <span class="spacer"></span>
        <button class="danger" id="char-delete">削除</button>
      </div>
      <label>名前</label>
      <input type="text" id="cf-name" value="${escapeHtml(char.name)}">
      <label>別名・呼び方</label>
      <input type="text" id="cf-aliases" value="${escapeHtml(char.aliases || '')}">
      <label>役割(主人公/ヒロイン/ライバル等)</label>
      <input type="text" id="cf-role" value="${escapeHtml(char.role || '')}">
      <label>テーマカラー(コマ割りメモでの識別用)</label>
      <input type="color" id="cf-color" value="${char.color_tag || '#6c5ce7'}" style="height:38px;padding:2px">
      <label>参照画像(設定画・ラフ等)</label>
      <input type="file" id="cf-image" accept="image/*">
      <div id="cf-image-preview" style="margin-top:8px">${char.image_data ? `<img src="${char.image_data}" style="max-width:100%;border-radius:6px">` : ''}</div>
      <label>外見の特徴(髪型・体型・服装など、絵柄統一のメモ)</label>
      <textarea id="cf-appearance">${escapeHtml(char.appearance || '')}</textarea>
      <label>性格</label>
      <textarea id="cf-personality">${escapeHtml(char.personality || '')}</textarea>
      <label>口調・一人称</label>
      <textarea id="cf-speech">${escapeHtml(char.speech_style || '')}</textarea>
      <label>その他メモ</label>
      <textarea id="cf-notes">${escapeHtml(char.notes || '')}</textarea>
      <div class="toolbar" style="margin-top:12px">
        <button class="primary" id="char-save">保存</button>
      </div>
    `;
    let pendingImage = char.image_data || null;
    qs('#cf-image').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingImage = reader.result;
        qs('#cf-image-preview').innerHTML = `<img src="${pendingImage}" style="max-width:100%;border-radius:6px">`;
      };
      reader.readAsDataURL(file);
    });
    qs('#char-save').addEventListener('click', async () => {
      const updated = await Api.put(`/api/characters/${char.id}`, {
        name: qs('#cf-name').value.trim() || char.name,
        aliases: qs('#cf-aliases').value.trim(),
        role: qs('#cf-role').value.trim(),
        color_tag: qs('#cf-color').value,
        image_data: pendingImage,
        appearance: qs('#cf-appearance').value,
        personality: qs('#cf-personality').value,
        speech_style: qs('#cf-speech').value,
        notes: qs('#cf-notes').value,
      });
      const idx = items.findIndex((i) => i.id === char.id);
      items[idx] = updated;
      renderGrid();
      renderForm(updated);
    });
    qs('#char-delete').addEventListener('click', async () => {
      if (!confirm(`「${char.name}」を削除しますか?`)) return;
      await Api.del(`/api/characters/${char.id}`);
      items = items.filter((i) => i.id !== char.id);
      renderGrid();
      renderForm(null);
    });
  }

  async function createCharacter() {
    const created = await Api.post(`/api/projects/${projectId}/characters`, { name: '新しいキャラクター' });
    items.push(created);
    renderGrid();
    selectedId = created.id;
    renderForm(created);
  }

  async function init(pid) {
    projectId = pid;
    items = await list(pid);
    render();
  }

  return { init, list };
})();
