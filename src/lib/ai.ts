// Thin provider wrapper. Every provider below speaks the same
// OpenAI-compatible chat-completions shape, so switching AI_PROVIDER in
// .env is the only change needed \u2014 nothing else in the app talks to a
// specific vendor directly. The API key is read server-side only.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AIConfigError extends Error {}

type ProviderConfig = {
  baseUrl: string;
  apiKeyEnvVar: string;
  defaultModel: string;
};

const PROVIDERS: Record<string, ProviderConfig> = {
  huggingface: {
    baseUrl: "https://router.huggingface.co/v1/chat/completions",
    apiKeyEnvVar: "HF_TOKEN",
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnvVar: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-20b",
  },
};

function getProvider() {
  const name = (process.env.AI_PROVIDER || "huggingface").toLowerCase();
  const config = PROVIDERS[name];
  if (!config) {
    throw new AIConfigError(`Unknown AI_PROVIDER "${name}". Use "huggingface" or "groq".`);
  }
  return { name, config };
}

export async function askAI(messages: ChatMessage[]): Promise<string> {
  const { name, config } = getProvider();
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new AIConfigError(
      `AI Assistant isn't set up yet. Add ${config.apiKeyEnvVar} to your .env file (provider: ${name}).`
    );
  }

  const model = process.env.AI_MODEL || config.defaultModel;

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed via ${name} (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`AI (${name}) returned an empty response.`);
  return content;
}
