import { Router, type Request, type Response } from "express";

const JUDGE0_BASE = process.env.JUDGE0_API_URL || "https://ce.judge0.com";
const JUDGE0_AUTH = process.env.JUDGE0_AUTH_TOKEN || "";
const RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY || "";
const RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
const POLL_INTERVAL_MS = 500;
const POLL_MAX_ATTEMPTS = 60; // 30s total
const RUN_TIMEOUT_SEC = 10;

/** Judge0 CE language_id: Python 3, Java, C (GCC 9.2), C++ (GCC 9.2) */
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  java: 62,
  c: 50,
  cpp: 54,
};

function judge0Headers(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (RAPIDAPI_KEY && RAPIDAPI_HOST) {
    headers["X-RapidAPI-Key"] = RAPIDAPI_KEY;
    headers["X-RapidAPI-Host"] = RAPIDAPI_HOST;
  } else if (JUDGE0_AUTH) {
    headers["X-Auth-Token"] = JUDGE0_AUTH;
  }
  return headers;
}

/** Status 1 = In Queue, 2 = Processing; others = terminal */
function isPending(statusId: number): boolean {
  return statusId === 1 || statusId === 2;
}

function mapStatusToErrorType(statusId: number, description: string): string | null {
  if (statusId === 3) return null; // Accepted
  if (statusId === 6) return "Compilation Error";
  if (statusId >= 7 && statusId <= 12) return "RuntimeError";
  if (statusId === 5) return "TimeLimitExceeded";
  if (statusId === 13) return "InternalError";
  if (statusId === 14) return "ExecFormatError";
  return description || "Error";
}

export function createRunRouter(): Router {
  const router = Router();

  /**
   * POST /api/run
   * Body: { language: "python" | "java" | "c" | "cpp", code: string }
   * Uses Judge0 API: create submission, poll until done, return stdout/stderr/error.
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { language: langId, code } = req.body as {
        language?: string;
        code?: string;
      };

      if (!langId || typeof code !== "string") {
        res.status(400).json({
          error: "Missing language or code",
          errorType: "BadRequest",
        });
        return;
      }

      const languageId = JUDGE0_LANGUAGE_IDS[langId];
      if (languageId == null) {
        res.status(400).json({
          error: `Unsupported language: ${langId}. Use python, java, c, or cpp.`,
          errorType: "UnsupportedLanguage",
        });
        return;
      }

      const createRes = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`, {
        method: "POST",
        headers: judge0Headers(),
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: "",
          cpu_time_limit: RUN_TIMEOUT_SEC,
          wall_time_limit: RUN_TIMEOUT_SEC + 2,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        let message = errText;
        let errorType = "ServiceError";
        try {
          const parsed = JSON.parse(errText) as { error?: string; message?: string };
          const msg = parsed.error || parsed.message || "";
          if (msg.toLowerCase().includes("queue is full")) {
            errorType = "QueueFull";
            message = "Judge0 queue is full. Try again in a moment.";
          } else if (createRes.status === 401) {
            errorType = "AuthError";
            message = "Judge0 authentication failed. Check JUDGE0_AUTH_TOKEN or RapidAPI key.";
          }
        } catch {
          // use raw errText
        }
        res.status(502).json({ error: message, errorType });
        return;
      }

      const { token } = (await createRes.json()) as { token: string };
      if (!token) {
        res.status(502).json({
          error: "Judge0 did not return a submission token",
          errorType: "ServiceError",
        });
        return;
      }

      let last: {
        status_id: number;
        status?: { id: number; description: string };
        stdout: string | null;
        stderr: string | null;
        compile_output: string | null;
        message: string | null;
      } = { status_id: 1, stdout: null, stderr: null, compile_output: null, message: null };

      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const getRes = await fetch(
          `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`,
          { headers: judge0Headers() }
        );
        if (!getRes.ok) {
          res.status(502).json({
            error: `Judge0 get submission failed: ${await getRes.text()}`,
            errorType: "ServiceError",
          });
          return;
        }
        last = (await getRes.json()) as typeof last;
        const statusId = last.status?.id ?? last.status_id;
        if (!isPending(statusId)) break;
      }

      const statusId = last.status?.id ?? last.status_id;
      const description = last.status?.description ?? "";
      const toLines = (s: string | null) =>
        s?.trim().split(/\r?\n/).filter(Boolean) ?? [];
      const outputLines: string[] = [
        ...toLines(last.compile_output),
        ...toLines(last.stdout ?? ""),
        ...toLines(last.stderr ?? ""),
      ];
      if (last.message?.trim()) {
        outputLines.push(last.message.trim());
      }

      const errorType = mapStatusToErrorType(statusId, description);
      const compileFailed = statusId === 6;
      const runFailed = statusId >= 4 && statusId !== 6 && statusId !== 3;
      const errorMessage =
        compileFailed || runFailed
          ? [last.compile_output, last.stderr, last.message].filter(Boolean).join("\n").trim() ||
            description
          : null;

      res.json({
        stdout: last.stdout ?? "",
        stderr: last.stderr ?? "",
        compileStdout: "",
        compileStderr: last.compile_output ?? "",
        output: outputLines.join("\n").trim() || null,
        outputLines,
        exitCode: runFailed ? 1 : 0,
        compileExitCode: compileFailed ? 1 : null,
        error: errorMessage,
        errorType: errorType ?? null,
      });
    } catch (err) {
      console.error("[run] error:", (err as Error).message);
      res.status(500).json({
        error: (err as Error).message,
        errorType: "ServerError",
      });
    }
  });

  return router;
}
