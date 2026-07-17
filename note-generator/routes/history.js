const express = require("express");
const { listArticles, getArticle } = require("../lib/storage");

const router = express.Router();

router.get("/history", (req, res) => {
  res.json(listArticles());
});

router.get("/history/:id", (req, res) => {
  const article = getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: "記事が見つかりません。" });
  }
  res.json(article);
});

module.exports = router;
