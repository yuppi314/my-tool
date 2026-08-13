const express = require('express');

const router = express.Router();

const PHOTO_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/photo';
const MAX_WIDTH_LIMIT = 800;

// Google Places の photo_reference は英数字・記号のみで構成される想定のためバリデーションする。
const PHOTO_REF_PATTERN = /^[A-Za-z0-9_\-]+$/;

router.get('/', async (req, res) => {
  const ref = String(req.query.ref || '');
  const maxwidth = Math.min(Number(req.query.maxwidth) || 400, MAX_WIDTH_LIMIT);

  if (!ref || !PHOTO_REF_PATTERN.test(ref)) {
    return res.status(400).json({ error: 'ref が不正です' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'GOOGLE_PLACES_API_KEY が未設定です' });
  }

  try {
    const params = new URLSearchParams({
      photo_reference: ref,
      maxwidth: String(maxwidth),
      key: apiKey
    });
    const response = await fetch(`${PHOTO_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      return res.status(502).json({ error: '写真の取得に失敗しました' });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('写真の取得に失敗しました:', err.message);
    res.status(502).json({ error: '写真の取得に失敗しました' });
  }
});

module.exports = router;
