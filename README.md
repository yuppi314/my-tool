# 九星気学 × マヤ暦 診断ツール

生年月日から「九星気学の本命星」と「マヤ暦(ドリームスペル方式)のKIN・太陽の紋章・銀河の音」を算出し、
無料の簡易診断 → 有料の詳細鑑定レポートへ誘導するフリーミアム型のマネタイズツールです。

## マネタイズの仕組み

1. **無料診断でリード獲得**: 生年月日・メールアドレスを入力すると即座に簡易結果を表示。入力されたメールは `leads` テーブルに保存され、後日のメルマガ・re-marketing施策に使えます。
2. **詳細レポート販売(単発課金)**: 本命星×紋章の組み合わせから生成した「性格詳細」「今年の運気サイクル」「今月の運勢」「アドバイス」を、Stripe Checkout経由で1回¥980(`REPORT_PRICE_JPY`で変更可)で販売します。
3. **相性診断(購入者限定特典)**: 詳細レポート購入者だけが使える追加機能として、パートナーの生年月日を入れると五行相性スコアを算出します。アップセル・リピート利用の動機付けになります。
4. **広告枠プレースホルダー**: 無料結果画面・詳細レポート画面に広告枠(`<div class="ad-slot">`)を設置済み。Google AdSenseやアフィリエイトタグを差し込むだけで広告収益化も可能です。
5. **簡易管理画面 `/admin.html`**: リード数・診断数・購入数・売上・コンバージョン率をトークン認証付きで確認できます(`ADMIN_TOKEN`で保護)。

## セットアップ

```bash
npm install
cp .env.example .env
npm start
```

`http://localhost:3000` にアクセスすると診断フォームが表示されます。

### Stripe決済について

`.env` に `STRIPE_SECRET_KEY` を設定しない場合、決済は**開発用モックモード**で動作し、
「詳細レポートを見る」ボタンを押すと即座に購入済み扱いになります(デモ・開発に便利)。

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
    kyusei.js         九星気学(本命星・五行・9年サイクル運気)の算出
    mayan.js          マヤ暦(KIN・太陽の紋章・銀河の音)の算出
    content.js        本命星×紋章の組み合わせから診断文を合成
    compatibility.js  五行相性理論に基づく相性診断
  routes/
    diagnosis.js      無料診断・詳細レポートAPI
    payment.js        Stripe Checkout・Webhook
    compatibility.js  相性診断API(購入者限定)
    admin.js          管理統計API
public/
  index.html / result.html / admin.html  フロントエンド(素のHTML/CSS/JS)
```

## 計算ロジックについて

- **九星気学 本命星**: 立春(2/4)を年切り替えとし、生まれ年の西暦を1桁になるまで数字加算した値から `11 - n` (補正込み)で算出する、広く知られた一般的なアルゴリズムです。
- **マヤ暦 KIN**: 1900年1月1日 = KIN41 を起点とする、日本で広く使われている「ドリームスペル/13の月の暦」方式の一般公開アルゴリズムです。KINから太陽の紋章(20種)・銀河の音(13種)を導出します。

いずれも特定流派の非公開ロジックではなく、公開されている一般的な計算方式を実装しています。
監修者独自の鑑定内容や商用データベースを反映させたい場合は、`src/lib/` 内のテキスト・対応表を差し替えてください。

## 法的な注意事項

`public/index.html` 等に「娯楽目的である」旨の免責表記を入れています。
`public/tokushoho.html`(特定商取引法に基づく表記)・`public/terms.html`(利用規約)・`public/privacy.html`(プライバシーポリシー)の
テンプレートを用意していますが、`[事業者名を記入してください]` 等のプレースホルダー箇所は
実際の事業者情報に置き換えてから公開してください。プレースホルダーのまま公開すると法令違反になります。

## デプロイ

### 無料で最短公開する(カード登録不要・初めての方向け)

決済(Stripe)の設定をしなくても、無料診断部分は今すぐ公開できます。以下の手順で進めてください。

1. [Render.com](https://render.com) にアクセスし、GitHubアカウントで無料サインアップ(クレジットカード登録は不要です)。
2. ダッシュボードで「New +」→「Blueprint」を選び、`yuppi314/my-tool` リポジトリを選択します。
3. リポジトリ内の `render.yaml` を自動で読み込み、無料プランのWeb Serviceが作成されます。
4. `BASE_URL` の入力を求められたら、Renderが発行するURL(例: `https://kyusei-mayan-fortune.onrender.com`)を入力します(一度作成してURLが確定してから設定し直しても構いません)。
5. `ADMIN_TOKEN` は好きな文字列(他人に推測されにくいもの)を入力してください。
6. 数分待つとURLが発行され、誰でもアクセスして無料診断が使えるようになります。

> 注意: 無料プランは永続ディスクが使えないため、Renderが再起動するとリード・診断データはリセットされます。
> 「ユーザーが増えてきたので有料プランにしたい」というタイミングで、`runtime: docker` + 永続ディスク構成に切り替えてください(下記「本格運用する場合」参照)。

決済(詳細レポート販売)は `STRIPE_SECRET_KEY` を設定するまでモックモードのままなので、
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
docker build -t kyusei-mayan-fortune .
docker run -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env kyusei-mayan-fortune
```
