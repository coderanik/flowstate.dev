import { Router, type Request, type Response } from "express";
import type { AIRouter } from "../lib/router.js";

export function createModelsRouter(router: AIRouter): Router {
  const modelsRouter = Router();

  /**
   * GET /api/models
   * Returns all registered models and their availability status.
   */
  modelsRouter.get("/", (_req: Request, res: Response) => {
    const models = router.getAvailableModels();
    res.json({ models });
  });

  /**
   * GET /api/models/status
   * Returns rate limit status for all providers.
   */
  modelsRouter.get("/status", (_req: Request, res: Response) => {
    const rateLimits = router.getRateLimitStatus();
    const models = router.getAvailableModels();

    res.json({
      models,
      rateLimits,
    });
  });

  return modelsRouter;
}
