const express = require("express");
const { generateArticle } = require("../lib/generator");
const { saveArticle } = require("../lib/storage");

const router = express.Router();

router.post("/generate", async (req, res) => {
  const { theme, targetReader, tone, length, reference } = req.body || {};

  if (!theme || !theme.trim()) {
    return res.status(400).json({ error: "テーマを入力してください。" });
  }

  const safeLength = Number(length) > 0 ? Number(length) : 3000;
  const safeTone = ["howto", "essay", "explainer"].includes(tone) ? tone : "howto";

  try {
    const result = await generateArticle({
      theme: theme.trim(),
      targetReader: (targetReader || "").trim(),
      tone: safeTone,
      length: safeLength,
      reference: (reference || "").trim(),
    });

    const entry = saveArticle({
      theme: theme.trim(),
      tone: safeTone,
      length: safeLength,
      titles: result.titles,
      markdown: result.markdown,
    });

    res.json({ ...entry, markdown: result.markdown });
  } catch (err) {
    console.error("記事生成に失敗しました:", err);
    res.status(500).json({ error: "記事生成に失敗しました。APIキーの設定や入力内容を確認してください。" });
  }
});

module.exports = router;
