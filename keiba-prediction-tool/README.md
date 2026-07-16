# 予想びより(競馬予想ツール)

中央競馬(JRA)のレースを対象にした競馬予想ツールです。詳しい要件は
[docs/requirements.md](docs/requirements.md) を参照してください。

現在は実データではなく、`src/data/sample-races.json` の手入力サンプルデータ(出走馬の
着順・スピード指数などの基礎データ)で動作確認をしている段階です(要件書 5-2参照)。
予想印(◎○▲△)・買い方別おすすめは、そのサンプルデータから `src/lib/scoring.js` の
ルールベース点数計算でリクエストのたびに算出しています(要件書 4参照。手入力ではありません)。

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
    scoring.js          予想家ごとの点数計算(◎○▲△・買い方別おすすめの算出)
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

## マネタイズについて

決済機能は作らず、**完全無料+広告枠(プレースホルダー)**で公開する方針です。
理由は要件書10-1を参照してください。`public/races.html`・`race.html`・`results.html` に
`.ad-slot` を用意しているので、実際に広告を出すタイミングでタグを差し込んでください。

## デプロイ

サンプルデータ(JSON)のみで動作するため、永続ディスクなしでもそのまま公開できます。

### 無料で最短公開する(カード登録不要)

このリポジトリには既存の別ツール(ルート直下)も同居しているため、Renderの
「Blueprint」機能(render.yamlの自動検出)はリポジトリ直下のrender.yamlしか
見てくれません。このツールを公開する場合は、手動で以下のように設定してください。

1. [Render.com](https://render.com) にGitHubアカウントで無料サインアップ
2. ダッシュボードで「New +」→「Web Service」を選び、このリポジトリを選択
3. 以下を設定します(`keiba-prediction-tool/render.yaml` の内容と同じです)
   - **Root Directory**: `keiba-prediction-tool`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. 数分待つとURLが発行されます

### Docker で動かす場合

```bash
docker build -t yosou-biyori .
docker run -p 3000:3000 yosou-biyori
```
