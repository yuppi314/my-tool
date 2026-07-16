# 予想びより(競馬予想ツール)

中央競馬(JRA)のレースを対象にした競馬予想ツールです。詳しい要件は
[docs/requirements.md](docs/requirements.md) を参照してください。

現在は実データではなく、`src/data/sample-races.json` の手入力サンプルデータで
画面表示と予想ロジックの動作確認をしている段階です(要件書 5-2参照)。

## セットアップ

```bash
npm install
npm start
```

`http://localhost:3000` にアクセスするとトップページが表示されます。

## ディレクトリ構成

```
src/
  server.js          Expressサーバー起動
  data/
    sample-races.json  レース・出走馬・予想家の手入力サンプルデータ
    tipsters.json       予想家キャラクターのプロフィール
  lib/
    raceStore.js       サンプルデータの検索・絞り込み
  routes/
    races.js           レース一覧・詳細・予想家・条件一覧のAPI
public/
  index.html          トップページ(開催日・中央/地方・競馬場・レース番号を選ぶ)
  races.html          レース一覧ページ
  race.html           レース詳細ページ(出走馬・予想家3人の意見・買い方別おすすめ)
  results.html        予想の成績ページ(買い方別・予想家別・競馬場別の的中率など)
  js/                 各ページのフロントエンドロジック(素のJavaScript)
  css/style.css        共通スタイル
```

## 予想家キャラクターについて

「データ丸」「血統じい」「直感マキ」はすべてオリジナルの創作キャラクターです。
実在の解説者やタレントをモデルにしたものではありません。
