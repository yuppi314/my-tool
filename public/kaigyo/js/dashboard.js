requireKaigyoLogin();
renderKaigyoNav('index.html');

async function init() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/profile');
  if (!ok || !data.profile) {
    document.getElementById('no-profile').style.display = 'block';
    return;
  }
  document.getElementById('dashboard').style.display = 'block';
  loadTasks();
}

async function loadTasks() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/tasks');
  if (!ok) return;

  const { tasks, progress } = data;
  document.getElementById('progress-fill').style.width = `${progress.percent}%`;
  document.getElementById('progress-text').textContent =
    `${progress.total}件中 ${progress.done}件が終わりました(${progress.percent}%)`;

  const upcoming = tasks
    .filter((t) => t.status !== 'done' && t.dueDate)
    .filter((t) => daysUntil(t.dueDate) <= 14)
    .slice(0, 5);

  const soonList = document.getElementById('soon-list');
  if (upcoming.length === 0) {
    soonList.innerHTML = '<p class="muted">締め切りが近いものはありません。</p>';
    return;
  }
  soonList.innerHTML = upcoming
    .map(
      (t) => `
      <div class="task-item">
        <div class="task-top">
          <span class="task-title">${t.title}</span>
          ${dueBadgeHtml(t.dueDate)}
        </div>
        <div class="task-meta">${t.categoryLabel}・${t.whereToSubmit}</div>
      </div>`
    )
    .join('');
}

init();
