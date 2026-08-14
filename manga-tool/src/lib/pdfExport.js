const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const { pageToSvg } = require("./composeSvg");

const PT_PER_IN = 72;

function trimSizePt() {
  const w = Number(process.env.PDF_TRIM_WIDTH_IN || 6);
  const h = Number(process.env.PDF_TRIM_HEIGHT_IN || 9);
  return { width: w * PT_PER_IN, height: h * PT_PER_IN };
}

/**
 * シナリオ全体をKDPペーパーバック向けの印刷用PDFにまとめる。
 * panelImagesByPage: Map<page_number, Map<panel_number, imageRecord>>
 */
function buildPdf({ scenario, panelImagesByPage }, res) {
  const { width, height } = trimSizePt();
  const doc = new PDFDocument({ size: [width, height], margin: 0, autoFirstPage: false });
  doc.pipe(res);

  // 表紙
  doc.addPage({ size: [width, height], margin: 0 });
  doc.rect(0, 0, width, height).fill("#111111");
  doc
    .fillColor("#ffffff")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text(scenario.title || "無題", 40, height / 2 - 60, { width: width - 80, align: "center" });
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(scenario.synopsis || "", 40, height / 2, { width: width - 80, align: "center" });

  for (const page of scenario.pages) {
    doc.addPage({ size: [width, height], margin: 0 });
    const panelImages = panelImagesByPage.get(page.page_number) || new Map();
    const svg = pageToSvg(page, panelImages, { width, height, readingDirection: scenario.reading_direction });
    SVGtoPDF(doc, svg, 0, 0, { width, height, preserveAspectRatio: "none" });
  }

  doc.end();
}

module.exports = { buildPdf, trimSizePt };
