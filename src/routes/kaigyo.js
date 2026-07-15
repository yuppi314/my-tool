const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const kaigyoAuth = require('../middleware/kaigyoAuth');
const { CATEGORIES, TASK_TEMPLATES, buildTasksForProfile } = require('../lib/kaigyoTasks');

const router = express.Router();
router.use(kaigyoAuth);

function toProfileResponse(row) {
  if (!row) return null;
  return {
    fullName: row.full_name,
    address: row.address,
    businessName: row.business_name,
    businessType: row.business_type,
    industryKeyword: row.industry_keyword,
    prefecture: row.prefecture,
    startDate: row.start_date,
    resignDate: row.resign_date,
    previousStatus: row.previous_status,
    wantsBlueTaxReturn: !!row.wants_blue_tax_return,
    hasFamilyEmployee: !!row.has_family_employee,
    hasEmployee: !!row.has_employee,
    updatedAt: row.updated_at,
  };
}

router.get('/kaigyo/profile', (req, res) => {
  const row = db.prepare('SELECT * FROM kaigyo_profile WHERE id = 1').get();
  res.json({ profile: toProfileResponse(row) });
});

router.post('/kaigyo/profile', (req, res) => {
  const b = req.body || {};
  if (!b.startDate) {
    return res.status(400).json({ error: '開業日を入力してください。' });
  }

  const profile = {
    full_name: b.fullName || '',
    address: b.address || '',
    business_name: b.businessName || '',
    business_type: b.businessType || '',
    industry_keyword: b.industryKeyword || '',
    prefecture: b.prefecture || '',
    start_date: b.startDate,
    resign_date: b.resignDate || null,
    previous_status: b.previousStatus || 'other',
    wants_blue_tax_return: b.wantsBlueTaxReturn ? 1 : 0,
    has_family_employee: b.hasFamilyEmployee ? 1 : 0,
    has_employee: b.hasEmployee ? 1 : 0,
  };

  db.prepare(
    `INSERT INTO kaigyo_profile
      (id, full_name, address, business_name, business_type, industry_keyword, prefecture, start_date, resign_date, previous_status, wants_blue_tax_return, has_family_employee, has_employee, updated_at)
     VALUES (1, @full_name, @address, @business_name, @business_type, @industry_keyword, @prefecture, @start_date, @resign_date, @previous_status, @wants_blue_tax_return, @has_family_employee, @has_employee, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       full_name=excluded.full_name,
       address=excluded.address,
       business_name=excluded.business_name,
       business_type=excluded.business_type,
       industry_keyword=excluded.industry_keyword,
       prefecture=excluded.prefecture,
       start_date=excluded.start_date,
       resign_date=excluded.resign_date,
       previous_status=excluded.previous_status,
       wants_blue_tax_return=excluded.wants_blue_tax_return,
       has_family_employee=excluded.has_family_employee,
       has_employee=excluded.has_employee,
       updated_at=datetime('now')`
  ).run(profile);

  syncTasksWithProfile(profile);

  const row = db.prepare('SELECT * FROM kaigyo_profile WHERE id = 1').get();
  res.json({ profile: toProfileResponse(row) });
});

// プロフィールにあわせて、やることリスト(タスク)を作りなおす。
// すでに進めている(状態やメモがある)ものはそのまま残す。
function syncTasksWithProfile(profile) {
  const wanted = buildTasksForProfile(profile);
  const wantedKeys = new Set(wanted.map((t) => t.templateKey));

  const existing = db.prepare('SELECT * FROM kaigyo_tasks').all();
  const existingByKey = new Map(existing.map((t) => [t.template_key, t]));

  // もう当てはまらなくなったタスクは削除する
  for (const row of existing) {
    if (!wantedKeys.has(row.template_key)) {
      db.prepare('DELETE FROM kaigyo_tasks WHERE id = ?').run(row.id);
    }
  }

  for (const t of wanted) {
    const current = existingByKey.get(t.templateKey);
    if (current) {
      db.prepare(
        `UPDATE kaigyo_tasks SET title=?, description=?, where_to_submit=?, due_date=?, sort_order=?, updated_at=datetime('now') WHERE id=?`
      ).run(t.title, t.description, t.whereToSubmit, t.dueDate, t.sortOrder, current.id);
    } else {
      db.prepare(
        `INSERT INTO kaigyo_tasks (id, template_key, category, title, description, where_to_submit, due_date, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?)`
      ).run(uuidv4(), t.templateKey, t.category, t.title, t.description, t.whereToSubmit, t.dueDate, t.sortOrder);
    }
  }
}

router.get('/kaigyo/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM kaigyo_tasks ORDER BY (due_date IS NULL), due_date ASC, sort_order ASC').all();
  const tasks = rows.map((r) => ({
    id: r.id,
    category: r.category,
    categoryLabel: CATEGORIES[r.category] || r.category,
    title: r.title,
    description: r.description,
    whereToSubmit: r.where_to_submit,
    dueDate: r.due_date,
    status: r.status,
    memo: r.memo,
  }));
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  res.json({
    tasks,
    progress: { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 },
  });
});

router.patch('/kaigyo/tasks/:id', (req, res) => {
  const { status, memo } = req.body || {};
  const allowedStatus = ['todo', 'in_progress', 'done'];
  const row = db.prepare('SELECT * FROM kaigyo_tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'タスクが見つかりませんでした。' });

  const nextStatus = status !== undefined ? status : row.status;
  if (!allowedStatus.includes(nextStatus)) {
    return res.status(400).json({ error: 'ステータスの値が正しくありません。' });
  }
  const nextMemo = memo !== undefined ? memo : row.memo;

  db.prepare(`UPDATE kaigyo_tasks SET status=?, memo=?, updated_at=datetime('now') WHERE id=?`).run(
    nextStatus,
    nextMemo,
    req.params.id
  );
  res.json({ ok: true });
});

module.exports = router;
