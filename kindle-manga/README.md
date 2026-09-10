# kindle-manga

漫画のページ画像を **Kindle(KDP)にそのままアップロードできる状態** まで自動で仕上げるCLIツールです。
生成AIで描いた「漫画でわかる〇〇」系の作品を、画像フォルダから固定レイアウトEPUB(右開き)まで一気に変換します。

## 最初に知っておくべき制約

**Amazon KDPには公開の出版APIがありません。** そのため「ボタン1つで出版完了」は原理的に不可能です。
ブラウザ自動操作(Selenium/Playwright)でKDP管理画面を叩く方法は技術的には可能ですが、

- Amazonの利用規約で自動アクセスが禁止されている(アカウント停止リスク)
- 2段階認証・CAPTCHA・画面改修で頻繁に壊れる

ため、このツールでは採用していません。代わりに **アップロード直前までの全工程を自動化** します。
実際に時間を食っていたのは「EPUB化」「仕様チェック」「メタデータ整備」なので、
残る手作業はKDP管理画面での約3分のコピペだけになります。

| 工程 | 自動化 |
| --- | --- |
| ページ画像の並べ替え・連番付け | ✅ |
| Kindle仕様への画像整形(サイズ統一・見開き分割・グレースケール) | ✅ (要 sharp) |
| 固定レイアウトEPUB生成(右開き・見開き・region magnification) | ✅ |
| KDP入稿前の仕様チェック(解像度・表紙比率・キーワード禁止語・価格帯) | ✅ |
| KDP登録項目のコピペシート生成 | ✅ |
| KDP管理画面へのアップロード | ❌ 手動(APIなし・規約) |

## インストール

依存パッケージはゼロです。Node.js 18以上があれば動きます。

```bash
cd kindle-manga
node bin/kindle-manga.js help

# グローバルに入れる場合
npm link
kindle-manga help
```

画像整形(`normalize`)だけは任意で `sharp` を使います。使わないなら入れなくて構いません。

```bash
npm install sharp
```

## 使い方

```bash
# 1. 作品フォルダの雛形を作る
kindle-manga init ./作品/漫画でわかる資産形成

# 2. pages/ に 001.jpg, 002.jpg ... を入れ、cover.jpg を置き、book.json を編集

# 3. 検査 → EPUB生成 → KDP登録シート を一括実行
kindle-manga publish ./作品/漫画でわかる資産形成
```

`dist/` に以下が出力されます。

- `<タイトル>.epub` — KDPにアップロードする原稿
- `kdp-metadata.md` — KDP登録画面へ上から順に貼るシート
- `kdp-metadata.json` — 他ツール連携用
- `publish-checklist.md` — 検査結果と出版手順・出版後の施策

### コマンド

| コマンド | 内容 |
| --- | --- |
| `init [dir]` | 作品フォルダの雛形(`book.json` / `pages/`)を作る |
| `check [dir]` | KDP入稿前のプリフライト検査だけ実行 |
| `normalize [dir]` | 画像をKindle仕様に一括整形(要 sharp) |
| `build [dir]` | 固定レイアウトEPUBを生成 |
| `metadata [dir]` | KDP登録シートを生成 |
| `publish [dir]` | check → build → metadata を通しで実行 |

### 画像整形(normalize)

生成AIで作った画像はサイズがバラバラ・PNGで巨大・見開きが1枚、になりがちです。

```bash
# 日本のコミックス比率(1488x2266)に統一
kindle-manga normalize ./作品/xxx --preset b6

# 横長の見開き画像を右開き順で2ページに分割し、グレースケール化して軽量化
kindle-manga normalize ./作品/xxx --split-spreads --grayscale
```

プリセット: `hd` (1600x2560) / `b6` (1488x2266) / `standard` (1200x1920) / `tall` (1440x2560, 9:16スマホ縦読み)

整形後は `book.json` の `pagesDir` を出力先(既定 `pages-normalized`)に変えてから `build` してください。

## book.json

```jsonc
{
  "title": "漫画でわかる資産形成",
  "titleReading": "マンガデワカルシサンケイセイ",  // 日本語書籍はヨミガナ必須
  "subtitle": "",
  "author": "ペンネーム",
  "authorReading": "ペンネーム",
  "description": "商品ページの紹介文。空行で段落が分かれ、KDP用のHTMLに自動変換されます。",
  "keywords": ["入門", "図解", "初心者"],        // 7枠まで
  "categories": ["コミック > 教養・実用"],        // 3件まで
  "series": { "name": "漫画でわかるシリーズ", "index": 1 },
  "direction": "rtl",                            // 日本の漫画は右開き
  "pagesDir": "pages",
  "cover": "cover.jpg",                          // 1600x2560 推奨
  "outDir": "dist",
  "layout": {
    "orientationLock": "portrait",
    "spread": "landscape",
    "regionMagnification": true,                 // コマ拡大(スマホで読みやすくなる)
    "background": "#000000"
  },
  "price": { "jpy": 500, "royalty": 70 },
  "publishedDate": "2026-01-01"
}
```

## 生成されるEPUBの中身

KDPの変換器が漫画として正しく扱うために、以下を明示的に埋め込みます。

- `rendition:layout = pre-paginated`(固定レイアウト。リフロー型だと漫画は崩れる)
- `spine page-progression-direction = rtl` と `primary-writing-mode = horizontal-rl`(右開き)
- `book-type = comic` / `zero-gutter` / `zero-margin` / `orientation-lock` / `RegionMagnification`
- 各ページの `viewport` にその画像の実寸を設定(ページごとにサイズが違っても崩れない)
- 見開き表示用の `page-spread-right` / `page-spread-left` を自動で交互付与
- EPUB仕様どおり `mimetype` を先頭・非圧縮で格納

## プリフライト検査が見るもの

| 対象 | 内容 |
| --- | --- |
| 表紙 | 存在・形式・長辺1000px以上・推奨1600x2560・比率1:1.6・50MB未満 |
| 本文画像 | 幅1200px以上(推奨1600px)・1枚5MB未満・縦横比の揃い・横長画像の混入・プログレッシブJPEG |
| 全体 | 合計650MB未満(KDPのアップロード上限)・ページ数の偶奇 |
| メタデータ | タイトル200字以内・紹介文4000字以内・キーワード7枠/50字・KDP禁止表現・タイトルとの重複 |
| 価格 | 70%ロイヤリティの¥250〜¥1,250条件、35%の下限¥99 |

エラーが1件でもあると `build` は中止されます(`--force` で強行可)。

## 開発

```bash
npm test   # node --test。EPUB構造・右開き・検査ロジックを検証
```

依存パッケージを増やさない方針です。ZIP書き出し・画像寸法読み取りは自前実装しています
(EPUBは `mimetype` を非圧縮で先頭に置く必要があり、汎用ZIPライブラリだと扱いにくいため)。
