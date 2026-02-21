"use client";

import { useState, useCallback, useEffect } from "react";
import QRCode from "qrcode";

export function QrGenerator() {
  const [input, setInput] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    setDataUrl(null);
    if (!input.trim()) return;
    try {
      const url = await QRCode.toDataURL(input, { width: 256, margin: 2 });
      setDataUrl(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  useEffect(() => {
    if (input.trim()) {
      const t = setTimeout(generate, 400);
      return () => clearTimeout(t);
    } else {
      setDataUrl(null);
      setError(null);
    }
  }, [input, generate]);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-text-muted text-xs font-mono mb-1">Text or URL</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text or URL to encode as QR code"
            className="flex-1 min-h-[120px] w-full resize-none rounded-md bg-bg-primary border border-border p-3 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {error && <p className="text-error text-sm mt-2">{error}</p>}
        </div>
        <div className="flex flex-col items-center justify-start gap-2">
          <label className="text-text-muted text-xs font-mono">QR Code</label>
          <div className="rounded-lg bg-white p-3 flex items-center justify-center min-w-[256px] min-h-[256px]">
            {dataUrl ? (
              <img src={dataUrl} alt="QR code" className="max-w-full h-auto" />
            ) : (
              <span className="text-text-muted text-sm">Enter text to generate</span>
            )}
          </div>
          {dataUrl && (
            <a
              href={dataUrl}
              download="qrcode.png"
              className="px-3 py-1.5 rounded-md bg-bg-tertiary text-text-primary text-sm hover:bg-bg-hover no-underline"
            >
              Download PNG
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
