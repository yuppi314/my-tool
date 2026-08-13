# 旅行日程表アプリ

行き先・日数・飛行機や新幹線の到着/出発時刻を入力するだけで、日程表のたたき台を自動作成するツールです。
会員登録は不要で、誰でもすぐに使えます。

## 主な機能

- 行き先・日数・到着/出発の交通手段(飛行機/新幹線)と時刻を入力すると、日ごとの時間割(移動・自由時間・食事)を自動生成
- 到着が飛行機の場合、主要空港(羽田・成田・関西・中部・福岡・新千歳・那覇)からの代表的なアクセス手段(バス・鉄道)を目安として表示。それ以外の空港・路線は現時点では未対応です
- グルメ欄の「お店を探す」ボタンから、行き先周辺のお店をジャンル指定つきで検索・選択可能
- 自由時間欄の「定番観光地を探す」「穴場スポットを探す」ボタンから、観光地の候補を検索・選択可能

## セットアップ

```bash
cd 旅行日程表アプリ
npm install
cp .env.example .env
npm start
```

`http://localhost:3000` にアクセスするとフォームが表示されます。

### グルメ検索について

`.env` に `HOTPEPPER_API_KEY` を設定しない場合、グルメ検索は**サンプルデータ**で動作します(開発・デモ用)。

実際のお店を検索するには、[ホットペッパーグルメAPI](https://webservice.recruit.co.jp/doc/hotpepper/reference.html) に無料登録してAPIキーを取得し、以下を設定してください。

```
HOTPEPPER_API_KEY=xxxxxxxxxxxxxxxx
```

### 観光地検索について

`.env` に `GOOGLE_PLACES_API_KEY` を設定しない場合、観光地検索は**サンプルデータ**で動作します(開発・デモ用)。

実際のスポットを検索するには、[Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成し、
Places API を有効化してAPIキーを取得後、以下を設定してください(無料枠あり)。

```
GOOGLE_PLACES_API_KEY=xxxxxxxxxxxxxxxx
```

「穴場スポット」は、Google Places のデータのうち**評価は高いがレビュー数が少ない場所**(評価4.0以上・レビュー300件未満)を
目安として抽出したものです。実際に地元の人が推薦しているとは限らない点にご注意ください。

## ディレクトリ構成

```
src/
  server.js          Expressサーバー起動・ルーティング登録
  lib/
    itinerary.js      行き先・日数・交通手段から日程表を組み立てるロジック
  data/
    airportBuses.js   主要空港から都心部への代表的アクセス手段(参考情報)
  routes/
    itinerary.js      日程表生成API
    gourmet.js         グルメ検索API(ホットペッパーグルメAPI連携)
    spots.js           観光地検索API(Google Places API連携、定番/穴場)
public/
  index.html / css / js  フロントエンド(素のHTML/CSS/JS)
```

## 日程表の作り方について

- 空港からのアクセス情報は代表的な手段の目安であり、リアルタイムの時刻表ではありません。実際の移動には公式サイトでの確認をおすすめします
- 飛行機・新幹線の時刻はユーザーが入力した情報をそのまま使用します(自動検索機能はありません)

## デプロイ

[Render.com](https://render.com) にGitHubアカウントでサインアップし、「New +」→「Blueprint」から本リポジトリを選択すると、
`render.yaml`(`rootDir: 旅行日程表アプリ`)を読み込んで無料プランのWeb Serviceが作成されます。
`HOTPEPPER_API_KEY` は任意設定です(未設定でもサンプルデータで動作します)。

Docker で動かす場合:

```bash
docker build -t travel-itinerary-planner .
docker run -p 3000:3000 --env-file .env travel-itinerary-planner
```
