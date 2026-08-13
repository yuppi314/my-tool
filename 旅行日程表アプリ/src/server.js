require('dotenv').config();
const path = require('path');
const express = require('express');

const itineraryRoutes = require('./routes/itinerary');
const gourmetRoutes = require('./routes/gourmet');
const spotsRoutes = require('./routes/spots');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/itinerary', itineraryRoutes);
app.use('/api/gourmet', gourmetRoutes);
app.use('/api/spots', spotsRoutes);

app.listen(PORT, () => {
  console.log(`旅行日程表アプリ起動: http://localhost:${PORT}`);
  if (!process.env.HOTPEPPER_API_KEY) {
    console.log('※ HOTPEPPER_API_KEY 未設定のため、グルメ検索はサンプルデータで動作します');
  }
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.log('※ GOOGLE_PLACES_API_KEY 未設定のため、観光地検索はサンプルデータで動作します');
  }
});
