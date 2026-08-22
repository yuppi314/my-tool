const ExportTab = (() => {
  let projectId = null;

  function shell() {
    const root = qs('#tab-export');
    root.innerHTML = `
      <div class="toolbar no-print">
        <button id="ex-refresh">最新の内容に更新</button>
        <button id="ex-print">印刷 / PDFとして保存</button>
        <button class="primary" id="ex-download">HTMLファイルをダウンロード</button>
      </div>
      <div class="export-frame" id="ex-content"></div>
    `;
    qs('#ex-refresh').addEventListener('click', refresh);
    qs('#ex-print').addEventListener('click', () => window.print());
    qs('#ex-download').addEventListener('click', downloadHtml);
  }

  async function refresh() {
    const data = await Api.get(`/api/projects/${projectId}/export`);
    qs('#ex-content').innerHTML = data.html;
    ExportTab._lastProject = data.project;
    ExportTab._lastHtml = data.html;
  }

  async function downloadHtml() {
    const cssText = await fetch('css/style.css').then((r) => r.text()).catch(() => '');
    const doc = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<title>${escapeHtml(ExportTab._lastProject?.title || '漫画制作資料')}</title>
<style>${cssText}</style>
</head><body>
<div class="export-frame">${ExportTab._lastHtml}</div>
</body></html>`;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(ExportTab._lastProject?.title || 'manga-project').replace(/[\\/:*?"<>|]/g, '_')}_制作資料.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function init(pid) {
    projectId = pid;
    shell();
    await refresh();
  }

  return { init, refresh };
})();
