# 1ヶ月-3kgダイエットナビ

身長・体重・年齢・性別・活動レベルから「基礎代謝(BMR)」「消費カロリー(TDEE)」
「1ヶ月で健康的に-3kgを目指すための1日の目標摂取カロリー・PFCバランス」を算出し、
無料の簡易診断 → 有料の4週間ダイエットプログラムへ誘導するフリーミアム型のマネタイズツールです。

## マネタイズの仕組み

1. **無料診断でリード獲得**: 身長・体重・年齢・性別・活動レベル・目標体重・メールアドレスを入力すると即座に
   BMR/TDEE/目標カロリー/PFCバランスを表示。入力されたメールは `leads` テーブルに保存され、
   後日のメルマガ・re-marketing施策に使えます。
2. **4週間ダイエットプログラム販売(単発課金)**: 週ごとのカロリー・PFC配分、運動プラン、停滞期対策をまとめた
   詳細プランを、Stripe Checkout経由で1回¥980(`PLAN_PRICE_JPY`で変更可)で販売します。
3. **広告枠プレースホルダー**: 無料結果画面・詳細プラン画面に広告枠(`<div class="ad-slot">`)を設置済み。
   Google AdSenseやアフィリエイトタグを差し込むだけで広告収益化も可能です。
4. **簡易管理画面 `/admin.html`**: リード数・診断数・購入数・売上・コンバージョン率をトークン認証付きで確認できます(`ADMIN_TOKEN`で保護)。

## セットアップ

```bash
npm install
cp .env.example .env
npm start
```

`http://localhost:3000` にアクセスすると診断フォームが表示されます。

### Stripe決済について

`.env` に `STRIPE_SECRET_KEY` を設定しない場合、決済は**開発用モックモード**で動作し、
「詳細プランを見る」ボタンを押すと即座に購入済み扱いになります(デモ・開発に便利)。

本番で実際に課金する場合は以下を設定してください。

```
STRIPE_SECRET_KEY=sk_live_xxx (またはテスト用 sk_test_xxx)
STRIPE_WEBHOOK_SECRET=whsec_xxx
BASE_URL=https://your-domain.example.com
```

Stripeダッシュボードで Webhook エンドポイント `POST /webhook/stripe` を登録し、
`checkout.session.completed` イベントを購読してください。

## ディレクトリ構成

```
src/
  server.js          Expressサーバー起動・ルーティング登録
  db.js              SQLite初期化(leads / diagnoses / orders)
  lib/
    calorie.js        BMR(基礎代謝)・TDEE(消費カロリー)・目標カロリー・安全判定の算出
    macro.js           PFC(タンパク質・脂質・炭水化物)バランスの算出
    plan.js             無料診断結果・4週間詳細プランの文言合成
  routes/
    diagnosis.js       無料診断・4週間詳細プランAPI
    payment.js          Stripe Checkout・Webhook
    admin.js             管理統計API
public/
  index.html / result.html / admin.html  フロントエンド(素のHTML/CSS/JS)
```

## 計算ロジックについて

- **BMR(基礎代謝)**: ミフリン・セントジョール式で算出する、広く知られた一般的な計算式です。
- **TDEE(1日の消費カロリー)**: BMRに活動レベル係数(1.2〜1.9の5段階)を掛けて算出します。
- **目標摂取カロリー**: 体脂肪1kg ≒ 7,700kcalの一般的な換算値をもとに、
  「目標減量kg × 7,700kcal ÷ 期間日数」で1日あたりに必要なカロリー赤字を算出し、TDEEから差し引きます。
  性別ごとの下限カロリー(男性1,500kcal/女性1,200kcal/その他1,350kcal)を下回らないようガードし、
  目標が体重の5%/月を超える場合は「安全度」を警告表示します。
- **PFCバランス**: タンパク質は体重×1.6g、脂質は目標カロリーの22.5%、残りを炭水化物として按分します。

いずれも特定の医療的助言ではなく、公開されている一般的な栄養学の計算方式を実装しています。
監修者(管理栄養士等)独自の知見を反映させたい場合は、`src/lib/` 内のロジック・テキストを差し替えてください。

## 法的な注意事項

`public/index.html` 等に「医師・管理栄養士による診断・指導に代わるものではない」旨の免責表記を入れています。
`public/tokushoho.html`(特定商取引法に基づく表記)・`public/terms.html`(利用規約)・`public/privacy.html`(プライバシーポリシー)の
テンプレートを用意していますが、`[事業者名を記入してください]` 等のプレースホルダー箇所は
実際の事業者情報に置き換えてから公開してください。プレースホルダーのまま公開すると法令違反になります。

## デプロイ

### 無料で最短公開する(カード登録不要・初めての方向け)

決済(Stripe)の設定をしなくても、無料診断部分は今すぐ公開できます。以下の手順で進めてください。

1. [Render.com](https://render.com) にアクセスし、GitHubアカウントで無料サインアップ(クレジットカード登録は不要です)。
2. ダッシュボードで「New +」→「Blueprint」を選び、`yuppi314/my-tool` リポジトリを選択します。
3. リポジトリ内の `render.yaml` を自動で読み込み、無料プランのWeb Serviceが作成されます。
4. `BASE_URL` の入力を求められたら、Renderが発行するURL(例: `https://diet-1month-3kg.onrender.com`)を入力します(一度作成してURLが確定してから設定し直しても構いません)。
5. `ADMIN_TOKEN` は好きな文字列(他人に推測されにくいもの)を入力してください。
6. 数分待つとURLが発行され、誰でもアクセスして無料診断が使えるようになります。

> 注意: 無料プランは永続ディスクが使えないため、Renderが再起動するとリード・診断データはリセットされます。
> 「ユーザーが増えてきたので有料プランにしたい」というタイミングで、`runtime: docker` + 永続ディスク構成に切り替えてください(下記「本格運用する場合」参照)。

決済(4週間ダイエットプログラム販売)は `STRIPE_SECRET_KEY` を設定するまでモックモードのままなので、
このステップでは何も設定しなくて大丈夫です。準備ができたら教えてください、Stripe連携を一緒に進めます。

### 本格運用する場合(Docker + 永続ディスク)

ユーザー数が増え、リードや購入データを失いたくない段階になったら、Docker + 永続ディスクの構成に切り替えます。

`Dockerfile` を用意しているため、Docker対応のホスティング(Render / Railway / Fly.io など)にそのままデプロイできます。
SQLiteでデータを永続化するため、コンテナの `/app/data` に永続ディスク(ボリューム)をマウントしてください。

Renderの場合は `render.yaml` の `runtime` を `docker` に、`plan` を `starter` 以上に変更し、
`disk` セクション(`mountPath: /app/data`)を追加してください。`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` も
このタイミングで環境変数に設定します。

手動でDockerを動かす場合:

```bash
docker build -t diet-1month-3kg .
docker run -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env diet-1month-3kg
```
