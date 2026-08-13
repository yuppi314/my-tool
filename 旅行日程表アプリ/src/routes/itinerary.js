const express = require('express');
const { generateItinerary } = require('../lib/itinerary');

const router = express.Router();

router.post('/', (req, res) => {
  const { destination, days, arrival, departure, gourmetGenre } = req.body || {};

  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({ error: '行き先を入力してください' });
  }
  if (!days || Number(days) < 1) {
    return res.status(400).json({ error: '日数を1以上で入力してください' });
  }

  const result = generateItinerary({ destination, days, arrival, departure, gourmetGenre });
  res.json(result);
});

module.exports = router;
