const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.get('/projects/:projectId/characters', (req, res) => {
  const rows = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY order_index ASC, created_at ASC').all(req.params.projectId);
  res.json(rows);
});

router.post('/projects/:projectId/characters', (req, res) => {
  const { name, aliases, role, appearance, personality, speech_style, notes, color_tag, image_data } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name_required' });
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM characters WHERE project_id = ?').get(req.params.projectId).m;
  db.prepare(`
    INSERT INTO characters (id, project_id, order_index, name, aliases, role, appearance, personality, speech_style, notes, color_tag, image_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.projectId, maxOrder + 1, name.trim(), aliases || null, role || null, appearance || null, personality || null, speech_style || null, notes || null, color_tag || '#6c5ce7', image_data || null);
  res.status(201).json(db.prepare('SELECT * FROM characters WHERE id = ?').get(id));
});

router.put('/characters/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const fields = ['name', 'aliases', 'role', 'appearance', 'personality', 'speech_style', 'notes', 'color_tag', 'image_data', 'order_index'];
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE characters SET name=?, aliases=?, role=?, appearance=?, personality=?, speech_style=?, notes=?, color_tag=?, image_data=?, order_index=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(...fields.map((f) => next[f] ?? null), req.params.id);
  res.json(db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id));
});

router.delete('/characters/:id', (req, res) => {
  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

module.exports = router;
