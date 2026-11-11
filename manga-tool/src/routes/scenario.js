const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { generateScenario } = require("../lib/scenario");

const router = express.Router();

function normalizeDirection(value) {
  return value === "ltr" ? "ltr" : "rtl";
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, title, premise, art_style, reading_direction, created_at, updated_at FROM scenarios ORDER BY created_at DESC"
    )
    .all();
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "シナリオが見つかりません" });
  res.json({
    id: row.id,
    title: row.title,
    premise: row.premise,
    art_style: row.art_style,
    reading_direction: row.reading_direction,
    ...JSON.parse(row.data_json),
  });
});

router.post("/generate", async (req, res) => {
  const { premise, numPages, artStyle, readingDirection } = req.body || {};
  if (!premise || typeof premise !== "string") {
    return res.status(400).json({ error: "premise は必須です" });
  }
  const direction = normalizeDirection(readingDirection);
  try {
    const scenario = await generateScenario({
      premise,
      numPages: Number(numPages) || 4,
      artStyle: artStyle || "",
    });

    const id = uuidv4();
    db.prepare(
      "INSERT INTO scenarios (id, title, premise, art_style, reading_direction, data_json) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, scenario.title, premise, artStyle || "", direction, JSON.stringify(scenario));

    res.json({ id, reading_direction: direction, ...scenario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "シナリオ生成に失敗しました" });
  }
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT id FROM scenarios WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "シナリオが見つかりません" });

  const scenario = req.body;
  if (!scenario || !scenario.title || !Array.isArray(scenario.pages)) {
    return res.status(400).json({ error: "不正なシナリオデータです" });
  }

  if (scenario.reading_direction) {
    db.prepare(
      "UPDATE scenarios SET title = ?, data_json = ?, reading_direction = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(scenario.title, JSON.stringify(scenario), normalizeDirection(scenario.reading_direction), id);
  } else {
    db.prepare(
      "UPDATE scenarios SET title = ?, data_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(scenario.title, JSON.stringify(scenario), id);
  }

  res.json({ ok: true });
});

module.exports = router;
