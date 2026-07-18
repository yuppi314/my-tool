const { completeJson } = require("./claude");

const TONE_LABELS = {
  howto: "ノウハウ系(具体的な手順・実践方法を教える記事)",
  essay: "エッセイ系(体験談・考えを語る記事)",
  explainer: "解説系(概念やテーマを深く解説する記事)",
};

const ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    titles: {
      type: "array",
      items: { type: "string" },
      description: "note.com記事のタイトル案。必ず3件にすること。",
    },
    leadHook: {
      type: "string",
      description: "無料公開部分の文章(Markdown)",
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          body: { type: "string", description: "本文(Markdown)" },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["titles", "leadHook", "sections"],
  additionalProperties: false,
};

function buildPrompt({ theme, targetReader, tone, length, reference }) {
  const toneLabel = TONE_LABELS[tone] || TONE_LABELS.howto;

  const lines = [
    `あなたはnote.comで有料記事を書くプロのライターです。以下の条件で、有料記事の下書きを作成してください。`,
    ``,
    `# 条件`,
    `- テーマ: ${theme}`,
    `- 記事のトーン: ${toneLabel}`,
    `- 想定文字数(本文合計の目安): ${length}字前後`,
    targetReader ? `- ターゲット読者: ${targetReader}` : null,
    reference ? `- 参考にしたい既存記事・資料:\n${reference}` : null,
    ``,
    `# 出力要件`,
    `- 読者が「お金を払ってでも続きが読みたい」と思える構成にすること`,
    `- 冒頭は誰でも読める無料部分(フック)とし、読者の悩みへの共感や結論の一部を示して続きへの期待を作ること`,
    `- 無料部分の後に、見出しごとの本文からなる有料部分を続けること`,
    `- 文中で引用・強調のためのカギ括弧には「」を使い、ダブルクォート(")は使わないこと`,
  ].filter(Boolean);

  return lines.join("\n");
}

function assembleMarkdown({ theme, titles, leadHook, sections }) {
  const parts = [
    `# ${titles[0]}`,
    ``,
    `<!-- タイトル案: ${titles.join(" / ")} -->`,
    ``,
    `## 無料公開部分`,
    ``,
    leadHook,
    ``,
    `---`,
    ``,
    `## ここから有料部分`,
    ``,
  ];

  for (const section of sections) {
    parts.push(`### ${section.heading}`, ``, section.body, ``);
  }

  return parts.join("\n");
}

async function generateArticle({ theme, targetReader, tone, length, reference }) {
  const prompt = buildPrompt({ theme, targetReader, tone, length, reference });
  const parsed = await completeJson({
    prompt,
    system: "あなたはnote.comで月間5万円以上を売り上げる有料記事を専門に書くプロのライター兼編集者です。",
    schema: ARTICLE_SCHEMA,
    maxTokens: 8192,
  });

  const markdown = assembleMarkdown({ theme, ...parsed });

  return { ...parsed, markdown };
}

module.exports = { generateArticle, TONE_LABELS };
