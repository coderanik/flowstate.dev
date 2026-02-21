import { Router, type Response } from "express";
import type { AIRouter } from "../lib/router.js";
import type { KeyStore } from "../lib/key-store.js";
import type { SessionRequest } from "../middleware/session.js";
import type { AIModelId, ChatMessage, ProviderId } from "../lib/types.js";
import type { BaseProvider } from "../providers/base.js";
import { OpenAIProvider, AnthropicProvider, DeepSeekProvider } from "../providers/index.js";

/** Create a temporary provider instance with a user's decrypted key */
function createProviderFromKey(provider: ProviderId, apiKey: string): BaseProvider | null {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "deepseek":
      return new DeepSeekProvider(apiKey);
    default:
      return null;
  }
}

/** Paid model → provider mapping */
const MODEL_TO_PAID_PROVIDER: Partial<Record<AIModelId, ProviderId>> = {
  chatgpt: "openai",
  claude: "anthropic",
  deepseek: "deepseek",
};

/** Build session providers map from the key store */
function buildSessionProviders(
  sessionId: string,
  keyStore: KeyStore
): Map<ProviderId, BaseProvider> {
  const providers = new Map<ProviderId, BaseProvider>();

  for (const [, providerId] of Object.entries(MODEL_TO_PAID_PROVIDER)) {
    const key = keyStore.getKey(sessionId, providerId);
    if (key) {
      const provider = createProviderFromKey(providerId, key);
      if (provider) {
        providers.set(providerId, provider);
      }
    }
  }

  return providers;
}

export function createChatRouter(router: AIRouter, keyStore: KeyStore): Router {
  const chatRouter = Router();

  /**
   * POST /api/chat
   * Non-streaming chat endpoint.
   */
  chatRouter.post("/", async (req, res: Response) => {
    try {
      const { sessionId } = req as SessionRequest;
      const { model, messages, fallback } = req.body as {
        model: AIModelId;
        messages: ChatMessage[];
        fallback?: boolean;
      };

      if (!model || !messages?.length) {
        res.status(400).json({ error: "model and messages are required" });
        return;
      }

      console.log(`[chat] model=${model} messages=${messages.length}`);

      const sessionProviders = buildSessionProviders(sessionId, keyStore);
      const result = await router.chat(model, messages, { fallback, sessionProviders });

      res.json({
        model: result.model,
        provider: result.provider,
        content: result.content,
        usage: result.usage,
      });
    } catch (err) {
      console.error("[chat] error:", (err as Error).message);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /api/chat/stream
   * Streaming chat endpoint using Server-Sent Events (SSE).
   */
  chatRouter.post("/stream", async (req, res: Response) => {
    try {
      const { sessionId } = req as SessionRequest;
      const { model, messages, fallback } = req.body as {
        model: AIModelId;
        messages: ChatMessage[];
        fallback?: boolean;
      };

      if (!model || !messages?.length) {
        res.status(400).json({ error: "model and messages are required" });
        return;
      }

      console.log(`[stream] model=${model} messages=${messages.length}`);

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // Don't propagate client disconnect to provider — HF cold start can take 60–90s.
      // We skip writing when res.destroyed, but let the provider request complete.
      const sessionProviders = buildSessionProviders(sessionId, keyStore);

      await router.streamChat(
        model,
        messages,
        (chunk) => {
          if (res.destroyed) return;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        },
        { fallback, sessionProviders }
      );

      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[stream] error:", (err as Error).message);
      if (!res.headersSent) {
        res.status(500).json({ error: (err as Error).message });
      } else if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "error", error: (err as Error).message })}\n\n`);
        res.end();
      }
    }
  });

  return chatRouter;
}
