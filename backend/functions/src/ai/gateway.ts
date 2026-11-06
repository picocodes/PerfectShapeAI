export interface AiChatInput {
  system: string;
  user: string;
  imageDataUrl?: string;
}

export interface AiChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiClient {
  readonly configured: boolean;
  chat(input: AiChatInput): Promise<AiChatResult>;
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createGatewayClient(env: NodeJS.ProcessEnv, fetchImpl: typeof fetch = fetch): AiClient {
  const base = env.CLOUDFLARE_AI_BASE_URL?.trim();
  const gatewayToken = env.CLOUDFLARE_AI_GATEWAY_TOKEN?.trim() || env.CLOUDFLARE_AI_KEY?.trim();
  const providerKey = env.AI_PROVIDER_API_KEY?.trim();
  const model = env.AI_MODEL?.trim() || "openai/gpt-4o-mini";
  const configured = Boolean(base && (gatewayToken || providerKey));

  return {
    configured,
    async chat(input) {
      if (!configured || !base) throw new Error("ai_unconfigured");
      const endpoint = base.endsWith("/chat/completions") ? base : `${base.replace(/\/$/, "")}/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (gatewayToken) headers["cf-aig-authorization"] = `Bearer ${gatewayToken}`;
      if (providerKey) headers.Authorization = `Bearer ${providerKey}`;
      const content = input.imageDataUrl
        ? [
            { type: "text", text: input.user },
            { type: "image_url", image_url: { url: input.imageDataUrl } }
          ]
        : input.user;
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.6,
          max_tokens: 450,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`ai_http_${response.status}`);
      }
      const data = (await response.json()) as ChatCompletion;
      return {
        text: data.choices?.[0]?.message?.content ?? "",
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0
      };
    }
  };
}
