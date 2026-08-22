const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.get('/chapters/:chapterId/scenes', (req, res) => {
  const rows = db.prepare('SELECT * FROM scenes WHERE chapter_id = ? ORDER BY order_index ASC, created_at ASC').all(req.params.chapterId);
  res.json(rows.map(withParsedCharacterIds));
});

router.post('/chapters/:chapterId/scenes', (req, res) => {
  const { heading, script, character_ids } = req.body;
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM scenes WHERE chapter_id = ?').get(req.params.chapterId).m;
  db.prepare(`
    INSERT INTO scenes (id, chapter_id, order_index, heading, script, character_ids)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.chapterId, maxOrder + 1, heading || null, script || null, JSON.stringify(character_ids || []));
  res.status(201).json(withParsedCharacterIds(db.prepare('SELECT * FROM scenes WHERE id = ?').get(id)));
});

router.put('/scenes/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const heading = req.body.heading !== undefined ? req.body.heading : existing.heading;
  const script = req.body.script !== undefined ? req.body.script : existing.script;
  const character_ids = req.body.character_ids !== undefined ? JSON.stringify(req.body.character_ids) : existing.character_ids;
  const order_index = req.body.order_index !== undefined ? req.body.order_index : existing.order_index;
  db.prepare(`
    UPDATE scenes SET heading=?, script=?, character_ids=?, order_index=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(heading, script, character_ids, order_index, req.params.id);
  res.json(withParsedCharacterIds(db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id)));
});

router.delete('/scenes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM scenes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

function withParsedCharacterIds(row) {
  if (!row) return row;
  let character_ids = [];
  try { character_ids = JSON.parse(row.character_ids || '[]'); } catch (e) { character_ids = []; }
  return { ...row, character_ids };
}

module.exports = router;
