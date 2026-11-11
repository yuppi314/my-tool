async function loadProjects() {
  const projects = await Api.get('/api/projects');
  const list = qs('#project-list');
  list.innerHTML = '';
  qs('#empty-state').style.display = projects.length ? 'none' : 'block';
  projects.forEach((p) => {
    const card = h(`
      <a class="project-card" href="project.html?id=${p.id}">
        <h3>${escapeHtml(p.title)}${p.subtitle ? ` <small style="color:#999">/ ${escapeHtml(p.subtitle)}</small>` : ''}</h3>
        <p>${escapeHtml(p.author || '著者未設定')} ・ ${escapeHtml(p.genre || 'ジャンル未設定')}</p>
      </a>
    `);
    list.appendChild(card);
  });
}

qs('#new-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = qs('#np-title').value.trim();
  if (!title) return;
  const project = await Api.post('/api/projects', {
    title,
    subtitle: qs('#np-subtitle').value.trim(),
    author: qs('#np-author').value.trim(),
    genre: qs('#np-genre').value.trim(),
  });
  window.location.href = `project.html?id=${project.id}`;
});

loadProjects();
