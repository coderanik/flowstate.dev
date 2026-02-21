import type { AIModelId, ProviderId, ChatMessage, StreamChunk } from "./types.js";
import type { BaseProvider } from "../providers/base.js";
import { ProviderError } from "../providers/openai.js";
import { RateLimitTracker } from "./rate-limiter.js";

/** Maps each AIModelId to its provider and provider-specific model ID */
interface ModelMapping {
  modelId: AIModelId;
  providerId: ProviderId;
  providerModelId: string;
  displayName: string;
}

/**
 * The AI Router -- the core of the gateway.
 * Routes requests to providers, handles fallback, and tracks rate limits.
 *
 * Server-side providers (free) are always registered.
 * Per-request providers (paid, user keys) are passed into streamChat/chat.
 */
export class AIRouter {
  private providers: Map<ProviderId, BaseProvider> = new Map();
  private modelMappings: ModelMapping[] = [];
  private rateLimiter = new RateLimitTracker();

  /** Default fallback order when a model's provider is unavailable */
  private fallbackOrder: AIModelId[] = [
    "claude", "chatgpt", "deepseek", "gemini",
    "mixtral", "llama3", "mistral", "qwen-coder", "phi3", "codellama", "starcoder2",
  ];

  registerProvider(provider: BaseProvider): void {
    if (provider.isConfigured()) {
      this.providers.set(provider.id, provider);
      console.log(`  ✓ ${provider.name} registered`);
    } else {
      console.log(`  ✗ ${provider.name} skipped (no API key)`);
    }
  }

  registerModel(mapping: ModelMapping): void {
    this.modelMappings.push(mapping);
  }

  /** Get model mapping by modelId */
  getModelMapping(modelId: AIModelId): ModelMapping | undefined {
    return this.modelMappings.find((m) => m.modelId === modelId);
  }

  /** Get all models with availability (considering session providers) */
  getAvailableModels(sessionProviders?: Map<ProviderId, BaseProvider>): Array<{
    id: AIModelId;
    name: string;
    provider: ProviderId;
    available: boolean;
  }> {
    return this.modelMappings.map((m) => {
      const hasServer = this.providers.has(m.providerId);
      const hasSession = sessionProviders?.has(m.providerId) ?? false;
      const notLimited = this.rateLimiter.isAvailable(m.providerId);

      return {
        id: m.modelId,
        name: m.displayName,
        provider: m.providerId,
        available: (hasServer || hasSession) && notLimited,
      };
    });
  }

  /** Get rate limit status for all providers */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Resolve a provider -- check session providers first, then server providers.
   */
  private resolveProvider(
    providerId: ProviderId,
    sessionProviders?: Map<ProviderId, BaseProvider>
  ): BaseProvider | undefined {
    return sessionProviders?.get(providerId) ?? this.providers.get(providerId);
  }

  /**
   * Build a fallback chain starting from the preferred model.
   * Considers both server-side and session-specific providers.
   */
  private buildFallbackChain(
    preferredModel: AIModelId,
    sessionProviders?: Map<ProviderId, BaseProvider>
  ): Array<{ provider: BaseProvider; providerModelId: string; modelId: AIModelId }> {
    const chain: Array<{ provider: BaseProvider; providerModelId: string; modelId: AIModelId }> = [];
    const seen = new Set<ProviderId>();

    const tryAdd = (modelId: AIModelId) => {
      const mapping = this.modelMappings.find((m) => m.modelId === modelId);
      if (!mapping) return;
      if (seen.has(mapping.providerId)) return;

      const provider = this.resolveProvider(mapping.providerId, sessionProviders);
      if (!provider) return;

      seen.add(mapping.providerId);
      chain.push({
        provider,
        providerModelId: mapping.providerModelId,
        modelId: mapping.modelId,
      });
    };

    // Preferred model first
    tryAdd(preferredModel);

    // Then rest of fallback order
    for (const modelId of this.fallbackOrder) {
      if (modelId !== preferredModel) {
        tryAdd(modelId);
      }
    }

    return chain;
  }

  /**
   * Stream a chat response with automatic fallback.
   * @param sessionProviders - per-user provider instances (paid models with user keys)
   */
  async streamChat(
    preferredModel: AIModelId,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    options?: {
      fallback?: boolean;
      signal?: AbortSignal;
      sessionProviders?: Map<ProviderId, BaseProvider>;
    }
  ): Promise<void> {
    const { fallback = true, signal, sessionProviders } = options ?? {};
    const chain = this.buildFallbackChain(preferredModel, sessionProviders);

    if (chain.length === 0) {
      onChunk({
        type: "error",
        error: "No AI providers available. Add an API key for this model or try a free model.",
      });
      return;
    }

    let lastError: Error | null = null;

    for (const { provider, providerModelId, modelId } of chain) {
      // Skip if rate-limited
      if (!this.rateLimiter.isAvailable(provider.id)) {
        console.log(`  ⏳ ${provider.name} rate-limited, skipping`);
        if (!fallback) break;
        continue;
      }

      try {
        // Notify client which model is being used (if fallback happened)
        if (modelId !== preferredModel) {
          onChunk({
            type: "info",
            content: `⚡ ${preferredModel} unavailable, falling back to ${modelId}`,
            model: modelId,
            provider: provider.id,
          });
        }

        console.log(`  → Routing to ${provider.name} (${providerModelId})`);

        const rateLimits = await provider.streamChat(
          providerModelId,
          messages,
          onChunk,
          signal
        );

        // Update rate limit tracker
        this.rateLimiter.update(provider.id, rateLimits);
        return; // Success
      } catch (err) {
        lastError = err as Error;

        if (err instanceof ProviderError && err.isRateLimited) {
          console.log(`  ⚠ ${provider.name} returned 429, marking limited`);
          this.rateLimiter.markLimited(provider.id);
          if (!fallback) break;
          continue;
        }

        if (err instanceof ProviderError && err.isAuthError) {
          onChunk({
            type: "error",
            error: `${provider.name}: Authentication failed. Check your API key.`,
          });
          return;
        }

        console.error(`  ✗ ${provider.name} error:`, (err as Error).message);
        if (!fallback) break;
      }
    }

    onChunk({
      type: "error",
      error: lastError
        ? `All providers failed. Last error: ${lastError.message}`
        : "No available providers.",
    });
  }

  /**
   * Non-streaming chat with fallback.
   */
  async chat(
    preferredModel: AIModelId,
    messages: ChatMessage[],
    options?: {
      fallback?: boolean;
      signal?: AbortSignal;
      sessionProviders?: Map<ProviderId, BaseProvider>;
    }
  ): Promise<{ model: AIModelId; provider: ProviderId; content: string; usage?: StreamChunk["usage"] }> {
    const { fallback = true, signal, sessionProviders } = options ?? {};
    const chain = this.buildFallbackChain(preferredModel, sessionProviders);

    if (chain.length === 0) {
      throw new Error("No AI providers available");
    }

    let lastError: Error | null = null;

    for (const { provider, providerModelId, modelId } of chain) {
      if (!this.rateLimiter.isAvailable(provider.id)) {
        if (!fallback) break;
        continue;
      }

      try {
        const result = await provider.chat(providerModelId, messages, signal);
        this.rateLimiter.update(provider.id, result.rateLimitHeaders);

        return {
          model: modelId,
          provider: provider.id,
          content: result.content,
          usage: result.usage,
        };
      } catch (err) {
        lastError = err as Error;

        if (err instanceof ProviderError && err.isRateLimited) {
          this.rateLimiter.markLimited(provider.id);
          if (!fallback) break;
          continue;
        }

        if (err instanceof ProviderError && err.isAuthError) {
          throw new Error(`${provider.name}: Authentication failed. Check your API key.`);
        }

        if (!fallback) break;
      }
    }

    throw lastError ?? new Error("No available providers");
  }
}
