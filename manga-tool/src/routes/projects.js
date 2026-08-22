const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.get('/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  res.json(rows);
});

router.get('/projects/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});

router.post('/projects', (req, res) => {
  const { title, subtitle, author, series_title, genre, trim_size, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title_required' });
  const id = randomUUID();
  db.prepare(`
    INSERT INTO projects (id, title, subtitle, author, series_title, genre, trim_size, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title.trim(), subtitle || null, author || null, series_title || null, genre || null, trim_size || 'B6(コミック標準)', description || null);
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

router.put('/projects/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const fields = ['title', 'subtitle', 'author', 'series_title', 'genre', 'trim_size', 'description', 'kdp_keywords', 'kdp_categories'];
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE projects SET title=?, subtitle=?, author=?, series_title=?, genre=?, trim_size=?, description=?, kdp_keywords=?, kdp_categories=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(...fields.map((f) => next[f] ?? null), req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.delete('/projects/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

module.exports = router;
