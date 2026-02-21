import "dotenv/config";
import express from "express";
import cors from "cors";
import { AIRouter } from "./lib/router.js";
import { KeyStore } from "./lib/key-store.js";
import { GoogleProvider, HuggingFaceProvider } from "./providers/index.js";
import { createChatRouter } from "./routes/chat.js";
import { createModelsRouter } from "./routes/models.js";
import { createKeysRouter } from "./routes/keys.js";
import { createSpotifyRouter } from "./routes/spotify.js";
import { SpotifyStore } from "./lib/spotify-store.js";
import { sessionMiddleware } from "./middleware/session.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ─── Initialize AI Router & Key Store ───

const aiRouter = new AIRouter();
const keyStore = new KeyStore();
const spotifyStore = new SpotifyStore();

console.log("\n🔌 Registering AI providers...");
console.log("  (Free providers -- server-side keys)");

// Only FREE providers are registered server-side
aiRouter.registerProvider(
  new GoogleProvider(process.env.GOOGLE_AI_API_KEY || "")
);
aiRouter.registerProvider(
  new HuggingFaceProvider(process.env.HF_API_TOKEN || "")
);

console.log("  (Paid providers -- user supplies own API key)");
console.log("  ○ OpenAI (ChatGPT)  -- user key required");
console.log("  ○ Anthropic (Claude) -- user key required");
console.log("  ○ DeepSeek           -- user key required");

// ─── Register model mappings ───

// Paid models (require user API key)
aiRouter.registerModel({
  modelId: "chatgpt",
  providerId: "openai",
  providerModelId: "gpt-4o",
  displayName: "ChatGPT (GPT-4o)",
});

aiRouter.registerModel({
  modelId: "claude",
  providerId: "anthropic",
  providerModelId: "claude-sonnet-4-20250514",
  displayName: "Claude (Sonnet 4)",
});

aiRouter.registerModel({
  modelId: "deepseek",
  providerId: "deepseek",
  providerModelId: "deepseek-chat",
  displayName: "DeepSeek Chat",
});

// Free models (server-side keys)
aiRouter.registerModel({
  modelId: "gemini",
  providerId: "google",
  providerModelId: "gemini-2.0-flash",
  displayName: "Gemini 2.0 Flash",
});

aiRouter.registerModel({
  modelId: "mixtral",
  providerId: "huggingface",
  providerModelId: "mistralai/Mixtral-8x7B-Instruct-v0.1",
  displayName: "Mixtral 8x7B (HF Free)",
});

aiRouter.registerModel({
  modelId: "codellama",
  providerId: "huggingface",
  providerModelId: "codellama/CodeLlama-34b-Instruct-hf",
  displayName: "CodeLlama 34B (HF Free)",
});

aiRouter.registerModel({
  modelId: "starcoder2",
  providerId: "huggingface",
  providerModelId: "bigcode/starcoder2-15b-instruct-v0.1",
  displayName: "StarCoder2 15B (HF Free)",
});

aiRouter.registerModel({
  modelId: "qwen-coder",
  providerId: "huggingface",
  providerModelId: "Qwen/Qwen2.5-Coder-7B-Instruct",
  displayName: "Qwen 2.5 Coder 7B (HF Free)",
});

aiRouter.registerModel({
  modelId: "phi3",
  providerId: "huggingface",
  providerModelId: "HuggingFaceTB/SmolLM3-3B",
  displayName: "SmolLM 3B (HF Free)",
});

aiRouter.registerModel({
  modelId: "llama3",
  providerId: "huggingface",
  providerModelId: "meta-llama/Llama-3.1-8B-Instruct",
  displayName: "Llama 3.1 8B (HF Free)",
});

aiRouter.registerModel({
  modelId: "mistral",
  providerId: "huggingface",
  providerModelId: "mistralai/Mistral-7B-Instruct-v0.3",
  displayName: "Mistral 7B (HF Free)",
});

// ─── Express App ───

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);

// ─── Routes ───

app.use("/api/chat", createChatRouter(aiRouter, keyStore));
app.use("/api/models", createModelsRouter(aiRouter));
app.use("/api/keys", createKeysRouter(keyStore));
app.use("/api/spotify", createSpotifyRouter(spotifyStore));

// Health check
app.get("/api/health", (_req, res) => {
  const models = aiRouter.getAvailableModels();
  res.json({
    status: "ok",
    providers: models.length,
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      available: m.available,
    })),
  });
});

// ─── Start Server ───

app.listen(PORT, () => {
  console.log(`\n🚀 flowstate server running on http://localhost:${PORT}`);
  console.log(`   Client URL: ${CLIENT_URL}`);

  const models = aiRouter.getAvailableModels();
  const free = models.filter((m) => m.available).length;
  const paid = models.filter((m) => !m.available).length;
  console.log(`   Free models: ${free} ready | Paid models: ${paid} (need user key)\n`);
});
