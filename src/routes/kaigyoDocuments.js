const express = require('express');
const db = require('../db');
const kaigyoAuth = require('../middleware/kaigyoAuth');
const { DOCUMENT_TYPES } = require('../lib/kaigyoDocuments');

const router = express.Router();
router.use(kaigyoAuth);

router.get('/kaigyo/documents', (req, res) => {
  const rows = db.prepare('SELECT doc_type, updated_at FROM kaigyo_documents').all();
  const savedMap = new Map(rows.map((r) => [r.doc_type, r.updated_at]));

  const documents = Object.entries(DOCUMENT_TYPES).map(([docType, def]) => ({
    docType,
    title: def.title,
    officialName: def.officialName,
    summary: def.summary,
    whereToSubmit: def.whereToSubmit,
    hasDraft: savedMap.has(docType),
    updatedAt: savedMap.get(docType) || null,
  }));

  res.json({ documents });
});

router.get('/kaigyo/documents/:type', (req, res) => {
  const def = DOCUMENT_TYPES[req.params.type];
  if (!def) return res.status(404).json({ error: '書類の種類が見つかりませんでした。' });

  const row = db.prepare('SELECT * FROM kaigyo_documents WHERE doc_type = ?').get(req.params.type);
  let formData = {};
  if (row) {
    try {
      formData = JSON.parse(row.form_data);
    } catch (err) {
      formData = {};
    }
  }

  res.json({
    docType: req.params.type,
    title: def.title,
    officialName: def.officialName,
    summary: def.summary,
    whereToSubmit: def.whereToSubmit,
    fields: def.fields,
    formData,
    updatedAt: row ? row.updated_at : null,
  });
});

router.post('/kaigyo/documents/:type', (req, res) => {
  const def = DOCUMENT_TYPES[req.params.type];
  if (!def) return res.status(404).json({ error: '書類の種類が見つかりませんでした。' });

  const formData = req.body && typeof req.body === 'object' ? req.body : {};
  db.prepare(
    `INSERT INTO kaigyo_documents (doc_type, form_data, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(doc_type) DO UPDATE SET form_data=excluded.form_data, updated_at=datetime('now')`
  ).run(req.params.type, JSON.stringify(formData));

  res.json({ ok: true });
});

module.exports = router;
