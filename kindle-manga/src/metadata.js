'use strict';
// KDPの登録フォームにそのまま貼れるシートを生成する。
// KDPには公開APIが無いため、最後の入力だけは人間が行う。その所要時間を最小化するのが狙い。
const fs = require('fs');
const path = require('path');

function moneyRow(book) {
  const price = (book.price && book.price.jpy) || 0;
  const royalty = (book.price && book.price.royalty) || 70;
  const perSale = Math.floor(price * (royalty / 100));
  return { price, royalty, perSale };
}

/** KDPの紹介文欄で使える限定的なHTMLに整形する(使えるのは h4/b/i/u/ul/ol/li/br/p のみ)。 */
function descriptionHtml(description) {
  const paragraphs = String(description || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
}

function sheet(book, pages, buildResult) {
  const { price, royalty, perSale } = moneyRow(book);
  const keywords = book.keywords || [];
  const slots = Array.from({ length: 7 }, (_, i) => keywords[i] || '(空き)');
  const cats = book.categories || [];

  const lines = [];
  lines.push(`# KDP 登録シート — ${book.title || '(タイトル未設定)'}`);
  lines.push('');
  lines.push('KDPの「本の詳細」画面に、上から順にそのまま貼り付けてください。');
  lines.push('');
  lines.push('## 1. 本の詳細');
  lines.push('');
  lines.push('| 項目 | 入力内容 |');
  lines.push('| --- | --- |');
  lines.push(`| 言語 | ${book.language === 'ja' ? '日本語' : book.language} |`);
  lines.push(`| 本のタイトル | ${book.title} |`);
  lines.push(`| サブタイトル | ${book.subtitle || '(なし)'} |`);
  lines.push(`| タイトルのヨミガナ | ${book.titleReading || '(未設定 — 日本語書籍では必須)'} |`);
  lines.push(`| タイトルのローマ字 | ${book.titleRomaji || '(未設定)'} |`);
  lines.push(`| シリーズ | ${book.series && book.series.name ? `${book.series.name} 第${book.series.index || 1}巻` : '(なし)'} |`);
  lines.push(`| 著者 | ${book.author} |`);
  lines.push(`| 著者のヨミガナ | ${book.authorReading || '(未設定 — 日本語書籍では必須)'} |`);
  lines.push(`| 著者のローマ字 | ${book.authorRomaji || '(未設定)'} |`);
  lines.push(`| 出版社 | ${book.publisher || '(なし)'} |`);
  lines.push(`| 出版社のローマ字 | ${book.publisherRomaji || '(なし)'} |`);
  lines.push(`| 出版に関する権利 | 私は著作権者であり、出版に必要な権利を保有しています |`);
  lines.push(`| 成人向けコンテンツ | いいえ |`);
  lines.push('');
  lines.push('> ローマ字はKDPの本の登録画面には欄がありません。海外ストアでの表示、');
  lines.push('> 著者ページ、問い合わせ時の表記を揺らさないために決めて控えておく値です。');
  lines.push('> シリーズ2冊目以降も必ず同じ綴りを使ってください。');
  lines.push('');
  lines.push('### 内容紹介(コピペ用・HTML)');
  lines.push('');
  lines.push('```html');
  lines.push(descriptionHtml(book.description));
  lines.push('```');
  lines.push('');
  lines.push(`文字数: ${(book.description || '').length} / 4000`);
  lines.push('');
  lines.push('### キーワード(7枠)');
  lines.push('');
  slots.forEach((kw, i) => lines.push(`${i + 1}. ${kw}`));
  lines.push('');
  lines.push('### カテゴリー(最大3件)');
  lines.push('');
  if (cats.length) cats.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  else lines.push('(未設定)');
  lines.push('');
  lines.push('## 2. コンテンツ');
  lines.push('');
  lines.push('| 項目 | 入力内容 |');
  lines.push('| --- | --- |');
  lines.push(`| 原稿ファイル | ${buildResult ? path.basename(buildResult.file) : '(未ビルド)'} |`);
  lines.push(`| 表紙ファイル | ${book.cover || '(未設定)'} |`);
  lines.push(`| ページ数 | ${pages.length}ページ${buildResult ? `(表紙込み ${buildResult.pageCount})` : ''} |`);
  lines.push(`| 読み方向 | ${book.direction === 'ltr' ? '左から右' : '右から左(日本の漫画)'} |`);
  lines.push('| DRM | 有効にする(推奨) |');
  lines.push('| 出版地域 | すべての地域(全世界) |');
  lines.push('');
  lines.push('## 3. 価格設定');
  lines.push('');
  lines.push('| 項目 | 入力内容 |');
  lines.push('| --- | --- |');
  lines.push('| KDPセレクト | 登録する(Kindle Unlimited読み放題の対象になる) |');
  lines.push(`| ロイヤリティプラン | ${royalty}% |`);
  lines.push(`| 価格(日本) | ¥${price.toLocaleString()} |`);
  lines.push(`| 1冊あたり手取り(目安) | 約¥${perSale.toLocaleString()} |`);
  lines.push('');
  lines.push('> 漫画は固定レイアウトのため、Kindle Unlimitedの既読ページ(KENP)単価は');
  lines.push('> 文字ものより不利になりがちです。単価重視なら¥250〜¥500で70%を狙うのが定石です。');
  lines.push('');
  return lines.join('\n') + '\n';
}

function checklist(book, pages, buildResult, validation) {
  const lines = [];
  lines.push(`# 出版チェックリスト — ${book.title || '(タイトル未設定)'}`);
  lines.push('');
  lines.push(`生成日時: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 自動チェック結果');
  lines.push('');
  if (!validation.issues.length) {
    lines.push('- 指摘なし。そのままアップロードできます。');
    lines.push('');
  } else {
    const label = { error: '❌ 要修正', warn: '⚠️ 推奨', info: 'ℹ️ 参考' };
    for (const level of ['error', 'warn', 'info']) {
      const items = validation.issues.filter((i) => i.level === level);
      if (!items.length) continue;
      lines.push(`### ${label[level]} (${items.length}件)`);
      lines.push('');
      for (const it of items) lines.push(`- ${it.message}${it.hint ? ` → ${it.hint}` : ''}`);
      lines.push('');
    }
  }
  lines.push('## 初回だけ必要なアカウント設定(すべて半角アルファベット)');
  lines.push('');
  lines.push('KDPの支払いは海外送金の仕組みに乗るため、次の3つは日本語では登録できません。');
  lines.push('氏名は3つとも同じ綴りにします。1文字でも違うと入金が止まります。');
  lines.push('');
  lines.push('1. 著者/出版社情報 — 本名・住所・電話番号をローマ字と半角数字で');
  lines.push('   (ペンネームはここでは使いません。本の登録画面の著者欄だけで使います)');
  lines.push('2. 税に関する情報(米国の税務インタビュー) — 氏名・住所をローマ字で。');
  lines.push('   「納税者番号」にはマイナンバー(個人番号)を入れます。これで日米租税条約が適用され、');
  lines.push('   米国での源泉徴収が30%から0%になります。入れ忘れると売上の3割が引かれます');
  lines.push('3. 銀行口座 — 口座名義は通帳の英字表記(半角カタカナではなくローマ字)。');
  lines.push('   ゆうちょ銀行は記号番号ではなく、振込用の店名・預金種目・口座番号に読み替えが必要です');
  lines.push('');
  lines.push('この3つが終わるまで「出版」ボタンは押せません。初回だけ30分ほどかかります。');
  lines.push('');
  lines.push('## 手動での最終手順(KDPには公開APIが無いためここだけ人力)');
  lines.push('');
  lines.push('1. Kindle Previewer 3 で生成EPUBを開き、右開き・ページ順・文字の可読性を確認する');
  lines.push('   (特にスマホ表示でセリフが読めるか。漫画で最も多い低評価要因です)');
  lines.push('2. https://kdp.amazon.co.jp/ →「+ 電子書籍または有料マンガ」');
  lines.push('3. 生成された `kdp-metadata.md` を上から順にコピペ');
  lines.push(`4. 原稿として ${buildResult ? path.basename(buildResult.file) : '(未ビルド)'} をアップロード`);
  lines.push(`5. 表紙として ${book.cover || '(未設定)'} をアップロード`);
  lines.push('6. オンラインプレビューアーで全ページ確認');
  lines.push('7. 価格設定 → 「Kindle本を出版」');
  lines.push('8. 審査は通常24〜72時間。公開後はKDPレポートで初動3日の動きを確認する');
  lines.push('');
  lines.push('## 出版後にやると効果が大きい順');
  lines.push('');
  lines.push('1. 公開直後にKDPセレクトの無料キャンペーン(5日)を回してランキングを作る');
  lines.push('2. A+コンテンツ(商品ページ下部)にキャラ紹介と作例を追加する');
  lines.push('3. 同シリーズの巻末に次巻リンクを入れて回遊させる');
  lines.push('4. SNSに1〜3ページ目を画像で投稿し、続きは商品ページへ誘導する');
  lines.push('');
  return lines.join('\n') + '\n';
}

function write(book, pages, buildResult, validation) {
  fs.mkdirSync(book.outPath, { recursive: true });
  const sheetFile = path.join(book.outPath, 'kdp-metadata.md');
  const jsonFile = path.join(book.outPath, 'kdp-metadata.json');
  const checkFile = path.join(book.outPath, 'publish-checklist.md');

  fs.writeFileSync(sheetFile, sheet(book, pages, buildResult), 'utf8');
  fs.writeFileSync(checkFile, checklist(book, pages, buildResult, validation), 'utf8');
  fs.writeFileSync(
    jsonFile,
    JSON.stringify(
      {
        title: book.title,
        subtitle: book.subtitle,
        titleReading: book.titleReading,
        titleRomaji: book.titleRomaji,
        author: book.author,
        authorReading: book.authorReading,
        authorRomaji: book.authorRomaji,
        publisher: book.publisher,
        publisherRomaji: book.publisherRomaji,
        language: book.language,
        series: book.series,
        description: book.description,
        descriptionHtml: descriptionHtml(book.description),
        keywords: book.keywords,
        categories: book.categories,
        readingDirection: book.direction,
        pageCount: pages.length,
        price: moneyRow(book),
        manuscript: buildResult ? path.basename(buildResult.file) : null,
        cover: book.cover,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { sheetFile, jsonFile, checkFile };
}

module.exports = { write, sheet, checklist, descriptionHtml };
