import { Router, type Response } from "express";
import type { SessionRequest } from "../middleware/session.js";
import type { KeyStore } from "../lib/key-store.js";
import type { ProviderId } from "../lib/types.js";
import { PAID_PROVIDERS } from "../lib/key-store.js";

/** Provider validation endpoints to test if an API key works */
const VALIDATION_ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string> }> = {
  openai: {
    url: "https://api.openai.com/v1/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    headers: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }),
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

/** Map model IDs to their provider */
const MODEL_TO_PROVIDER: Record<string, ProviderId> = {
  chatgpt: "openai",
  claude: "anthropic",
  deepseek: "deepseek",
};

/**
 * Validate an API key by making a lightweight request to the provider.
 * Returns true if the key is valid.
 */
async function validateKey(provider: ProviderId, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const endpoint = VALIDATION_ENDPOINTS[provider];
  if (!endpoint) return { valid: false, error: "Unknown provider" };

  try {
    // For Anthropic, we need to send a minimal POST body
    const isAnthropic = provider === "anthropic";
    const response = await fetch(endpoint.url, {
      method: isAnthropic ? "POST" : "GET",
      headers: endpoint.headers(apiKey),
      body: isAnthropic
        ? JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
        : undefined,
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    // Any non-auth error means the key itself is valid
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Connection failed: ${(err as Error).message}` };
  }
}

export function createKeysRouter(keyStore: KeyStore): Router {
  const keysRouter = Router();

  /**
   * POST /api/keys
   * Submit an API key for a paid model.
   * Body: { model: "chatgpt" | "claude" | "deepseek", apiKey: string }
   * The key is validated, encrypted, and stored per session.
   */
  keysRouter.post("/", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const { model, apiKey } = req.body as { model?: string; apiKey?: string };

    if (!model || !apiKey) {
      res.status(400).json({ error: "model and apiKey are required" });
      return;
    }

    const provider = MODEL_TO_PROVIDER[model];
    if (!provider) {
      res.status(400).json({ error: `${model} does not require an API key` });
      return;
    }

    // Never log the key
    console.log(`[keys] Validating key for ${provider} (session: ${sessionId.slice(0, 8)}...)`);

    // Validate the key
    const result = await validateKey(provider, apiKey);
    if (!result.valid) {
      res.status(401).json({ valid: false, error: result.error });
      return;
    }

    // Encrypt and store
    keyStore.setKey(sessionId, provider, apiKey);
    console.log(`[keys] ✓ Key stored for ${provider} (session: ${sessionId.slice(0, 8)}...)`);

    res.json({ valid: true, provider, model });
  });

  /**
   * GET /api/keys/status
   * Returns which paid providers have keys configured for this session.
   * Never returns the actual keys.
   */
  keysRouter.get("/status", (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const status = keyStore.getStatus(sessionId);

    res.json({
      configured: status,
      paidProviders: PAID_PROVIDERS,
      models: Object.entries(MODEL_TO_PROVIDER).map(([model, provider]) => ({
        model,
        provider,
        hasKey: status[provider] ?? false,
      })),
    });
  });

  /**
   * DELETE /api/keys/:provider
   * Remove a stored key for a provider.
   */
  keysRouter.delete("/:provider", (req, res: Response) => {
    const { sessionId } = req as unknown as SessionRequest;
    const provider = req.params.provider as ProviderId;

    if (!PAID_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: "Not a paid provider" });
      return;
    }

    keyStore.removeKey(sessionId, provider);
    console.log(`[keys] Key removed for ${provider} (session: ${sessionId.slice(0, 8)}...)`);

    res.json({ removed: true, provider });
  });

  return keysRouter;
}
