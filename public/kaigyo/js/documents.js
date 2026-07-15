requireKaigyoLogin();
renderKaigyoNav('documents.html');

async function load() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/documents');
  const listEl = document.getElementById('doc-list');
  if (!ok) {
    listEl.innerHTML = '<p class="error-text">読み込みに失敗しました。</p>';
    return;
  }

  listEl.innerHTML = data.documents
    .map(
      (d) => `
    <a class="doc-card" href="/kaigyo/document.html?type=${encodeURIComponent(d.docType)}">
      <h3>${d.title}</h3>
      <p class="muted small">${d.summary}</p>
      <div class="doc-status">
        提出先: ${d.whereToSubmit}<br>
        ${d.hasDraft ? '下書きがあります(最終保存: ' + formatDate((d.updatedAt || '').slice(0, 10)) + ')' : 'まだ下書きがありません'}
      </div>
    </a>`
    )
    .join('');
}

load();
