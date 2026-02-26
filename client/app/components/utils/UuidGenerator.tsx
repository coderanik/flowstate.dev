"use client";

import { useState, useCallback } from "react";

export function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(1);

  const generate = useCallback(() => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      list.push(crypto.randomUUID());
    }
    setUuids(list);
  }, [count]);

  const copyAll = useCallback(() => {
    if (uuids.length === 0) return;
    navigator.clipboard.writeText(uuids.join("\n"));
  }, [uuids]);

  return (
    <div className="flex flex-col min-h-full sm:h-full p-3 sm:p-4 gap-2 sm:gap-3">
      <div className="flex gap-2 shrink-0 items-center flex-wrap">
        <label className="text-text-secondary text-xs font-semibold">Count:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
          className="w-14 sm:w-16 rounded-md bg-bg-primary border border-border px-2 py-1.5 text-xs sm:text-sm text-text-primary outline-none"
        />
        <button
          type="button"
          onClick={generate}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
        >
          Generate
        </button>
        {uuids.length > 0 && (
          <button
            type="button"
            onClick={copyAll}
            className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
          >
            Copy all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm">
        {uuids.length === 0 ? (
          <p className="text-text-muted">Click Generate to create UUIDs.</p>
        ) : (
          <ul className="space-y-1">
            {uuids.map((id, i) => (
              <li key={i} className="text-text-secondary flex items-center gap-1 sm:gap-2">
                <span className="text-text-muted w-5 sm:w-6 shrink-0">{i + 1}.</span>
                <span className="break-all">{id}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(id)}
                  className="text-text-muted hover:text-text-primary shrink-0 text-xs"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
