require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const projectRoutes = require('./routes/projects');
const characterRoutes = require('./routes/characters');
const chapterRoutes = require('./routes/chapters');
const sceneRoutes = require('./routes/scenes');
const pageRoutes = require('./routes/pages');
const frontmatterRoutes = require('./routes/frontmatter');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', projectRoutes);
app.use('/api', characterRoutes);
app.use('/api', chapterRoutes);
app.use('/api', sceneRoutes);
app.use('/api', pageRoutes);
app.use('/api', frontmatterRoutes);
app.use('/api', exportRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Kindle漫画制作ツール起動: http://localhost:${PORT}`);
});
