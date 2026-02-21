"use client";

import { useState, useCallback } from "react";
import yaml from "js-yaml";

type Mode = "yaml-to-json" | "json-to-yaml";

export function YamlJson() {
  const [mode, setMode] = useState<Mode>("yaml-to-json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(() => {
    setError(null);
    setOutput("");
    if (!input.trim()) return;
    try {
      if (mode === "yaml-to-json") {
        const obj = yaml.load(input);
        setOutput(JSON.stringify(obj, null, 2));
      } else {
        const obj = JSON.parse(input);
        setOutput(yaml.dump(obj, { indent: 2 }));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input, mode]);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex gap-2 shrink-0 items-center">
        <span className="text-text-muted text-xs">Convert:</span>
        <button
          type="button"
          onClick={() => setMode("yaml-to-json")}
          className={`px-3 py-1.5 rounded-md text-sm ${mode === "yaml-to-json" ? "bg-bg-hover text-text-primary" : "bg-bg-tertiary text-text-muted hover:text-text-secondary"}`}
        >
          YAML → JSON
        </button>
        <button
          type="button"
          onClick={() => setMode("json-to-yaml")}
          className={`px-3 py-1.5 rounded-md text-sm ${mode === "json-to-yaml" ? "bg-bg-hover text-text-primary" : "bg-bg-tertiary text-text-muted hover:text-text-secondary"}`}
        >
          JSON → YAML
        </button>
        <button
          type="button"
          onClick={convert}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-sm hover:bg-bg-hover"
        >
          Convert
        </button>
      </div>
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-text-muted text-xs font-mono mb-1">{mode === "yaml-to-json" ? "YAML" : "JSON"}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "yaml-to-json" ? "Paste YAML..." : "Paste JSON..."}
            className="flex-1 min-h-[120px] w-full resize-none rounded-md bg-bg-primary border border-border p-3 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-text-muted text-xs font-mono mb-1">{mode === "yaml-to-json" ? "JSON" : "YAML"}</label>
          <textarea
            readOnly
            value={error ?? output}
            className={`flex-1 min-h-[120px] w-full resize-none rounded-md border p-3 font-mono text-sm outline-none ${
              error ? "bg-error/10 border-error text-error" : "bg-bg-primary border-border text-text-primary"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
