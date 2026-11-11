const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.get('/projects/:projectId/chapters', (req, res) => {
  const rows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC, created_at ASC').all(req.params.projectId);
  res.json(rows);
});

router.get('/chapters/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});

router.post('/projects/:projectId/chapters', (req, res) => {
  const { title, summary, status, page_label } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title_required' });
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM chapters WHERE project_id = ?').get(req.params.projectId).m;
  db.prepare(`
    INSERT INTO chapters (id, project_id, order_index, title, summary, status, page_label)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.projectId, maxOrder + 1, title.trim(), summary || null, status || 'plot', page_label || null);
  res.status(201).json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(id));
});

router.put('/chapters/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const fields = ['title', 'summary', 'status', 'page_label', 'order_index', 'show_in_toc'];
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE chapters SET title=?, summary=?, status=?, page_label=?, order_index=?, show_in_toc=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(...fields.map((f) => next[f] ?? null), req.params.id);
  res.json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id));
});

router.post('/projects/:projectId/chapters/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds_required' });
  const update = db.prepare('UPDATE chapters SET order_index = ? WHERE id = ? AND project_id = ?');
  const txn = db.transaction((ids) => {
    ids.forEach((id, idx) => update.run(idx, id, req.params.projectId));
  });
  txn(orderedIds);
  res.json({ ok: true });
});

router.delete('/chapters/:id', (req, res) => {
  const result = db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

module.exports = router;
