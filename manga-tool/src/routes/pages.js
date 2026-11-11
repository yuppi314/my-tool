const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

const TEMPLATES = {
  splash: [{ x: 0, y: 0, w: 100, h: 100 }],
  h2: [
    { x: 0, y: 0, w: 100, h: 49 },
    { x: 0, y: 51, w: 100, h: 49 },
  ],
  v2: [
    { x: 0, y: 0, w: 49, h: 100 },
    { x: 51, y: 0, w: 49, h: 100 },
  ],
  t3: [
    { x: 0, y: 0, w: 100, h: 32 },
    { x: 0, y: 34, w: 49, h: 66 },
    { x: 51, y: 34, w: 49, h: 66 },
  ],
  grid4: [
    { x: 0, y: 0, w: 49, h: 49 }, { x: 51, y: 0, w: 49, h: 49 },
    { x: 0, y: 51, w: 49, h: 49 }, { x: 51, y: 51, w: 49, h: 49 },
  ],
  grid6: [
    { x: 0, y: 0, w: 32, h: 32 }, { x: 34, y: 0, w: 32, h: 32 }, { x: 68, y: 0, w: 32, h: 32 },
    { x: 0, y: 34, w: 32, h: 32 }, { x: 34, y: 34, w: 32, h: 32 }, { x: 68, y: 34, w: 32, h: 32 },
  ],
  grid8: [
    { x: 0, y: 0, w: 49, h: 24 }, { x: 51, y: 0, w: 49, h: 24 },
    { x: 0, y: 25.5, w: 49, h: 24 }, { x: 51, y: 25.5, w: 49, h: 24 },
    { x: 0, y: 51, w: 49, h: 24 }, { x: 51, y: 51, w: 49, h: 24 },
    { x: 0, y: 76.5, w: 49, h: 23.5 }, { x: 51, y: 76.5, w: 49, h: 23.5 },
  ],
};

function insertPanelsForTemplate(pageId, templateKey) {
  const shape = TEMPLATES[templateKey] || TEMPLATES.grid4;
  const insert = db.prepare(`
    INSERT INTO panels (id, page_id, order_index, x, y, w, h)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  shape.forEach((rect, idx) => {
    insert.run(randomUUID(), pageId, idx, rect.x, rect.y, rect.w, rect.h);
  });
}

router.get('/templates', (req, res) => {
  res.json(Object.keys(TEMPLATES).map((key) => ({ key, panelCount: TEMPLATES[key].length })));
});

router.get('/chapters/:chapterId/pages', (req, res) => {
  const pages = db.prepare('SELECT * FROM pages WHERE chapter_id = ? ORDER BY order_index ASC, created_at ASC').all(req.params.chapterId);
  const panelStmt = db.prepare('SELECT * FROM panels WHERE page_id = ? ORDER BY order_index ASC, created_at ASC');
  const result = pages.map((page) => ({
    ...page,
    panels: panelStmt.all(page.id).map(withParsedCharacterIds),
  }));
  res.json(result);
});

router.post('/chapters/:chapterId/pages', (req, res) => {
  const { notes, template } = req.body;
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM pages WHERE chapter_id = ?').get(req.params.chapterId).m;
  db.prepare('INSERT INTO pages (id, chapter_id, order_index, notes) VALUES (?, ?, ?, ?)')
    .run(id, req.params.chapterId, maxOrder + 1, notes || null);
  insertPanelsForTemplate(id, template || 'grid4');
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
  const panels = db.prepare('SELECT * FROM panels WHERE page_id = ? ORDER BY order_index ASC').all(id).map(withParsedCharacterIds);
  res.status(201).json({ ...page, panels });
});

router.put('/pages/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const notes = req.body.notes !== undefined ? req.body.notes : existing.notes;
  const order_index = req.body.order_index !== undefined ? req.body.order_index : existing.order_index;
  db.prepare(`UPDATE pages SET notes=?, order_index=?, updated_at=datetime('now') WHERE id=?`).run(notes, order_index, req.params.id);
  res.json(db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id));
});

router.post('/pages/:id/apply-template', (req, res) => {
  const { template } = req.body;
  const existing = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM panels WHERE page_id = ?').run(req.params.id);
  insertPanelsForTemplate(req.params.id, template || 'grid4');
  const panels = db.prepare('SELECT * FROM panels WHERE page_id = ? ORDER BY order_index ASC').all(req.params.id).map(withParsedCharacterIds);
  res.json({ ...existing, panels });
});

router.delete('/pages/:id', (req, res) => {
  const result = db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

// --- panels ---

router.post('/pages/:pageId/panels', (req, res) => {
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM panels WHERE page_id = ?').get(req.params.pageId).m;
  const { x = 10, y = 10, w = 30, h = 30, shot_type, description, dialogue, character_ids } = req.body;
  db.prepare(`
    INSERT INTO panels (id, page_id, order_index, x, y, w, h, shot_type, description, dialogue, character_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.pageId, maxOrder + 1, x, y, w, h, shot_type || '標準', description || null, dialogue || null, JSON.stringify(character_ids || []));
  res.status(201).json(withParsedCharacterIds(db.prepare('SELECT * FROM panels WHERE id = ?').get(id)));
});

router.put('/panels/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM panels WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const fields = ['x', 'y', 'w', 'h', 'shot_type', 'description', 'dialogue', 'order_index'];
  const next = { ...existing, ...req.body };
  const character_ids = req.body.character_ids !== undefined ? JSON.stringify(req.body.character_ids) : existing.character_ids;
  db.prepare(`
    UPDATE panels SET x=?, y=?, w=?, h=?, shot_type=?, description=?, dialogue=?, order_index=?, character_ids=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(...fields.map((f) => next[f] ?? null), character_ids, req.params.id);
  res.json(withParsedCharacterIds(db.prepare('SELECT * FROM panels WHERE id = ?').get(req.params.id)));
});

router.delete('/panels/:id', (req, res) => {
  const result = db.prepare('DELETE FROM panels WHERE id = ?').run(req.params.id);
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
