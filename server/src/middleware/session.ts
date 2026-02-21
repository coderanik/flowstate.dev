import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const SESSION_COOKIE = "fs_session";

/**
 * Simple session middleware.
 * Assigns a random session ID via cookie. No server-side session state
 * beyond what the KeyStore tracks.
 */
export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  let sessionId = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (!sessionId) {
    sessionId = randomBytes(24).toString("hex");
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );
  }

  // Attach to request for downstream handlers
  (req as SessionRequest).sessionId = sessionId;
  next();
}

export interface SessionRequest extends Request {
  sessionId: string;
}
