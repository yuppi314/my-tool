const express = require('express');
const db = require('../db');
const kaigyoAuth = require('../middleware/kaigyoAuth');
const { searchSubsidies, getSubsidyDetail } = require('../lib/jgrants');

const router = express.Router();
router.use(kaigyoAuth);

router.get('/subsidies/search', async (req, res) => {
  const { keyword, prefecture, employeeCount, acceptingOnly } = req.query;
  const result = await searchSubsidies({
    keyword,
    prefecture,
    employeeCount,
    acceptingOnly: acceptingOnly === '1' || acceptingOnly === 'true',
  });
  if (!result.ok) {
    return res.status(200).json({ ok: false, message: result.message, results: [] });
  }
  res.json({ ok: true, results: result.results });
});

router.get('/subsidies/:id', async (req, res) => {
  const result = await getSubsidyDetail(req.params.id);
  if (!result.ok) {
    return res.status(200).json({ ok: false, message: result.message });
  }
  res.json({ ok: true, detail: result.detail });
});

router.get('/subsidy-bookmarks', (req, res) => {
  const rows = db.prepare('SELECT * FROM subsidy_bookmarks ORDER BY (deadline IS NULL), deadline ASC').all();
  const bookmarks = rows.map((r) => ({
    id: r.id,
    subsidyId: r.subsidy_id,
    title: r.title,
    deadline: r.deadline,
    status: r.status,
    memo: r.memo,
  }));
  res.json({ bookmarks });
});

router.post('/subsidy-bookmarks', (req, res) => {
  const { subsidyId, title, deadline } = req.body || {};
  if (!subsidyId) return res.status(400).json({ error: '補助金のIDが必要です。' });

  db.prepare(
    `INSERT INTO subsidy_bookmarks (subsidy_id, title, deadline, status, updated_at)
     VALUES (?, ?, ?, 'considering', datetime('now'))
     ON CONFLICT(subsidy_id) DO UPDATE SET title=excluded.title, deadline=excluded.deadline, updated_at=datetime('now')`
  ).run(subsidyId, title || '', deadline || null);

  res.json({ ok: true });
});

router.patch('/subsidy-bookmarks/:id', (req, res) => {
  const { status, memo } = req.body || {};
  const allowed = ['considering', 'planning_to_apply', 'not_applicable'];
  const row = db.prepare('SELECT * FROM subsidy_bookmarks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '見つかりませんでした。' });

  const nextStatus = status !== undefined ? status : row.status;
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({ error: 'ステータスの値が正しくありません。' });
  }
  const nextMemo = memo !== undefined ? memo : row.memo;

  db.prepare(`UPDATE subsidy_bookmarks SET status=?, memo=?, updated_at=datetime('now') WHERE id=?`).run(
    nextStatus,
    nextMemo,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/subsidy-bookmarks/:id', (req, res) => {
  db.prepare('DELETE FROM subsidy_bookmarks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
