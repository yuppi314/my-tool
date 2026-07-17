# 03. ディレクトリ構成

> 関連: [要件定義 v0.3](../requirements.md) / [目次](./README.md)

## 変更履歴
| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版作成 |

---

## ⚠️ 確認をお願いしたい前提

`yuppi314/my-tool` リポジトリには既に「九星気学×マヤ暦 診断ツール」(Webアプリ、`src/`・`public/` 直下)が存在します。本プロジェクトをルート直下の `src/` に配置すると既存アプリと衝突するため、**`apps/mitsu/` 配下に新規デスクトップアプリとして追加するモノレポ構成**を前提にしています。既存アプリとは完全に独立したディレクトリ・独立した `package.json` で管理し、互いに干渉しません。

もし「別リポジトリに分離したい」「既存の診断ツールは廃止して置き換えたい」等のご意向があれば教えてください。構成を修正します。

---

## リポジトリ全体構成

```
my-tool/                          # 既存リポジトリ(モノレポとして利用)
├── docs/                         # ★本プロジェクトの要件定義・設計書
│   ├── requirements.md
│   └── design/
│       ├── README.md
│       └── 01〜18-*.md
├── apps/
│   └── mitsu/                    # ★本プロジェクト(AI業務アシスタント デスクトップアプリ)
│       ├── src/
│       │   ├── main/             # Electron Main Process
│       │   ├── preload/          # contextBridge定義
│       │   └── renderer/         # React アプリ
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── electron-builder.yml
├── src/                           # 既存: 九星気学×マヤ暦診断ツール(Webアプリ、別プロダクト。変更しない)
├── public/                        # 既存(同上)
└── package.json                   # 既存ルート(Webアプリ用)
```

## `apps/mitsu/` 内部構成

```
apps/mitsu/
├── src/
│   ├── main/
│   │   ├── index.ts               # エントリーポイント(BrowserWindow生成等)
│   │   ├── ipc/                    # 画面/機能ごとのIPCハンドラー
│   │   │   ├── quote.ipc.ts
│   │   │   ├── customer.ipc.ts
│   │   │   ├── company.ipc.ts
│   │   │   ├── ai.ipc.ts
│   │   │   ├── pdf.ipc.ts
│   │   │   ├── backup.ipc.ts
│   │   │   ├── license.ipc.ts
│   │   │   └── feedback.ipc.ts
│   │   ├── services/                # ビジネスロジック(IPCハンドラーから呼ばれる)
│   │   │   ├── quoteService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── companyService.ts
│   │   │   ├── pdfService.ts
│   │   │   ├── backupService.ts
│   │   │   ├── licenseService.ts
│   │   │   └── keyStoreService.ts
│   │   ├── ai/                      # AI連携レイヤー(詳細は09)
│   │   │   ├── AIProvider.ts         # 共通インターフェース
│   │   │   ├── ClaudeProvider.ts
│   │   │   ├── OpenAIProvider.ts
│   │   │   ├── GeminiProvider.ts
│   │   │   └── AIProviderFactory.ts
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── schema.ts
│   │   └── logger/
│   │       └── logger.ts
│   ├── preload/
│   │   └── index.ts                 # contextBridgeで公開するAPIの定義
│   └── renderer/
│       ├── App.tsx
│       ├── screens/
│       │   ├── Onboarding/
│       │   ├── Dashboard/
│       │   ├── QuoteEditor/
│       │   ├── Customers/
│       │   ├── CompanySettings/
│       │   ├── Settings/
│       │   └── Feedback/
│       ├── components/
│       ├── hooks/
│       └── styles/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
└── electron-builder.yml
```

## 設計意図

- **main / preload / renderer の分離**: Electronのセキュリティ推奨構成に準拠。Rendererは常にPreload経由でしかMain機能を呼べない
- **services層の独立**: IPCハンドラーとビジネスロジックを分離することで、ロジック単体でのユニットテストが容易になる(保守性)
- **ai/ ディレクトリの独立**: プロバイダー実装を1ファイル1クラスに分離し、将来Providerを追加する際は新規ファイル追加のみで済む構造(要件定義8番のマルチAI方針に対応)
- **db/migrations/**: スキーマ変更時にマイグレーションファイルを追加していく方式とし、後方互換性を担保する
