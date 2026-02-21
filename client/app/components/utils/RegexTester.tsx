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
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex gap-3 items-center shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs font-mono">Regex</label>
          <input
            type="text"
            value={regex}
            onChange={(e) => setRegex(e.target.value)}
            placeholder="[a-z]+"
            className="flex-1 min-w-[120px] rounded-md bg-bg-primary border border-border px-3 py-1.5 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs font-mono">Flags</label>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="g"
            className="w-16 rounded-md bg-bg-primary border border-border px-2 py-1.5 font-mono text-sm text-text-primary outline-none"
          />
        </div>
        <button
          type="button"
          onClick={runTest}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-sm hover:bg-bg-hover"
        >
          Test
        </button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <label className="text-text-muted text-xs font-mono">Test string</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={runTest}
          placeholder="Enter text to test against the regex"
          className="flex-1 min-h-[80px] w-full resize-none rounded-md bg-bg-primary border border-border p-3 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
      </div>
      <div className="shrink-0">
        {matchError && (
          <p className="text-error text-sm font-mono mb-2">{matchError}</p>
        )}
        <label className="text-text-muted text-xs font-mono block mb-1">Matches</label>
        <div className="rounded-md bg-bg-primary border border-border p-3 font-mono text-sm min-h-[60px]">
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
