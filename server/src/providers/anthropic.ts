import { BaseProvider, parseRateLimitHeaders, type RateLimitHeaders } from "./base.js";
import type { ChatMessage, StreamChunk } from "../lib/types.js";
import { ProviderError } from "./openai.js";

/**
 * Anthropic provider -- handles Claude models.
 * Uses the Anthropic Messages API format.
 */
export class AnthropicProvider extends BaseProvider {
  id: "anthropic" = "anthropic";
  name = "Anthropic";

  constructor(apiKey: string, baseUrl = "https://api.anthropic.com/v1") {
    super(apiKey, baseUrl);
  }

  private formatMessages(messages: ChatMessage[]): {
    system?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  } {
    // Anthropic separates system message from the messages array
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    return {
      system: systemMsg?.content,
      messages: chatMessages,
    };
  }

  async streamChat(
    modelId: string,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<RateLimitHeaders> {
    const { system, messages: formatted } = this.formatMessages(messages);

    const body: Record<string, unknown> = {
      model: modelId,
      messages: formatted,
      max_tokens: 4096,
      stream: true,
    };
    if (system) body.system = system;

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
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

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "content_block_delta") {
            const text = parsed.delta?.text;
            if (text) {
              onChunk({ type: "content", content: text });
            }
          } else if (parsed.type === "message_stop") {
            onChunk({ type: "done" });
          } else if (parsed.type === "message_delta" && parsed.usage) {
            onChunk({
              type: "done",
              usage: {
                promptTokens: parsed.usage.input_tokens || 0,
                completionTokens: parsed.usage.output_tokens || 0,
                totalTokens:
                  (parsed.usage.input_tokens || 0) +
                  (parsed.usage.output_tokens || 0),
              },
            });
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    return rateLimits;
  }

  async chat(modelId: string, messages: ChatMessage[], signal?: AbortSignal) {
    const { system, messages: formatted } = this.formatMessages(messages);

    const body: Record<string, unknown> = {
      model: modelId,
      messages: formatted,
      max_tokens: 4096,
    };
    if (system) body.system = system;

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(this.id, response.status, error);
    }

    const rateLimitHeaders = parseRateLimitHeaders(response.headers);
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const content = data.content
      ?.map((block) => (block.type === "text" ? block.text : ""))
      .join("") || "";

    return {
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      rateLimitHeaders,
    };
  }
}
