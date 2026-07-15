requireKaigyoLogin();
renderKaigyoNav('tasks.html');

let allTasks = [];

async function load() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/tasks');
  if (!ok) {
    document.getElementById('task-list').innerHTML = '<p class="error-text">読み込みに失敗しました。</p>';
    return;
  }
  allTasks = data.tasks;

  document.getElementById('progress-fill').style.width = `${data.progress.percent}%`;
  document.getElementById('progress-text').textContent =
    `${data.progress.total}件中 ${data.progress.done}件が終わりました(${data.progress.percent}%)`;

  const categorySelect = document.getElementById('filter-category');
  const seen = new Set(Array.from(categorySelect.options).map((o) => o.value));
  const categories = [...new Map(allTasks.map((t) => [t.category, t.categoryLabel])).entries()];
  categories.forEach(([value, label]) => {
    if (!seen.has(value)) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      categorySelect.appendChild(opt);
    }
  });

  if (allTasks.length === 0) {
    document.getElementById('task-list').innerHTML =
      '<p class="muted">まだやることリストがありません。「設定」から開業日などを入力してください。</p>';
  }
  render();
}

function render() {
  const category = document.getElementById('filter-category').value;
  const status = document.getElementById('filter-status').value;
  const filtered = allTasks.filter(
    (t) => (!category || t.category === category) && (!status || t.status === status)
  );

  const list = document.getElementById('task-list');
  if (filtered.length === 0 && allTasks.length > 0) {
    list.innerHTML = '<p class="muted">条件に合うタスクがありません。</p>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (t) => `
    <div class="task-item" data-id="${t.id}">
      <div class="task-top">
        <span class="task-title">${t.title}</span>
        ${dueBadgeHtml(t.dueDate)}
      </div>
      <div class="task-desc">${t.description}</div>
      <div class="task-meta">提出先・相談先: ${t.whereToSubmit}</div>
      <div style="margin-top:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <select class="status-select">
          <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>まだやっていない</option>
          <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>やっている途中</option>
          <option value="done" ${t.status === 'done' ? 'selected' : ''}>終わった</option>
        </select>
      </div>
      <label style="margin-top:10px;">メモ</label>
      <textarea class="memo-input" placeholder="気づいたことを書いておけます">${t.memo || ''}</textarea>
      <button class="btn btn-secondary save-btn" style="margin-top:8px;">保存する</button>
      <span class="success-text save-msg"></span>
    </div>`
    )
    .join('');

  list.querySelectorAll('.task-item').forEach((item) => {
    const id = item.dataset.id;
    const statusSelect = item.querySelector('.status-select');
    const memoInput = item.querySelector('.memo-input');
    const saveBtn = item.querySelector('.save-btn');
    const saveMsg = item.querySelector('.save-msg');

    saveBtn.addEventListener('click', async () => {
      const { ok } = await kaigyoFetch(`/api/kaigyo/tasks/${id}`, {
        method: 'PATCH',
        body: { status: statusSelect.value, memo: memoInput.value },
      });
      const task = allTasks.find((t) => t.id === id);
      if (task) {
        task.status = statusSelect.value;
        task.memo = memoInput.value;
      }
      saveMsg.textContent = ok ? '保存しました' : '保存に失敗しました';
      setTimeout(() => {
        saveMsg.textContent = '';
      }, 1500);
    });
  });
}

document.getElementById('filter-category').addEventListener('change', render);
document.getElementById('filter-status').addEventListener('change', render);

load();
