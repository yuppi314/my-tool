require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const scenarioRoutes = require("./routes/scenario");
const mangaRoutes = require("./routes/manga");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/scenario", scenarioRoutes);
app.use("/api/manga", mangaRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI漫画作成ツール: http://localhost:${PORT}`);
});
