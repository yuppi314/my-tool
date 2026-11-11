const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const SCENARIO_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    synopsis: { type: "string" },
    characters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          visual_notes: {
            type: "string",
            description: "髪型・服装・体格など、画像生成プロンプトに使う一貫した外見の特徴",
          },
        },
        required: ["name", "description", "visual_notes"],
        additionalProperties: false,
      },
    },
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          page_number: { type: "integer" },
          panels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                panel_number: { type: "integer" },
                scene_description: {
                  type: "string",
                  description: "画像生成用の視覚的な説明(構図・アングル・背景・表情など)",
                },
                characters_present: { type: "array", items: { type: "string" } },
                dialogue: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      speaker: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["speaker", "text"],
                    additionalProperties: false,
                  },
                },
                caption: { type: ["string", "null"] },
                sfx: { type: ["string", "null"], description: "効果音(例: ドン、シーン)" },
              },
              required: [
                "panel_number",
                "scene_description",
                "characters_present",
                "dialogue",
                "caption",
                "sfx",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["page_number", "panels"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "synopsis", "characters", "pages"],
  additionalProperties: false,
};

/**
 * プロット(premise)から構造化された漫画シナリオ(ページ・コマ割り・セリフ)を生成する。
 * 画像生成には一切関与しない — このモジュールの出力はあくまでテキストの脚本データ。
 */
async function generateScenario({ premise, numPages = 4, artStyle = "" }) {
  const system = `あなたはプロの漫画原作者です。与えられたプロットから、コマ割り・構図・セリフまで具体的に書き込まれた漫画のネーム(scenario)を作成します。
- 各ページは3〜6コマ程度を目安にしてください。
- scene_description には画像生成AIに渡すための視覚的な説明(構図、カメラアングル、背景、キャラクターの表情・ポーズ)を具体的に書いてください。
- 同じキャラクターの外見(髪型・服装・体格)は characters の visual_notes に一貫して定義し、各コマでもその特徴を再利用してください。
- セリフは自然な日本語の会話文にしてください。
- caption や sfx が不要なコマは null にしてください。`;

  const userText = [
    `プロット: ${premise}`,
    `ページ数: ${numPages}`,
    artStyle ? `絵柄・トーンの指定: ${artStyle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system,
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: SCENARIO_SCHEMA,
      },
    },
    messages: [{ role: "user", content: userText }],
  });

  if (response.parsed_output == null) {
    throw new Error("シナリオ生成に失敗しました(構造化出力の解析エラー)");
  }

  return response.parsed_output;
}

module.exports = { generateScenario, SCENARIO_SCHEMA };
