# 詳細設計書インデックス — AI業務アシスタント「MITSU」(Version 0.1)

要件定義の確定版は [`../requirements.md`](../requirements.md) を参照してください。本フォルダはPhase 2(詳細設計)の成果物です。設計変更が発生した場合は、該当ファイルを直接更新し、各ファイル冒頭の「変更履歴」に追記してください。

> ⚠️ **レビューをお願いしたい重要な決定事項** は [`01-architecture.md`](./01-architecture.md) と [`03-directory-structure.md`](./03-directory-structure.md) の冒頭に記載しています(モノレポ構成の確認)。

## 目次

| # | ドキュメント | 内容 |
|---|---|---|
| 01 | [システム全体アーキテクチャ](./01-architecture.md) | Electron main/renderer構成、レイヤー図 |
| 02 | [技術スタック選定](./02-tech-stack.md) | 採用理由・代替案・メリデメ |
| 03 | [ディレクトリ構成](./03-directory-structure.md) | リポジトリ内の配置方針 |
| 04 | [画面一覧](./04-screens.md) | Version 0.1の全画面 |
| 05 | [画面遷移図](./05-screen-flow.md) | Mermaidによる遷移図 |
| 06 | [ワイヤーフレーム](./06-wireframes.md) | 主要画面の低精度レイアウト |
| 07 | [UI/UX設計](./07-ui-ux.md) | デザイン原則・AI対話UIの配置方針 |
| 08 | [データベース設計](./08-database.md) | テーブル定義・ER図 |
| 09 | [AI連携レイヤー設計](./09-ai-integration.md) | Provider抽象化・対話フロー |
| 10 | [PDF生成設計](./10-pdf-generation.md) | printToPDFベースの生成方式 |
| 11 | [バックアップ・復元設計](./11-backup-restore.md) | エクスポート/インポート仕様 |
| 12 | [APIキー管理設計](./12-api-key-management.md) | safeStorageによる暗号化保存 |
| 13 | [設定画面設計](./13-settings-screen.md) | 設定画面の構成・項目 |
| 14 | [エラーハンドリング設計](./14-error-handling.md) | エラー分類・表示・復旧方針 |
| 15 | [ログ設計](./15-logging.md) | app.logの出力・ローテーション |
| 16 | [フィードバック送信設計](./16-feedback.md) | mailtoベースの簡易送信 |
| 17 | [ライセンス認証設計](./17-license-auth.md) | Version0.1向け簡易ライセンス |
| 18 | [テスト設計](./18-test-design.md) | 単体/統合/E2Eテスト方針 |

## 変更履歴
| 日付 | 内容 |
|---|---|
| 2026-07-17 | Phase 2 初版作成(01〜18) |
