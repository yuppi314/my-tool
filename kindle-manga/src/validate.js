'use strict';
// KDP入稿前のプリフライト検査。
// 「アップロードしてから弾かれる」「変換後に画質が落ちる」を事前に潰すのが目的。
const fs = require('fs');
const { imageSize } = require('./imagesize');

// KDPの制限・推奨値(2026年時点の公開ガイドラインに基づく既定値)
const LIMITS = {
  coverMinLongSide: 1000,
  coverIdeal: { width: 1600, height: 2560 },
  coverRatio: 1.6, // 高さ ÷ 幅
  coverRatioTolerance: 0.05,
  coverMaxBytes: 50 * 1024 * 1024,
  pageMinWidth: 1200,
  pageRecommendedWidth: 1600,
  pageMaxBytes: 5 * 1024 * 1024,
  pageMaxPixels: 10 * 1000 * 1000,
  totalMaxBytes: 650 * 1024 * 1024,
  descriptionMax: 4000,
  descriptionMin: 60,
  titleMax: 200,
  keywordSlots: 7,
  keywordMaxLength: 50,
  aspectTolerance: 0.02,
};

// KDPがキーワード欄で禁止している表現(一部でも入っていると審査で落ちやすい)
const BANNED_KEYWORD_PATTERNS = [
  /無料/,
  /ベストセラー/,
  /新刊/,
  /ランキング\s*1位/,
  /\bfree\b/i,
  /\bbestseller\b/i,
  /\bnew\s*release\b/i,
  /\bkindle\s*unlimited\b/i,
];

function issue(level, message, hint) {
  return { level, message, hint: hint || '' };
}

function checkCover(book, issues) {
  if (!book.coverPath || !fs.existsSync(book.coverPath)) {
    issues.push(
      issue(
        'error',
        `表紙画像が見つかりません: ${book.cover || '(未設定)'}`,
        'KDPは表紙の別途アップロードが必須です。1600x2560のJPEGを用意して book.json の cover に指定してください。'
      )
    );
    return;
  }
  const bytes = fs.statSync(book.coverPath).size;
  const size = imageSize(fs.readFileSync(book.coverPath));
  if (!size) {
    issues.push(issue('error', `表紙画像を解析できません: ${book.cover}`, 'JPEGまたはPNGで保存し直してください。'));
    return;
  }
  if (size.format !== 'jpeg') {
    issues.push(
      issue('warn', `表紙が${size.format.toUpperCase()}です。`, 'KDPの推奨はJPEG(またはTIFF)です。')
    );
  }
  const longSide = Math.max(size.width, size.height);
  if (longSide < LIMITS.coverMinLongSide) {
    issues.push(
      issue('error', `表紙の長辺が${longSide}pxしかありません。`, `KDPの最低要件は${LIMITS.coverMinLongSide}pxです。`)
    );
  } else if (size.width < LIMITS.coverIdeal.width) {
    issues.push(
      issue(
        'warn',
        `表紙が${size.width}x${size.height}pxです。`,
        `推奨は${LIMITS.coverIdeal.width}x${LIMITS.coverIdeal.height}pxです。`
      )
    );
  }
  const ratio = size.height / size.width;
  if (Math.abs(ratio - LIMITS.coverRatio) > LIMITS.coverRatioTolerance) {
    issues.push(
      issue(
        'warn',
        `表紙の縦横比が1:${ratio.toFixed(2)}です。`,
        'KDP推奨は1:1.6(高さ÷幅=1.6)。ストア一覧で余白が入ったり切れたりします。'
      )
    );
  }
  if (bytes > LIMITS.coverMaxBytes) {
    issues.push(issue('error', `表紙が${(bytes / 1024 / 1024).toFixed(1)}MBあります。`, '50MB未満にしてください。'));
  }
}

function checkPages(book, pages, issues) {
  if (!pages.length) {
    issues.push(
      issue('error', `${book.pagesDir}/ にページ画像がありません。`, 'JPEGかPNGを連番(001.jpg, 002.jpg...)で入れてください。')
    );
    return;
  }

  let total = 0;
  const ratios = [];
  for (const p of pages) {
    total += p.bytes;
    if (p.unreadable) {
      issues.push(issue('error', `${p.name}: 画像として読めません。`, '破損しているか未対応形式です。'));
      continue;
    }
    if (p.format === 'webp') {
      issues.push(issue('error', `${p.name}: WebPはKindleで未対応です。`, 'JPEGまたはPNGに変換してください。'));
    }
    if (p.format === 'gif') {
      issues.push(issue('warn', `${p.name}: GIFは色数が少なく漫画には不向きです。`, 'JPEG(写実的)かPNG(線画)を推奨します。'));
    }
    if (p.width < LIMITS.pageMinWidth) {
      issues.push(
        issue('error', `${p.name}: 幅${p.width}px。`, `固定レイアウト漫画の最低幅は${LIMITS.pageMinWidth}pxです。`)
      );
    } else if (p.width < LIMITS.pageRecommendedWidth) {
      issues.push(
        issue('warn', `${p.name}: 幅${p.width}px。`, `推奨幅は${LIMITS.pageRecommendedWidth}px以上です。`)
      );
    }
    if (p.bytes > LIMITS.pageMaxBytes) {
      issues.push(
        issue(
          'warn',
          `${p.name}: ${(p.bytes / 1024 / 1024).toFixed(1)}MB。`,
          'KDPの変換で再圧縮され画質が落ちる場合があります。1枚5MB未満を推奨。'
        )
      );
    }
    if (p.width * p.height > LIMITS.pageMaxPixels) {
      issues.push(
        issue('warn', `${p.name}: ${p.width}x${p.height}(約${Math.round((p.width * p.height) / 1e6)}メガピクセル)。`, '大きすぎるとKDPの変換で縮小されます。')
      );
    }
    if (p.progressive) {
      issues.push(issue('warn', `${p.name}: プログレッシブJPEGです。`, 'ベースラインJPEGでの保存を推奨します。'));
    }
    if (p.landscape) {
      issues.push(
        issue(
          'warn',
          `${p.name}: 横長画像です。`,
          '見開き原稿ならKindleでは小さく表示されます。2ページに分割するか、そのままなら意図通りか確認してください。'
        )
      );
    }
    if (p.width && p.height) ratios.push(p.height / p.width);
  }

  if (ratios.length > 1) {
    const base = ratios[0];
    const inconsistent = ratios.filter((r) => Math.abs(r - base) / base > LIMITS.aspectTolerance).length;
    if (inconsistent) {
      issues.push(
        issue(
          'warn',
          `ページの縦横比が${inconsistent}枚ばらついています。`,
          '固定レイアウトでは比率が揃っていないとページごとに余白量が変わります。'
        )
      );
    }
  }

  if (total > LIMITS.totalMaxBytes) {
    issues.push(
      issue('error', `画像の合計が${(total / 1024 / 1024).toFixed(0)}MBあります。`, 'KDPのアップロード上限は650MBです。')
    );
  }

  if (pages.length % 2 !== 0) {
    issues.push(
      issue('info', `ページ数が${pages.length}枚(奇数)です。`, '見開き表示での左右がずれます。気になる場合は白ページを追加してください。')
    );
  }
}

function checkMetadata(book, issues) {
  if (!book.title) issues.push(issue('error', 'title が空です。', 'book.json に作品タイトルを入れてください。'));
  if (book.title && book.title.length > LIMITS.titleMax) {
    issues.push(issue('error', `title が${book.title.length}文字です。`, `KDPの上限は${LIMITS.titleMax}文字です。`));
  }
  if (!book.author) issues.push(issue('error', 'author が空です。', '著者名(ペンネーム)を入れてください。'));
  if (!book.description) {
    issues.push(issue('error', 'description が空です。', '商品ページの紹介文です。読者が買うかを決める最重要項目です。'));
  } else {
    if (book.description.length > LIMITS.descriptionMax) {
      issues.push(
        issue('error', `description が${book.description.length}文字です。`, `KDPの上限は${LIMITS.descriptionMax}文字です。`)
      );
    }
    if (book.description.length < LIMITS.descriptionMin) {
      issues.push(
        issue('warn', `description が${book.description.length}文字と短いです。`, '300〜800文字程度が最も転換率が高い傾向です。')
      );
    }
  }

  const keywords = book.keywords || [];
  if (keywords.length === 0) {
    issues.push(issue('warn', 'keywords が未設定です。', `KDPは${LIMITS.keywordSlots}枠まで登録でき、検索流入に直結します。`));
  }
  if (keywords.length > LIMITS.keywordSlots) {
    issues.push(
      issue('error', `keywords が${keywords.length}個あります。`, `KDPの枠は${LIMITS.keywordSlots}個までです。`)
    );
  }
  for (const kw of keywords) {
    if (kw.length > LIMITS.keywordMaxLength) {
      issues.push(issue('error', `キーワード「${kw}」が${kw.length}文字です。`, `1枠${LIMITS.keywordMaxLength}文字までです。`));
    }
    for (const re of BANNED_KEYWORD_PATTERNS) {
      if (re.test(kw)) {
        issues.push(issue('error', `キーワード「${kw}」はKDPの禁止表現を含みます。`, '価格・順位・販促表現はキーワードに使えません。'));
        break;
      }
    }
    if (book.title && book.title.includes(kw)) {
      issues.push(
        issue('warn', `キーワード「${kw}」はタイトルに含まれています。`, 'タイトル/著者名は自動で検索対象になるため、7枠が1つ無駄になります。')
      );
    }
  }

  if (!book.categories || book.categories.length === 0) {
    issues.push(issue('warn', 'categories が未設定です。', 'KDPでは最大3カテゴリー選べます。ニッチなカテゴリーほど上位表示しやすいです。'));
  }

  const price = (book.price && book.price.jpy) || 0;
  const royalty = (book.price && book.price.royalty) || 70;
  if (royalty === 70 && (price < 250 || price > 1250)) {
    issues.push(
      issue('error', `70%ロイヤリティなのに価格が¥${price}です。`, '70%を選ぶには¥250〜¥1,250の範囲が必要です。範囲外なら自動で35%になります。')
    );
  }
  if (royalty === 35 && price < 99) {
    issues.push(issue('error', `価格が¥${price}です。`, '35%ロイヤリティの下限は¥99です。'));
  }
}

/**
 * @returns {{issues:Array, errors:number, warnings:number, ok:boolean}}
 */
function run(book, pages) {
  const issues = [];
  checkMetadata(book, issues);
  checkCover(book, issues);
  checkPages(book, pages, issues);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warn').length;
  return { issues, errors, warnings, ok: errors === 0 };
}

module.exports = { run, LIMITS, BANNED_KEYWORD_PATTERNS };
