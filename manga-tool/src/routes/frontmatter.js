const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.get('/projects/:projectId/frontmatter', (req, res) => {
  const rows = db.prepare('SELECT * FROM frontmatter WHERE project_id = ?').all(req.params.projectId);
  const result = { foreword: '', afterword: '' };
  rows.forEach((row) => { result[row.type] = row.content || ''; });
  res.json(result);
});

router.put('/projects/:projectId/frontmatter/:type', (req, res) => {
  const { type } = req.params;
  if (!['foreword', 'afterword'].includes(type)) return res.status(400).json({ error: 'invalid_type' });
  const { content } = req.body;
  const existing = db.prepare('SELECT * FROM frontmatter WHERE project_id = ? AND type = ?').get(req.params.projectId, type);
  if (existing) {
    db.prepare(`UPDATE frontmatter SET content=?, updated_at=datetime('now') WHERE id=?`).run(content || '', existing.id);
  } else {
    db.prepare('INSERT INTO frontmatter (id, project_id, type, content) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), req.params.projectId, type, content || '');
  }
  res.json({ type, content: content || '' });
});

module.exports = router;
