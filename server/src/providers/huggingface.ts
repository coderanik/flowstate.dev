import { OpenAIProvider } from "./openai.js";

/**
 * Hugging Face Inference Providers API.
 * Uses the OpenAI-compatible router endpoint.
 *
 * Token: Create at https://huggingface.co/settings/tokens
 * - Fine-grained token with "Make calls to Inference Providers" (inference.serverless.write)
 * - Classic read-only tokens may NOT work — use a token that has Inference Providers permission
 */
export class HuggingFaceProvider extends OpenAIProvider {
  constructor(apiKey: string, baseUrl = "https://router.huggingface.co/v1") {
    super(apiKey, baseUrl);
    this.id = "huggingface";
    this.name = "Hugging Face";
  }
}
