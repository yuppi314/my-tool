const express = require("express");
const db = require("../db");
const { generatePanelImage } = require("../lib/imageProvider");
const { pageToSvg } = require("../lib/composeSvg");
const { buildPdf, trimSizePt } = require("../lib/pdfExport");

const router = express.Router();

function loadScenario(id) {
  const row = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(id);
  if (!row) return null;
  return JSON.parse(row.data_json);
}

function loadPanelImage(scenarioId, pageNumber, panelNumber) {
  const row = db
    .prepare(
      "SELECT * FROM panel_images WHERE scenario_id = ? AND page_number = ? AND panel_number = ?"
    )
    .get(scenarioId, pageNumber, panelNumber);
  if (!row) return null;
  if (row.provider === "placeholder") {
    return { isPlaceholder: true, placeholder: JSON.parse(row.image_data.toString("utf8")) };
  }
  return { isPlaceholder: false, buffer: row.image_data, mimeType: row.mime_type };
}

function savePanelImage(scenarioId, pageNumber, panelNumber, result) {
  const isPlaceholder = !!result.placeholder;
  const provider = isPlaceholder ? "placeholder" : process.env.IMAGE_PROVIDER || "openai";
  const data = isPlaceholder ? Buffer.from(JSON.stringify(result.placeholder), "utf8") : result.buffer;
  const mimeType = isPlaceholder ? "application/json" : result.mimeType;

  db.prepare(
    `INSERT INTO panel_images (scenario_id, page_number, panel_number, provider, mime_type, image_data)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(scenario_id, page_number, panel_number)
     DO UPDATE SET provider = excluded.provider, mime_type = excluded.mime_type, image_data = excluded.image_data, created_at = datetime('now')`
  ).run(scenarioId, pageNumber, panelNumber, provider, mimeType, data);
}

/** シナリオの全コマ分の画像(またはプレースホルダー)を生成する */
router.post("/:id/generate-images", async (req, res) => {
  const scenario = loadScenario(req.params.id);
  if (!scenario) return res.status(404).json({ error: "シナリオが見つかりません" });

  let generated = 0;
  const errors = [];

  for (const page of scenario.pages) {
    for (const panel of page.panels) {
      try {
        const result = await generatePanelImage({
          panel,
          characters: scenario.characters,
          artStyle: req.body && req.body.artStyle,
        });
        savePanelImage(req.params.id, page.page_number, panel.panel_number, result);
        generated += 1;
      } catch (err) {
        console.error(err);
        errors.push({ page: page.page_number, panel: panel.panel_number, error: err.message });
      }
    }
  }

  res.json({ generated, errors });
});

/** 1ページ分をSVGで返す(プレビュー表示用) */
router.get("/:id/page/:pageNumber.svg", (req, res) => {
  const scenario = loadScenario(req.params.id);
  if (!scenario) return res.status(404).send("Not found");

  const pageNumber = Number(req.params.pageNumber);
  const page = scenario.pages.find((p) => p.page_number === pageNumber);
  if (!page) return res.status(404).send("Page not found");

  const panelImages = new Map();
  for (const panel of page.panels) {
    const img = loadPanelImage(req.params.id, pageNumber, panel.panel_number);
    if (img) panelImages.set(panel.panel_number, img);
  }

  const svg = pageToSvg(page, panelImages, { width: 700, height: 1050 });
  res.set("Content-Type", "image/svg+xml");
  res.send(svg);
});

/** シナリオ全体を印刷用PDFとして書き出す */
router.get("/:id/pdf", (req, res) => {
  const scenario = loadScenario(req.params.id);
  if (!scenario) return res.status(404).send("Not found");

  const panelImagesByPage = new Map();
  for (const page of scenario.pages) {
    const panelImages = new Map();
    for (const panel of page.panels) {
      const img = loadPanelImage(req.params.id, page.page_number, panel.panel_number);
      if (img) panelImages.set(panel.panel_number, img);
    }
    panelImagesByPage.set(page.page_number, panelImages);
  }

  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(scenario.title || "manga")}.pdf"`);
  buildPdf({ scenario, panelImagesByPage }, res);
});

router.get("/:id/trim-size", (req, res) => {
  res.json(trimSizePt());
});

module.exports = router;
