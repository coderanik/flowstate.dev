"use client";

import { useState, useCallback } from "react";

export function RegexTester() {
  const [regex, setRegex] = useState("");
  const [input, setInput] = useState("");
  const [flags, setFlags] = useState("g");
  const [matches, setMatches] = useState<string[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);

  const runTest = useCallback(() => {
    setMatchError(null);
    setMatches([]);
    if (!regex.trim()) return;
    try {
      const re = new RegExp(regex, flags);
      const results: string[] = [];
      let m: RegExpExecArray | null;
      const re2 = new RegExp(regex, flags);
      while ((m = re2.exec(input)) !== null) {
        results.push(m[0]);
        if (!flags.includes("g")) break;
      }
      setMatches(results);
    } catch (e) {
      setMatchError((e as Error).message);
    }
  }, [regex, input, flags]);

  const highlight = useCallback(() => {
    if (!regex.trim() || matchError) return input;
    try {
      const re = new RegExp(regex, flags);
      return input.replace(re, (s) => `\u0000${s}\u0000`);
    } catch {
      return input;
    }
  }, [regex, input, flags, matchError]);

  const highlighted = highlight();
  const parts = highlighted.split("\u0000");

  return (
    <div className="flex flex-col min-h-full sm:h-full p-3 sm:p-4 gap-2 sm:gap-3">
      <div className="flex gap-2 sm:gap-3 items-center shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-text-secondary text-xs font-mono font-semibold">Regex</label>
          <input
            type="text"
            value={regex}
            onChange={(e) => setRegex(e.target.value)}
            placeholder="[a-z]+"
            className="flex-1 min-w-[80px] sm:min-w-[120px] rounded-md bg-bg-primary border border-border px-2 sm:px-3 py-1.5 font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-secondary text-xs font-mono font-semibold">Flags</label>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="g"
            className="w-12 sm:w-16 rounded-md bg-bg-primary border border-border px-2 py-1.5 font-mono text-xs sm:text-sm text-text-primary outline-none"
          />
        </div>
        <button
          type="button"
          onClick={runTest}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-xs sm:text-sm hover:bg-bg-hover"
        >
          Test
        </button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <label className="text-text-secondary text-xs font-mono font-semibold">Test string</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={runTest}
          placeholder="Enter text to test against the regex"
          className="flex-1 min-h-[60px] sm:min-h-[80px] w-full resize-none rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
      </div>
      <div className="shrink-0">
        {matchError && (
          <p className="text-error text-xs sm:text-sm font-mono mb-2">{matchError}</p>
        )}
        <label className="text-text-secondary text-xs font-mono font-semibold block mb-1">Matches</label>
        <div className="rounded-md bg-bg-primary border border-border p-2 sm:p-3 font-mono text-xs sm:text-sm min-h-[40px] sm:min-h-[60px]">
          {parts.length > 1 ? (
            <p className="text-text-primary break-words">
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <mark key={i} className="bg-accent/30 text-text-primary rounded px-0.5">
                    {part}
                  </mark>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          ) : matches.length > 0 ? (
            <ul className="list-disc list-inside text-text-secondary space-y-1">
              {matches.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <span className="text-text-muted">No matches</span>
          )}
        </div>
      </div>
    </div>
  );
}
