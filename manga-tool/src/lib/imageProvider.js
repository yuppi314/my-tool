/**
 * 画像生成プロバイダの抽象化レイヤー。
 * - "placeholder": APIキー不要。コマの説明文から決定的な色を選び、
 *   単色パネル+説明文キャプションを描く「ネーム(下書き)」的な出力。
 *   実際のイラストではなく、レイアウト・セリフ確認用のプレースホルダー。
 * - "openai": OPENAI_API_KEY が設定されている場合、OpenAI Images API で実際に画像を生成する。
 *
 * 戻り値は { buffer: Buffer, mimeType: string, isPlaceholder: boolean }
 */

function hashColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 82%)`;
}

/**
 * プレースホルダー画像(SVG)を生成する。実際の画像バイトは持たず、
 * composeSvg 側でこの記述子を直接 <rect>+<text> として埋め込むために使う。
 */
function placeholderDescriptor(sceneDescription) {
  return {
    kind: "placeholder",
    color: hashColor(sceneDescription || "scene"),
    label: (sceneDescription || "").slice(0, 60),
  };
}

async function generateWithOpenAI({ prompt, size = "1024x1024" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI画像生成に失敗しました (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const item = json.data && json.data[0];
  if (!item) {
    throw new Error("OpenAI画像生成のレスポンスが空です");
  }

  if (item.b64_json) {
    return { buffer: Buffer.from(item.b64_json, "base64"), mimeType: "image/png", isPlaceholder: false };
  }
  if (item.url) {
    const imgRes = await fetch(item.url);
    const arrBuf = await imgRes.arrayBuffer();
    return { buffer: Buffer.from(arrBuf), mimeType: "image/png", isPlaceholder: false };
  }
  throw new Error("OpenAI画像生成のレスポンス形式が不明です");
}

function buildPrompt({ sceneDescription, charactersPresent, characters, artStyle }) {
  const visualNotes = (charactersPresent || [])
    .map((name) => {
      const c = (characters || []).find((ch) => ch.name === name);
      return c ? `${c.name}: ${c.visual_notes}` : null;
    })
    .filter(Boolean)
    .join(" / ");

  return [
    artStyle ? `Art style: ${artStyle}.` : "Art style: black and white manga panel illustration.",
    visualNotes ? `Character appearance: ${visualNotes}.` : null,
    `Scene: ${sceneDescription}`,
    "No text or speech bubbles in the image itself.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * 1コマ分の画像(またはプレースホルダー記述子)を生成する。
 */
async function generatePanelImage({ panel, characters, artStyle }) {
  const provider = process.env.IMAGE_PROVIDER || "placeholder";

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const prompt = buildPrompt({
      sceneDescription: panel.scene_description,
      charactersPresent: panel.characters_present,
      characters,
      artStyle,
    });
    const result = await generateWithOpenAI({ prompt });
    return result;
  }

  // デフォルト: プレースホルダー(APIキー不要)
  return {
    placeholder: placeholderDescriptor(panel.scene_description),
    isPlaceholder: true,
  };
}

module.exports = { generatePanelImage };
