"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";

const defaultSource = `# Hello

**Bold** and *italic* text.

- List item 1
- List item 2

\`\`\`js
console.log("code block");
\`\`\`

[Link](https://flowstate.dev)
`;

export function MarkdownPreview() {
  const [source, setSource] = useState(defaultSource);

  const mdComponents = useMemo(
    () => ({
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-xl font-semibold text-text-primary mt-4 mb-2 first:mt-0">{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-lg font-semibold text-text-primary mt-3 mb-2">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-base font-medium text-text-primary mt-2 mb-1">{children}</h3>
      ),
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="text-text-secondary text-sm my-2">{children}</p>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc list-inside text-text-secondary text-sm my-2 space-y-1">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal list-inside text-text-secondary text-sm my-2 space-y-1">{children}</ol>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-4 border-border pl-4 my-2 text-text-muted text-sm italic">
          {children}
        </blockquote>
      ),
      code: ({
        className,
        children,
        ...props
      }: {
        className?: string;
        children?: React.ReactNode;
        node?: unknown;
        inline?: boolean;
      }) => {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");
        if (match) {
          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: "0.5rem 0",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                background: "var(--bg-tertiary)",
              }}
              codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
              showLineNumbers={codeString.split("\n").length > 5}
            >
              {codeString}
            </SyntaxHighlighter>
          );
        }
        return (
          <code
            className="bg-bg-tertiary rounded px-1.5 py-0.5 text-text-primary font-mono text-xs"
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }: { children?: React.ReactNode }) => (
        <div className="my-0 [&>pre]:my-0 [&>div]:my-0">{children}</div>
      ),
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {children}
        </a>
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => (
        <thead className="bg-bg-tertiary">{children}</thead>
      ),
      tbody: ({ children }: { children?: React.ReactNode }) => (
        <tbody className="bg-bg-secondary">{children}</tbody>
      ),
      tr: ({ children }: { children?: React.ReactNode }) => (
        <tr className="border-b border-border last:border-b-0">{children}</tr>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border border-border px-3 py-2 text-left text-sm font-medium text-text-primary">
          {children}
        </th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border border-border px-3 py-2 text-sm text-text-secondary">{children}</td>
      ),
    }),
    []
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        <label className="px-3 py-2 text-text-muted text-xs font-mono border-b border-border bg-bg-tertiary/50">
          Markdown
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="flex-1 w-full resize-none bg-bg-primary p-4 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
          placeholder="# Your markdown..."
          spellCheck={false}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-auto bg-bg-primary">
        <label className="px-3 py-2 text-text-muted text-xs font-mono border-b border-border bg-bg-tertiary/50">
          Preview
        </label>
        <div
          className="flex-1 p-4 markdown-preview"
          style={{
            // Allow HTML from rehype-raw to render like GitHub README
            wordBreak: "break-word",
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={mdComponents}
          >
            {source}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
