const express = require('express');

const router = express.Router();

const HOTPEPPER_ENDPOINT = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';

function mockResults(area, genre) {
  const genreLabel = genre || 'グルメ';
  return [
    {
      name: `${area}の${genreLabel}店(サンプル)`,
      genre: genreLabel,
      access: `${area}駅から徒歩5分`,
      budget: '2,000円〜3,000円',
      url: null,
      note: 'ホットペッパーグルメAPIキーを設定すると実際のお店が表示されます'
    },
    {
      name: `${area}の人気${genreLabel}(サンプル)`,
      genre: genreLabel,
      access: `${area}周辺`,
      budget: '3,000円〜4,000円',
      url: null,
      note: 'ホットペッパーグルメAPIキーを設定すると実際のお店が表示されます'
    }
  ];
}

router.get('/', async (req, res) => {
  const area = String(req.query.area || '').trim();
  const genre = String(req.query.genre || '').trim();

  if (!area) {
    return res.status(400).json({ error: 'area は必須です' });
  }

  const apiKey = process.env.HOTPEPPER_API_KEY;
  if (!apiKey) {
    return res.json({ mock: true, results: mockResults(area, genre) });
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      keyword: `${area} ${genre}`.trim(),
      format: 'json',
      count: '10'
    });
    const response = await fetch(`${HOTPEPPER_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HotPepper API error: ${response.status}`);
    }
    const data = await response.json();
    const shops = (data.results && data.results.shop) || [];
    const results = shops.map((shop) => ({
      name: shop.name,
      genre: shop.genre && shop.genre.name,
      access: shop.access,
      budget: shop.budget && shop.budget.name,
      url: shop.urls && shop.urls.pc
    }));
    return res.json({ mock: false, results });
  } catch (err) {
    console.error('グルメ検索に失敗しました:', err.message);
    return res.json({ mock: true, results: mockResults(area, genre), error: 'API呼び出しに失敗したためサンプルを表示しています' });
  }
});

module.exports = router;
