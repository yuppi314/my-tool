require("dotenv").config();
const path = require("path");
const express = require("express");

const generateRoute = require("./routes/generate");
const historyRoute = require("./routes/history");

const app = express();
const PORT = process.env.PORT || 3100;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", generateRoute);
app.use("/api", historyRoute);

app.listen(PORT, () => {
  console.log(`note-generator: http://localhost:${PORT} で起動しました`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("警告: ANTHROPIC_API_KEY が未設定です。.env を作成して設定してください。");
  }
});
