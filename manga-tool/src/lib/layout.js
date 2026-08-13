/**
 * コマ数に応じたページレイアウト(各コマの矩形)を計算する。
 * 西欧式(左上から右下へ)の読み順を採用。座標・サイズは0〜1の相対値。
 */
function computeLayout(panelCount) {
  const gap = 0.02;

  const rows = (splits) => {
    const rects = [];
    let y = 0;
    for (const row of splits) {
      const rowHeight = row.height;
      let x = 0;
      for (const cellWidth of row.cells) {
        rects.push({ x: x + gap / 2, y: y + gap / 2, width: cellWidth - gap, height: rowHeight - gap });
        x += cellWidth;
      }
      y += rowHeight;
    }
    return rects;
  };

  switch (panelCount) {
    case 0:
      return [];
    case 1:
      return rows([{ height: 1, cells: [1] }]);
    case 2:
      return rows([
        { height: 0.5, cells: [1] },
        { height: 0.5, cells: [1] },
      ]);
    case 3:
      return rows([
        { height: 0.45, cells: [1] },
        { height: 0.55, cells: [0.5, 0.5] },
      ]);
    case 4:
      return rows([
        { height: 0.5, cells: [0.5, 0.5] },
        { height: 0.5, cells: [0.5, 0.5] },
      ]);
    case 5:
      return rows([
        { height: 0.34, cells: [0.5, 0.5] },
        { height: 0.33, cells: [0.5, 0.5] },
        { height: 0.33, cells: [1] },
      ]);
    case 6:
      return rows([
        { height: 1 / 3, cells: [0.5, 0.5] },
        { height: 1 / 3, cells: [0.5, 0.5] },
        { height: 1 / 3, cells: [0.5, 0.5] },
      ]);
    default: {
      // 7コマ以上: 均等グリッドにフォールバック
      const cols = Math.ceil(Math.sqrt(panelCount));
      const rowsCount = Math.ceil(panelCount / cols);
      const layout = [];
      let remaining = panelCount;
      for (let r = 0; r < rowsCount; r++) {
        const cellsInRow = Math.min(cols, remaining);
        const cellWidth = 1 / cellsInRow;
        for (let c = 0; c < cellsInRow; c++) {
          layout.push({
            x: c * cellWidth + gap / 2,
            y: (r / rowsCount) + gap / 2,
            width: cellWidth - gap,
            height: 1 / rowsCount - gap,
          });
        }
        remaining -= cellsInRow;
      }
      return layout;
    }
  }
}

module.exports = { computeLayout };
