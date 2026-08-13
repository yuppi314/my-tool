const express = require('express');

const router = express.Router();

const PLACES_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const HIDDEN_MAX_REVIEWS = 300;
const HIDDEN_MIN_RATING = 4.0;

function mockSpots(area, mode) {
  if (mode === 'hidden') {
    return [
      {
        name: `${area}の穴場スポット(サンプル)`,
        rating: 4.6,
        ratingsTotal: 42,
        address: `${area}内`,
        note: 'Google Places APIキーを設定すると実際のスポットが表示されます'
      },
      {
        name: `${area}の隠れた名所(サンプル)`,
        rating: 4.8,
        ratingsTotal: 18,
        address: `${area}内`,
        note: 'Google Places APIキーを設定すると実際のスポットが表示されます'
      }
    ];
  }
  return [
    {
      name: `${area}の定番観光地A(サンプル)`,
      rating: 4.3,
      ratingsTotal: 5200,
      address: `${area}内`,
      note: 'Google Places APIキーを設定すると実際のスポットが表示されます'
    },
    {
      name: `${area}の定番観光地B(サンプル)`,
      rating: 4.2,
      ratingsTotal: 3100,
      address: `${area}内`,
      note: 'Google Places APIキーを設定すると実際のスポットが表示されます'
    }
  ];
}

router.get('/', async (req, res) => {
  const area = String(req.query.area || '').trim();
  const mode = req.query.mode === 'hidden' ? 'hidden' : 'popular';

  if (!area) {
    return res.status(400).json({ error: 'area は必須です' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.json({ mock: true, results: mockSpots(area, mode) });
  }

  try {
    const params = new URLSearchParams({
      query: `${area} 観光地`,
      type: 'tourist_attraction',
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

    let places = (data.results || []).map((p) => ({
      name: p.name,
      rating: p.rating || null,
      ratingsTotal: p.user_ratings_total || 0,
      address: p.formatted_address,
      note: null
    }));

    if (mode === 'hidden') {
      // 「地元民のおすすめ」を厳密には判定できないため、評価は高いがレビュー数の少ない
      // スポットを"穴場"の目安として抽出する疑似的なロジック。
      places = places
        .filter((p) => p.rating && p.rating >= HIDDEN_MIN_RATING && p.ratingsTotal > 0 && p.ratingsTotal < HIDDEN_MAX_REVIEWS)
        .sort((a, b) => b.rating - a.rating);
    } else {
      places = places.filter((p) => p.rating).sort((a, b) => b.ratingsTotal - a.ratingsTotal);
    }

    return res.json({ mock: false, results: places.slice(0, 8) });
  } catch (err) {
    console.error('観光地検索に失敗しました:', err.message);
    return res.json({
      mock: true,
      results: mockSpots(area, mode),
      error: 'API呼び出しに失敗したためサンプルを表示しています'
    });
  }
});

module.exports = router;
