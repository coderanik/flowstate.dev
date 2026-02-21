"use client";

import { useState } from "react";
import type { Tool } from "@/app/lib/types";
import { JsonFormatter } from "./JsonFormatter";
import { RegexTester } from "./RegexTester";
import { MarkdownPreview } from "./MarkdownPreview";

const TABS: { id: Tool["type"] extends "util" ? Tool["name"] : never; label: string }[] = [
  { id: "json-formatter", label: "JSON Formatter" },
  { id: "regex-tester", label: "Regex Tester" },
  { id: "markdown-preview", label: "Markdown Preview" },
];

export function Utils({ initialTool }: { initialTool: "json-formatter" | "regex-tester" | "markdown-preview" }) {
  const [active, setActive] = useState(initialTool);

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <div className="flex gap-1 px-3 py-2 border-b border-border bg-bg-tertiary shrink-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active === id
                ? "bg-bg-primary text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {active === "json-formatter" && <JsonFormatter />}
        {active === "regex-tester" && <RegexTester />}
        {active === "markdown-preview" && <MarkdownPreview />}
      </div>
    </div>
  );
}
