import { OpenAIProvider } from "./openai.js";

/**
 * DeepSeek provider -- uses OpenAI-compatible API format.
 * Extends OpenAI provider with DeepSeek's base URL.
 */
export class DeepSeekProvider extends OpenAIProvider {
  constructor(apiKey: string, baseUrl = "https://api.deepseek.com/v1") {
    super(apiKey, baseUrl);
    this.id = "deepseek";
    this.name = "DeepSeek";
  }
}
