const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

async function complete({ system, prompt, maxTokens = 4096 }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

module.exports = { complete };
