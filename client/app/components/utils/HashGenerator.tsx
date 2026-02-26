"use client";

import { useState, useCallback } from "react";

async function hashText(algorithm: "SHA-256" | "SHA-384" | "SHA-512", text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function HashGenerator() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const runHash = useCallback(async () => {
    setError(null);
    setResults({});
    if (!input.trim()) return;
    try {
      const [sha256, sha384, sha512] = await Promise.all([
        hashText("SHA-256", input),
        hashText("SHA-384", input),
        hashText("SHA-512", input),
      ]);
      setResults({ "SHA-256": sha256, "SHA-384": sha384, "SHA-512": sha512 });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  return (
    <div className="flex flex-col min-h-full sm:h-full p-3 sm:p-4 gap-2 sm:gap-3">
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={runHash}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
        >
          Generate hash
        </button>
      </div>
      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <label className="text-text-secondary text-xs font-mono font-semibold mb-1">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to hash..."
            className="flex-1 min-h-[80px] sm:min-h-[100px] w-full resize-none rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <label className="text-text-secondary text-xs font-mono font-semibold mb-1">Hashes (SHA-256, SHA-384, SHA-512)</label>
          <div className="flex-1 rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm overflow-auto">
            {error && <p className="text-error text-sm">{error}</p>}
            {Object.entries(results).map(([algo, hash]) => (
              <div key={algo} className="mb-2">
                <span className="text-text-muted text-xs">{algo}:</span>
                <p className="text-text-secondary break-all mt-0.5">{hash}</p>
              </div>
            ))}
            {!error && Object.keys(results).length === 0 && (
              <p className="text-text-muted">Output will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
