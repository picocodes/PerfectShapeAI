import fetch from "node-fetch";

const DEFAULT_MODEL = "gpt-4o-mini";

export interface AiRequest {
  system: string;
  user: Record<string, unknown>;
  prompt: string;
}

export interface AiResponse {
  text: string;
  tokenUsage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export async function callAi(request: AiRequest): Promise<AiResponse> {
  const apiKey = process.env.CLOUDFLARE_AI_KEY;
  const baseUrl = process.env.CLOUDFLARE_AI_BASE_URL;
  if (!apiKey || !baseUrl) {
    return {
      text: "AI is not configured yet. Please set CLOUDFLARE_AI_KEY and CLOUDFLARE_AI_BASE_URL."
    };
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: JSON.stringify(request.user) },
        { role: "user", content: request.prompt }
      ],
      max_tokens: 450,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    tokenUsage: data.usage
      ? {
          input_tokens: data.usage.prompt_tokens,
          output_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        }
      : undefined
  };
}
