const { computeLayout } = require("./layout");

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 長いテキストを1行あたりの目安文字数で複数行に分割する */
function wrapText(text, maxCharsPerLine) {
  const chars = Array.from(String(text || ""));
  const lines = [];
  let current = "";
  for (const ch of chars) {
    current += ch;
    if (current.length >= maxCharsPerLine) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textLinesSvg(lines, x, y, lineHeight, extraAttrs = "") {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" ${extraAttrs}>${escapeXml(line)}</text>`
    )
    .join("");
}

/**
 * 1ページ分のSVGマークアップを生成する。
 * panelImages: Map<panel_number, { buffer, mimeType, isPlaceholder, placeholder }>
 */
function pageToSvg(page, panelImages, { width = 900, height = 1350 } = {}) {
  const rects = computeLayout(page.panels.length);

  const panelsSvg = page.panels
    .map((panel, idx) => {
      const rect = rects[idx] || { x: 0, y: 0, width: 1, height: 1 };
      const px = rect.x * width;
      const py = rect.y * height;
      const pw = rect.width * width;
      const ph = rect.height * height;

      const img = panelImages.get(panel.panel_number);

      let artSvg;
      if (img && !img.isPlaceholder && img.buffer) {
        const b64 = img.buffer.toString("base64");
        artSvg = `<image x="${px}" y="${py}" width="${pw}" height="${ph}" preserveAspectRatio="xMidYMid slice" href="data:${img.mimeType};base64,${b64}" />`;
      } else {
        const color = img && img.placeholder ? img.placeholder.color : "#e5e5e5";
        const label = img && img.placeholder ? img.placeholder.label : panel.scene_description;
        const lines = wrapText(label, Math.max(10, Math.floor(pw / 14)));
        artSvg = `
          <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${color}" />
          ${textLinesSvg(
            lines.slice(0, 6),
            px + 10,
            py + 22,
            16,
            'font-size="13" fill="#333" font-family="sans-serif"'
          )}
        `;
      }

      // 効果音
      const sfxSvg = panel.sfx
        ? `<text x="${px + pw - 12}" y="${py + 30}" text-anchor="end" font-size="26" font-weight="900" font-family="sans-serif" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(
            panel.sfx
          )}</text>`
        : "";

      // キャプション(状況説明の帯)
      let captionSvg = "";
      if (panel.caption) {
        const capLines = wrapText(panel.caption, Math.max(10, Math.floor(pw / 12)));
        const capHeight = 14 + capLines.length * 16;
        captionSvg = `
          <rect x="${px}" y="${py}" width="${pw}" height="${capHeight}" fill="#fff" fill-opacity="0.88" />
          ${textLinesSvg(
            capLines,
            px + 6,
            py + 16,
            16,
            'font-size="12" fill="#000" font-family="sans-serif"'
          )}
        `;
      }

      // セリフ(吹き出し) — パネル下部に縦に積む簡易表示
      const dialogueCount = (panel.dialogue || []).length;
      const bubbleAreaHeight = Math.min(ph * 0.55, dialogueCount * 46 + 10);
      let dialogueSvg = "";
      if (dialogueCount > 0) {
        const bubbleTop = py + ph - bubbleAreaHeight - 6;
        let cursorY = bubbleTop;
        dialogueSvg = (panel.dialogue || [])
          .map((line) => {
            const lines = wrapText(`${line.speaker}: ${line.text}`, Math.max(12, Math.floor(pw / 11)));
            const bubbleHeight = 12 + lines.length * 15;
            const bubbleY = cursorY;
            cursorY += bubbleHeight + 6;
            const bubbleW = pw - 12;
            return `
              <rect x="${px + 6}" y="${bubbleY}" width="${bubbleW}" height="${bubbleHeight}" rx="10" ry="10"
                fill="#fff" stroke="#111" stroke-width="1.5" />
              ${textLinesSvg(
                lines,
                px + 14,
                bubbleY + 15,
                15,
                'font-size="12.5" fill="#111" font-family="sans-serif"'
              )}
            `;
          })
          .join("");
      }

      return `
        <g>
          ${artSvg}
          ${captionSvg}
          ${sfxSvg}
          ${dialogueSvg}
          <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#000" stroke-width="3" />
        </g>
      `;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    ${panelsSvg}
  </svg>`;
}

module.exports = { pageToSvg };
