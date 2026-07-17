# 02. 技術スタック選定(採用理由・代替案・メリット・デメリット)

> 関連: [要件定義 v0.3](../requirements.md) / [目次](./README.md)

## 変更履歴
| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版作成 |

---

## 選定方針

「開発速度より保守性・品質・使いやすさを優先する」という開発方針のもと、**枯れていて情報量が多く、AI各社のSDKがそのまま使える技術**を優先しました。目新しさより「一人(+AI支援)で保守し続けられるか」を判断基準にしています。

## 一覧

| カテゴリ | 採用技術 |
|---|---|
| アプリ基盤 | Electron |
| UI | React + TypeScript |
| ローカルDB | SQLite (better-sqlite3) |
| PDF生成 | Electron `webContents.printToPDF` |
| APIキー保管 | Electron `safeStorage`(OS Keychain/DPAPI) |
| AI SDK | 各社公式Node.js SDK(Anthropic / OpenAI / Google Generative AI) |
| ロギング | electron-log |
| パッケージング | electron-builder |
| テスト | Vitest(単体・統合) / Playwright(E2E、Electron対応) |

---

## 1. アプリケーション基盤: Electron

| | 内容 |
|---|---|
| **採用理由** | Windows/Mac双方に対応でき、Node.jsエコシステムでClaude/OpenAI/GeminiのSDKがそのまま使える。Chromiumを内蔵しているためPDF出力も標準機能で完結し、追加ライブラリへの依存が少ない。情報量が多く、詰まった時の解決策を見つけやすい(保守性) |
| **代替案1: Tauri**(Rust + WebView) | メリット: 軽量・省メモリ・攻撃対象領域が小さくセキュリティ面で有利。デメリット: バックエンドロジックをRustで書く必要があり、AI各社のNode/Python SDKがそのまま使えず、HTTPリクエストを手動実装する手間が増える → 開発速度・保守性の観点でMVPには不向きと判断 |
| **代替案2: .NET MAUI / WPF** | メリット: Windowsとの親和性が高い。デメリット: Mac対応が弱く、「Windows/Mac両対応」という要件に合わない |

## 2. UI: React + TypeScript

| | 内容 |
|---|---|
| **採用理由** | コンポーネント単位で画面を組み立てやすく、TypeScriptの型で「入力欄の型」「AIレスポンスの型」等を明確にでき保守性が上がる |
| **代替案: Vue** | 大きな機能差はないが、AI関連ライブラリや型定義のエコシステムはReactの情報量が多く、詰まった際の解決が容易なためReactを採用 |

## 3. ローカルDB: SQLite(better-sqlite3)

| | 内容 |
|---|---|
| **採用理由** | ファイル1つで完結しサーバー不要。同期APIでシンプルに扱え、トランザクション・インデックスなどRDBの機能を使える(見積書番号の重複防止等) |
| **代替案: lowdb(JSONファイル)** | メリット: 超軽量で実装が単純。デメリット: 検索・整合性チェックに弱く、将来の履歴検索機能拡張(将来機能)に対応しづらいため見送り |

## 4. PDF生成: Electron `webContents.printToPDF`

| | 内容 |
|---|---|
| **採用理由** | 追加ライブラリが不要(Electron内蔵のChromiumで完結)。レイアウトをHTML/CSSで組めるため、将来のテンプレート追加・デザイン変更が容易(保守性重視) |
| **代替案: pdfkit / puppeteer** | メリット: より細かい制御が可能。デメリット: pdfkitはレイアウトをコードで組む必要があり保守しにくい。puppeteerは別途Chromiumバイナリが必要になりElectron内蔵分と重複しアプリサイズが増える |

## 5. APIキー保管: Electron `safeStorage`

| | 内容 |
|---|---|
| **採用理由** | OS標準の暗号化機構(Windows: DPAPI、Mac: Keychain)をそのまま利用でき、自前で暗号化ロジックを実装する必要がない(実装ミスによる漏洩リスクを回避) |
| **代替案: 自前のcrypto実装** | 鍵管理を独自実装するとバグ・脆弱性のリスクが高く、セキュリティ要件を満たす保証が難しいため不採用 |

## 6. AI SDK

Claude(`@anthropic-ai/sdk`)、OpenAI(`openai`)、Gemini(`@google/generative-ai`)の各公式SDKを、[09. AI連携レイヤー設計](./09-ai-integration.md)で定義する共通インターフェースの背後に隠蔽して利用します。

## 7. ロギング: electron-log

| | 内容 |
|---|---|
| **採用理由** | ファイル出力・サイズベースのローテーション・レベル管理が標準機能として揃っており、自前実装が不要(開発速度・保守性優先) |
| **代替案: 自前実装(fsで直接書き込み)** | ローテーション等を自作するとバグの温床になりやすいため不採用 |

## 8. パッケージング: electron-builder

| | 内容 |
|---|---|
| **採用理由** | Windows/Mac双方のインストーラ生成、コード署名対応が揃っており実績が豊富 |
| **代替案: electron-forge** | 大きな差はないが、electron-builderの方が署名・自動更新まわりの情報が豊富なため採用 |

## 9. テスト: Vitest + Playwright

| | 内容 |
|---|---|
| **採用理由** | Vitestは高速で設定が簡単。Playwrightは公式にElectronアプリのE2Eテストをサポートしており、実際の画面操作をシナリオテストできる(成功条件=5分以内の検証に活用、詳細は[18](./18-test-design.md)) |
| **代替案: Jest + Spectron** | Spectronは開発終了(非推奨)のため不採用 |
