"use client";

import { useState, useCallback } from "react";

export function JsonFormatter() {
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFormat = useCallback(() => {
    setError(null);
    if (!raw.trim()) {
      setFormatted("");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setFormatted(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setError((e as Error).message);
      setFormatted("");
    }
  }, [raw]);

  const handleMinify = useCallback(() => {
    setError(null);
    if (!raw.trim()) {
      setFormatted("");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setFormatted(JSON.stringify(parsed));
    } catch (e) {
      setError((e as Error).message);
      setFormatted("");
    }
  }, [raw]);

  return (
    <div className="flex flex-col min-h-full sm:h-full p-3 sm:p-4 gap-2 sm:gap-3">
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleFormat}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
        >
          Format
        </button>
        <button
          type="button"
          onClick={handleMinify}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
        >
          Minify
        </button>
      </div>
      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <label className="text-text-secondary text-xs font-mono font-semibold mb-1">Input JSON</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{"key": "value"}'
            className="flex-1 w-full min-h-[100px] resize-none rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <label className="text-text-secondary text-xs font-mono font-semibold mb-1">Output</label>
          <textarea
            readOnly
            value={error ?? formatted}
            placeholder="Formatted or minified JSON"
            className={`flex-1 w-full min-h-[100px] resize-none rounded-md border p-2 sm:p-3 font-mono text-xs sm:text-sm outline-none ${
              error
                ? "bg-error/10 border-error text-error"
                : "bg-bg-primary border-border text-text-primary"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
