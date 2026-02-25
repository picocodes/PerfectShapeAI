import fetch from "node-fetch";
const DEFAULT_MODEL = "openai/gpt-5-mini";
export async function callAi(request) {
    const apiKey = process.env.CLOUDFLARE_AI_KEY;
    const baseUrl = process.env.CLOUDFLARE_AI_BASE_URL;
    if (!apiKey || !baseUrl) {
        return {
            text: "AI is not configured yet. Please set CLOUDFLARE_AI_KEY and CLOUDFLARE_AI_BASE_URL."
        };
    }
    const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'cf-aig-authorization': `Bearer ${apiKey}`
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
    const data = (await response.json());
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
