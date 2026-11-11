const PROJECT_ID = new URLSearchParams(window.location.search).get('id');
let CURRENT_PROJECT = null;
const initedTabs = new Set();

if (!PROJECT_ID) {
  window.location.href = 'index.html';
}

function markSaved() {
  const btn = qs('#save-status');
  btn.textContent = '保存済み';
}
function markSaving() {
  const btn = qs('#save-status');
  btn.textContent = '保存中...';
}

async function loadProjectInfo() {
  CURRENT_PROJECT = await Api.get(`/api/projects/${PROJECT_ID}`);
  qs('#project-title-header').textContent = CURRENT_PROJECT.title;
  document.title = `${CURRENT_PROJECT.title} - Kindle漫画 制作ツール`;
  qs('#info-title').value = CURRENT_PROJECT.title || '';
  qs('#info-subtitle').value = CURRENT_PROJECT.subtitle || '';
  qs('#info-series').value = CURRENT_PROJECT.series_title || '';
  qs('#info-author').value = CURRENT_PROJECT.author || '';
  qs('#info-genre').value = CURRENT_PROJECT.genre || '';
  qs('#info-trim').value = CURRENT_PROJECT.trim_size || 'B6(コミック標準)';
  qs('#info-description').value = CURRENT_PROJECT.description || '';
  qs('#info-kdp-categories').value = CURRENT_PROJECT.kdp_categories || '';
  qs('#info-kdp-keywords').value = CURRENT_PROJECT.kdp_keywords || '';
}

qs('#info-save').addEventListener('click', async () => {
  markSaving();
  CURRENT_PROJECT = await Api.put(`/api/projects/${PROJECT_ID}`, {
    title: qs('#info-title').value.trim() || CURRENT_PROJECT.title,
    subtitle: qs('#info-subtitle').value.trim(),
    series_title: qs('#info-series').value.trim(),
    author: qs('#info-author').value.trim(),
    genre: qs('#info-genre').value.trim(),
    trim_size: qs('#info-trim').value,
    description: qs('#info-description').value.trim(),
    kdp_categories: qs('#info-kdp-categories').value.trim(),
    kdp_keywords: qs('#info-kdp-keywords').value.trim(),
  });
  qs('#project-title-header').textContent = CURRENT_PROJECT.title;
  markSaved();
});

function activateTab(name) {
  qsa('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === name));
  qsa('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${name}`));
  if (!initedTabs.has(name)) {
    initedTabs.add(name);
    if (name === 'characters') Characters.init(PROJECT_ID);
    if (name === 'chapters') Chapters.init(PROJECT_ID);
    if (name === 'storyboard') Storyboard.init(PROJECT_ID);
    if (name === 'frontmatter') FrontmatterTab.init(PROJECT_ID);
    if (name === 'export') ExportTab.init(PROJECT_ID);
  } else {
    if (name === 'export') ExportTab.refresh();
  }
}

qsa('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

loadProjectInfo();
