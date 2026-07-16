const path = require('path');
const express = require('express');
const apiRoutes = require('./routes/races');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`予想びより: http://localhost:${PORT}`);
});
