const express = require('express');
const { photoRefFromPlace } = require('../lib/places');

const router = express.Router();

const PLACES_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

function mockLodging(area) {
  return [
    {
      name: `${area}の駅前ホテル(サンプル)`,
      rating: 4.2,
      ratingsTotal: 1800,
      address: `${area}内`,
      photoRef: null,
      note: 'Google Places APIキーを設定すると実際の宿泊施設が表示されます'
    },
    {
      name: `${area}の温泉旅館(サンプル)`,
      rating: 4.5,
      ratingsTotal: 640,
      address: `${area}内`,
      photoRef: null,
      note: 'Google Places APIキーを設定すると実際の宿泊施設が表示されます'
    }
  ];
}

router.get('/', async (req, res) => {
  const area = String(req.query.area || '').trim();

  if (!area) {
    return res.status(400).json({ error: 'area は必須です' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.json({ mock: true, results: mockLodging(area) });
  }

  try {
    const params = new URLSearchParams({
      query: `${area} ホテル 旅館`,
      type: 'lodging',
      language: 'ja',
      key: apiKey
    });
    const response = await fetch(`${PLACES_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API status: ${data.status}`);
    }

    const results = (data.results || [])
      .map((p) => ({
        name: p.name,
        rating: p.rating || null,
        ratingsTotal: p.user_ratings_total || 0,
        address: p.formatted_address,
        photoRef: photoRefFromPlace(p),
        note: null
      }))
      .filter((p) => p.rating)
      .sort((a, b) => b.rating - a.rating || b.ratingsTotal - a.ratingsTotal)
      .slice(0, 8);

    return res.json({ mock: false, results });
  } catch (err) {
    console.error('宿泊先検索に失敗しました:', err.message);
    return res.json({
      mock: true,
      results: mockLodging(area),
      error: 'API呼び出しに失敗したためサンプルを表示しています'
    });
  }
});

module.exports = router;
