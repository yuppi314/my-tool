require('dotenv').config();
const path = require('path');
const express = require('express');

const itineraryRoutes = require('./routes/itinerary');
const gourmetRoutes = require('./routes/gourmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/itinerary', itineraryRoutes);
app.use('/api/gourmet', gourmetRoutes);

app.listen(PORT, () => {
  console.log(`旅行日程表アプリ起動: http://localhost:${PORT}`);
  if (!process.env.HOTPEPPER_API_KEY) {
    console.log('※ HOTPEPPER_API_KEY 未設定のため、グルメ検索はサンプルデータで動作します');
  }
});
