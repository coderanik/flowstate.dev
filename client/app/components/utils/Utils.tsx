"use client";

import { useState } from "react";
import type { Tool } from "@/app/lib/types";
import { JsonFormatter } from "./JsonFormatter";
import { RegexTester } from "./RegexTester";
import { MarkdownPreview } from "./MarkdownPreview";
import { HashGenerator } from "./HashGenerator";
import { YamlJson } from "./YamlJson";
import { XmlFormatter } from "./XmlFormatter";
import { QrGenerator } from "./QrGenerator";
import { UuidGenerator } from "./UuidGenerator";
import { ColorConverter } from "./ColorConverter";

const TABS: { id: Tool["type"] extends "util" ? Tool["name"] : never; label: string }[] = [
  { id: "json-formatter", label: "JSON Formatter" },
  { id: "regex-tester", label: "Regex Tester" },
  { id: "markdown-preview", label: "Markdown Preview" },
  { id: "hash-generator", label: "Hash Generator" },
  { id: "yaml-json", label: "YAML ↔ JSON" },
  { id: "xml-formatter", label: "XML Formatter" },
  { id: "qr-generator", label: "QR Code" },
  { id: "uuid-generator", label: "UUID Generator" },
  { id: "color-converter", label: "Color Picker" },
];

export function Utils({ initialTool }: { initialTool: Tool["type"] extends "util" ? Tool["name"] : never }) {
  const [active, setActive] = useState(initialTool);

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <div className="flex gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-border bg-bg-tertiary shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
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
        {active === "hash-generator" && <HashGenerator />}
        {active === "yaml-json" && <YamlJson />}
        {active === "xml-formatter" && <XmlFormatter />}
        {active === "qr-generator" && <QrGenerator />}
        {active === "uuid-generator" && <UuidGenerator />}
        {active === "color-converter" && <ColorConverter />}
      </div>
    </div>
  );
}
