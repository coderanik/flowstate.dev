import { BaseProvider, parseRateLimitHeaders, type RateLimitHeaders } from "./base.js";
import type { ChatMessage, StreamChunk } from "../lib/types.js";

/**
 * OpenAI provider -- handles ChatGPT models.
 * Compatible with any OpenAI-API-compatible service.
 */
export class OpenAIProvider extends BaseProvider {
  id: "openai" | "deepseek" | "huggingface" = "openai";
  name = "OpenAI";

  constructor(apiKey: string, baseUrl = "https://api.openai.com/v1") {
    super(apiKey, baseUrl);
  }

  async streamChat(
    modelId: string,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<RateLimitHeaders> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(this.id, response.status, error);
    }

    const rateLimits = parseRateLimitHeaders(response.headers);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onChunk({ type: "done" });
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk({ type: "content", content });
          }

          // Check for usage in the final chunk
          if (parsed.usage) {
            onChunk({
              type: "done",
              usage: {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              },
            });
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    return rateLimits;
  }

  async chat(
    modelId: string,
    messages: ChatMessage[],
    signal?: AbortSignal
  ) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(this.id, response.status, error);
    }

    const rateLimitHeaders = parseRateLimitHeaders(response.headers);
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0].message.content || "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      rateLimitHeaders,
    };
  }
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number,
    public body: string
  ) {
    super(`[${provider}] HTTP ${status}: ${body}`);
    this.name = "ProviderError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
