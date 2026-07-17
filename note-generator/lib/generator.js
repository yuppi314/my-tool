const { complete } = require("./claude");

const TONE_LABELS = {
  howto: "ノウハウ系(具体的な手順・実践方法を教える記事)",
  essay: "エッセイ系(体験談・考えを語る記事)",
  explainer: "解説系(概念やテーマを深く解説する記事)",
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
    `- 出力は必ず下記のJSON形式のみとし、前後に説明文やコードフェンスを付けないこと`,
    ``,
    `{`,
    `  "titles": ["タイトル案1", "タイトル案2", "タイトル案3"],`,
    `  "leadHook": "無料公開部分の文章(Markdown)",`,
    `  "sections": [`,
    `    { "heading": "見出し1", "body": "本文(Markdown)" }`,
    `  ]`,
    `}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function parseJsonResponse(raw) {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : text;
  return JSON.parse(jsonText);
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
  const raw = await complete({
    prompt,
    system: "あなたはnote.comで月間5万円以上を売り上げる有料記事を専門に書くプロのライター兼編集者です。",
    maxTokens: 8192,
  });

  const parsed = parseJsonResponse(raw);
  const markdown = assembleMarkdown({ theme, ...parsed });

  return { ...parsed, markdown };
}

module.exports = { generateArticle, TONE_LABELS };
