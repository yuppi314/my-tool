// 本音診断のOGP画像(1200x630)を本音タイプごとに生成するビルドスクリプト。
//
// シェア時のリンクプレビューに出る画像で、生成結果は public/og/ にコミット済みです。
// タイプ名やキャッチコピー(src/lib/honne.js)を変更したときだけ再生成してください。
//
//   npm i -D playwright && node scripts/generate-og.js
//
// Playwright は再生成時にしか必要ないため、本番の依存関係には含めていません。
// 画像内に日本語を描画するため、実行環境に日本語フォントが入っている必要があります。

const fs = require('fs');
const path = require('path');
const honne = require('../src/lib/honne');

const OUT_DIR = path.join(__dirname, '..', 'public', 'og');
const WIDTH = 1200;
const HEIGHT = 630;

// 環境によっては Playwright 同梱のブラウザが無いため、明示パスを渡せるようにしておく
const EXECUTABLE_PATH = process.env.CHROMIUM_PATH || undefined;

// タイプ名は長さによって文字サイズを落とし、1行に収まる幅(本文幅1032px)を超えないようにする
function typeFontSize(typeName) {
  return Math.min(92, Math.floor(980 / typeName.length));
}

function template({ typeName, catchCopy }) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 84px 150px;
    font-family: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", "IPAPGothic", sans-serif;
    background: radial-gradient(ellipse at top, #1c1240, #120b26 70%);
    color: #f5f0ff;
  }
  .label {
    font-size: 30px; font-weight: 700; letter-spacing: 0.18em;
    color: #f2c14e; margin-bottom: 28px;
  }
  .label span { color: #c9c0e8; font-weight: 400; letter-spacing: 0.05em; margin-left: 18px; font-size: 25px; }
  .type {
    font-size: ${typeFontSize(typeName)}px; font-weight: 800; line-height: 1.25; white-space: nowrap;
    background: linear-gradient(90deg, #f2c14e, #ffe9b3);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .catch { font-size: 36px; line-height: 1.6; color: #f5f0ff; margin-top: 30px; }
  .foot {
    position: absolute; left: 84px; bottom: 56px;
    display: flex; align-items: center; gap: 22px;
  }
  .pill {
    background: linear-gradient(90deg, #f2c14e, #ffb454); color: #241503;
    font-size: 27px; font-weight: 700; padding: 14px 36px; border-radius: 999px;
  }
  .foot .note { font-size: 24px; color: #c9c0e8; }
  .rule { height: 5px; width: 132px; background: #f2c14e; border-radius: 999px; margin: 34px 0 0; }
</style></head><body>
  <div class="label">本音診断<span>あの人を本当はどう思っている？</span></div>
  <div class="type">${typeName}</div>
  <div class="rule"></div>
  <div class="catch">${catchCopy}</div>
  <div class="foot">
    <div class="pill">無料で診断する</div>
    <div class="note">12の質問・約2分</div>
  </div>
</body></html>`;
}

async function main() {
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch(EXECUTABLE_PATH ? { executablePath: EXECUTABLE_PATH } : {});
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  const targets = [
    // 診断前(トップページ)用の既定画像
    {
      file: 'honne-default.jpg',
      typeName: 'あの人への本音',
      catchCopy: '12の質問で、自分でも気づいていない本音を言葉にします。',
    },
    // タイプごとの画像(シェアされた結果のプレビューに使う)
    ...Object.values(honne.TYPES).map((t) => ({
      file: `honne-${t.id}.jpg`,
      typeName: t.name,
      catchCopy: t.catch,
    })),
  ];

  for (const target of targets) {
    await page.setContent(template(target), { waitUntil: 'load' });
    // PNGだと背景のグラデーションで1枚280KB前後になるため、JPEGで書き出す
    // (OGP画像はJPEGで全SNSが対応しており、文字の可読性も保てる品質にしている)
    await page.screenshot({ path: path.join(OUT_DIR, target.file), type: 'jpeg', quality: 92 });
    console.log('generated:', target.file, `(${target.typeName})`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
