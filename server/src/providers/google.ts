import { BaseProvider, parseRateLimitHeaders, type RateLimitHeaders } from "./base.js";
import type { ChatMessage, StreamChunk } from "../lib/types.js";
import { ProviderError } from "./openai.js";

/**
 * Google AI provider -- handles Gemini models.
 * Uses the Gemini API (generativelanguage.googleapis.com).
 */
export class GoogleProvider extends BaseProvider {
  id: "google" = "google";
  name = "Google AI";

  constructor(apiKey: string, baseUrl = "https://generativelanguage.googleapis.com/v1beta") {
    super(apiKey, baseUrl);
  }

  private formatMessages(messages: ChatMessage[]): {
    systemInstruction?: { parts: { text: string }[] };
    contents: Array<{ role: string; parts: { text: string }[] }>;
  } {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    return {
      systemInstruction: systemMsg
        ? { parts: [{ text: systemMsg.content }] }
        : undefined,
      contents: chatMessages,
    };
  }

  async streamChat(
    modelId: string,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<RateLimitHeaders> {
    const { systemInstruction, contents } = this.formatMessages(messages);

    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    const url = `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            onChunk({ type: "content", content: text });
          }

          // Usage metadata
          if (parsed.usageMetadata) {
            onChunk({
              type: "done",
              usage: {
                promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                totalTokens: parsed.usageMetadata.totalTokenCount || 0,
              },
            });
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    onChunk({ type: "done" });
    return rateLimits;
  }

  async chat(modelId: string, messages: ChatMessage[], signal?: AbortSignal) {
    const { systemInstruction, contents } = this.formatMessages(messages);

    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(this.id, response.status, error);
    }

    const rateLimitHeaders = parseRateLimitHeaders(response.headers);
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      content,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      rateLimitHeaders,
    };
  }
}
