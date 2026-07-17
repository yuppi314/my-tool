# Renderへのデプロイ手順(かんたん版)

競馬予想ツール(`keiba-prediction-tool`)を、Renderの無料プランで公開するための手順です。
自分のペースで、1つずつ進めてください。

---

## 準備

- Renderのアカウント(GitHubでログインすればOK・無料・カード登録不要)
- GitHubリポジトリ `yuppi314/my-tool` へのアクセス権

---

## 手順

### 1. Renderにログイン

1. ブラウザで `render.com` を開く
2. 右上の「Dashboard」または「Sign Up」から、GitHubアカウントでログイン

### 2. 新しいWeb Serviceを作る

1. ダッシュボード画面の右上「**+ New**」をクリック
2. メニューから「**Web Service**」を選ぶ(Blueprintではない)
3. リポジトリ一覧から `yuppi314/my-tool` を選んで「Connect」
   (すでに接続済みなら、そのまま設定画面に進みます)

### 3. 設定項目を入力する

設定画面で、以下の**5か所**を確認・修正してください。

| 項目 | 入力する値 | 注意点 |
| --- | --- | --- |
| **Name** | 好きな名前(例: `yosou-biyori`) | 何でもOK |
| **Language** | **Node** | Dockerが自動選択されていることがあるので、Nodeに変更する |
| **Branch** | **`claude/horse-racing-prediction-bau284`** | ⚠️ 一番重要。`main`のままだとツールが公開されません |
| **Root Directory** | **`keiba-prediction-tool`** | このリポジトリには他のツールも同居しているため必須 |
| **Build Command** | `npm install` | |
| **Start Command** | `npm start` | |

### 4. Instance Type(プラン)を「Free」にする

⚠️ **ここが一番つまずきやすいポイントです。**

画面を下にスクロールすると、料金プランを選ぶカードが並んでいます。

- 最初から「**Starter**」($7/month、紫色の枠)が選ばれてしまっていることが多いです
- 一番上の段にある「**Free**」($0/month)のカードを、直接クリックして選び直してください
- クリックすると、紫色の枠が「Starter」から「Free」に移動します。それを確認してください

もし「Free」を選ぶ前に「Add Card(カード登録)」の画面が出てしまったら、
**カードは入力せず「Cancel」を押して**、Instance Typeを見直してください。

### 5. デプロイする

1. 画面を一番下までスクロールし、「**Deploy Web Service**」をクリック
2. ビルドのログ(文字がたくさん流れる画面)が表示されます。数分待ちます
3. 「**Live**」という緑色の表示になれば完了です

### 6. URLを確認する

画面の上のほうに、`https://(つけた名前).onrender.com` のようなURLが表示されます。
それをクリックして、トップページ(「予想びより」)が表示されれば成功です。

---

## うまくいかないときは

- **料金プランやカード登録の画面が出た** → 手順4(Instance Type)が「Free」になっているか確認
- **ページが真っ白/エラーが出る** → Root Directoryが `keiba-prediction-tool` になっているか確認
- **公開されたページに何も表示されない** → Branchが `claude/horse-racing-prediction-bau284` になっているか確認(`main`だとこのツールが存在しません)
- どうしても分からない画面が出たら、その画面のスクリーンショットを保存しておいて、次にAIアシスタントに相談するときに見せてください
