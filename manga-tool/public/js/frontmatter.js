const FrontmatterTab = (() => {
  let projectId = null;

  function render() {
    const root = qs('#tab-frontmatter');
    root.innerHTML = `
      <div class="two-col">
        <div class="card">
          <h2 style="margin-top:0">はじめに</h2>
          <p style="color:var(--muted);font-size:13px">巻頭で作品のコンセプトや読み方を伝える一文。省略も可能です。</p>
          <textarea id="fm-foreword" style="min-height:260px"></textarea>
          <div class="toolbar" style="margin-top:10px"><button class="primary" id="fm-save-foreword">はじめにを保存</button></div>
        </div>
        <div class="card">
          <h2 style="margin-top:0">おわりに</h2>
          <p style="color:var(--muted);font-size:13px">制作裏話・お礼・次巻予告などを書く巻末ページです。</p>
          <textarea id="fm-afterword" style="min-height:260px"></textarea>
          <div class="toolbar" style="margin-top:10px"><button class="primary" id="fm-save-afterword">おわりにを保存</button></div>
        </div>
      </div>
    `;
    qs('#fm-save-foreword').addEventListener('click', () => save('foreword'));
    qs('#fm-save-afterword').addEventListener('click', () => save('afterword'));
  }

  async function save(type) {
    const content = qs(type === 'foreword' ? '#fm-foreword' : '#fm-afterword').value;
    await Api.put(`/api/projects/${projectId}/frontmatter/${type}`, { content });
  }

  async function init(pid) {
    projectId = pid;
    render();
    const data = await Api.get(`/api/projects/${pid}/frontmatter`);
    qs('#fm-foreword').value = data.foreword || '';
    qs('#fm-afterword').value = data.afterword || '';
  }

  return { init };
})();
