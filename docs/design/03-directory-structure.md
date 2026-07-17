# 03. ディレクトリ構成

> 関連: [要件定義 v0.3](../requirements.md) / [目次](./README.md)

## 変更履歴
| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版作成 |
| 2026-07-17 | 専用リポジトリ管理への変更に伴い、モノレポ構成(`apps/mitsu/`)を廃止し、MITSU単体プロジェクトのルート構成に変更 |

---

## 方針

本プロジェクトは販売する独立製品のため、既存の `yuppi314/my-tool` とは別の**MITSU専用リポジトリ**として管理します。以下はそのリポジトリ単体のルート構成です。

## リポジトリ全体構成

```
mitsu/                             # MITSU専用リポジトリのルート
├── docs/                          # 要件定義・設計書
│   ├── requirements.md
│   └── design/
│       ├── README.md
│       └── 01〜18-*.md
├── src/
│   ├── main/                      # Electron Main Process
│   │   ├── index.ts                # エントリーポイント(BrowserWindow生成等)
│   │   ├── ipc/                     # 画面/機能ごとのIPCハンドラー
│   │   │   ├── quote.ipc.ts
│   │   │   ├── customer.ipc.ts
│   │   │   ├── company.ipc.ts
│   │   │   ├── ai.ipc.ts
│   │   │   ├── pdf.ipc.ts
│   │   │   ├── backup.ipc.ts
│   │   │   ├── license.ipc.ts
│   │   │   └── feedback.ipc.ts
│   │   ├── services/                 # ビジネスロジック(IPCハンドラーから呼ばれる)
│   │   │   ├── quoteService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── companyService.ts
│   │   │   ├── pdfService.ts
│   │   │   ├── backupService.ts
│   │   │   ├── licenseService.ts
│   │   │   └── keyStoreService.ts
│   │   ├── ai/                       # AI連携レイヤー(詳細は09)
│   │   │   ├── AIProvider.ts          # 共通インターフェース
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
│   │   └── index.ts                  # contextBridgeで公開するAPIの定義
│   └── renderer/                     # React アプリ
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
├── .github/                          # 将来のCI導入時に使用(Version0.1では未使用、保守方針参照)
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── README.md                          # リポジトリ直下の製品概要README
```

## 設計意図

- **専用リポジトリの独立性**: 既存の `yuppi314/my-tool`(別プロダクト)とは完全に切り離され、依存関係もリリースサイクルも独立する
- **main / preload / renderer の分離**: Electronのセキュリティ推奨構成に準拠。Rendererは常にPreload経由でしかMain機能を呼べない
- **services層の独立**: IPCハンドラーとビジネスロジックを分離することで、ロジック単体でのユニットテストが容易になる(保守性)
- **ai/ ディレクトリの独立**: プロバイダー実装を1ファイル1クラスに分離し、将来Providerを追加する際は新規ファイル追加のみで済む構造(要件定義8番のマルチAI方針に対応)
- **db/migrations/**: スキーマ変更時にマイグレーションファイルを追加していく方式とし、後方互換性を担保する
- **ルート直下がそのままプロジェクト**: モノレポのような入れ子構造(`apps/mitsu/`)を廃止したことで、`package.json`・`tsconfig.json`・テスト実行コマンド等がすべてリポジトリ直下で完結し、開発時のパス管理がシンプルになる

## 実施が必要な作業(実装着手前の準備、参考)

専用リポジトリへの切り替えに伴い、実装着手前に以下の準備作業が発生します(この設計書更新自体には含まれません。実施のタイミングで別途ご確認します)。

1. GitHub上に新規リポジトリを作成
2. 本設計書一式(`docs/`)を新リポジトリに移す(現在 `yuppi314/my-tool` に置いてある `docs/requirements.md` と `docs/design/` を新リポジトリへコピー)
3. 新リポジトリの初期セットアップ(`package.json`初期化、Electron/React/TypeScript環境構築)
