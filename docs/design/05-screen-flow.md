# 05. 画面遷移図

> 関連: [要件定義 v0.3](../requirements.md) / [目次](./README.md) / [画面一覧](./04-screens.md)

## 変更履歴
| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版作成 |

---

## 全体遷移図

```mermaid
flowchart TD
    Start([アプリ起動]) --> CheckLicense{ライセンス認証済み?}
    CheckLicense -->|未認証| Onboarding[S01: オンボーディング]
    Onboarding --> LicenseInput[ライセンスキー入力]
    LicenseInput --> CompanyInfoInput[会社情報入力]
    CompanyInfoInput --> Dashboard
    CheckLicense -->|認証済み| Dashboard[S02: ダッシュボード]

    Dashboard --> NewQuote[新規見積書作成]
    Dashboard --> EditQuote[既存見積書を開く]
    Dashboard --> CustomerList[S04: 顧客一覧]
    Dashboard --> Settings[S07: 設定画面]

    NewQuote --> QuoteEditor[S03: 見積書エディタ]
    EditQuote --> QuoteEditor
    QuoteEditor -->|AI入力補助を使う| AIChat[AI対話パネル]
    AIChat -->|反映| QuoteEditor
    QuoteEditor --> PDFPreview[PDFプレビュー]
    PDFPreview --> SavePDF[PDF保存]
    SavePDF --> Dashboard

    CustomerList --> CustomerForm[S05: 顧客登録/編集]
    CustomerForm --> CustomerList
    CustomerList --> QuoteEditor

    Settings --> AISettings[AI設定タブ]
    Settings --> BackupSettings[バックアップタブ]
    Settings --> LicenseSettings[ライセンスタブ]
    Settings --> CompanyInfoEdit[S06: 会社情報編集]
    Settings --> FeedbackModal[S08: フィードバック送信]

    BackupSettings --> ExportFile[エクスポート実行]
    BackupSettings --> ImportFile[インポート実行]
    ImportFile --> Dashboard
```

## 補足

- 「AI対話パネル」は独立画面ではなく、見積書エディタ(S03)内に常駐するサブコンポーネントとして扱う(要件定義の「AIなしでも完結」原則により、パネルを閉じても本体フローが完結できる設計)
- オンボーディングはライセンス未認証時のみ強制表示され、認証済みなら以降はスキップされダッシュボードへ直行する
- バックアップのインポート完了後は必ずダッシュボードに戻り、データが反映された状態を確認できるようにする
