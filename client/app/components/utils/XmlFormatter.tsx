"use client";

import { useState, useCallback } from "react";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parser = new XMLParser({ ignoreDeclaration: true, removeNSPrefix: true });
const builder = new XMLBuilder({ indentBy: "  ", format: true });

export function XmlFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatXml = useCallback(() => {
    setError(null);
    setOutput("");
    if (!input.trim()) return;
    try {
      const parsed = parser.parse(input);
      setOutput(builder.build(parsed));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  const validateOnly = useCallback(() => {
    setError(null);
    setOutput("");
    if (!input.trim()) return;
    try {
      parser.parse(input);
      setOutput("Valid XML.");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={formatXml}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-sm hover:bg-bg-hover"
        >
          Format
        </button>
        <button
          type="button"
          onClick={validateOnly}
          className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-sm hover:bg-bg-hover"
        >
          Validate
        </button>
      </div>
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-text-muted text-xs font-mono mb-1">XML input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="<root><item>...</item></root>"
            className="flex-1 min-h-[120px] w-full resize-none rounded-md bg-bg-primary border border-border p-3 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-text-muted text-xs font-mono mb-1">Output</label>
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
