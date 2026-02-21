"use client";

import { useState, useRef, useCallback, useEffect } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = (h % 360) / 360;
  s /= 100;
  v /= 100;
  let r = 0,
    g = 0,
    b = 0;
  if (s === 0) {
    r = g = b = v;
  } else {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      default:
        r = v;
        g = p;
        b = q;
    }
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  let rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return { c, m, y, k: k * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

const PICKER_SIZE = 220;
const HUE_HEIGHT = 12;

export function ColorConverter() {
  const [rgb, setRgb] = useState({ r: 50, g: 168, b: 113 });
  const [hsv, setHsv] = useState(() => rgbToHsv(50, 168, 113));
  const [hex, setHex] = useState(rgbToHex(50, 168, 113));
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  const updateFromRgb = useCallback((r: number, g: number, b: number) => {
    const rr = Math.round(Math.max(0, Math.min(255, r)));
    const gg = Math.round(Math.max(0, Math.min(255, g)));
    const bb = Math.round(Math.max(0, Math.min(255, b)));
    setRgb({ r: rr, g: gg, b: bb });
    setHsv(rgbToHsv(rr, gg, bb));
    setHex(rgbToHex(rr, gg, bb));
  }, []);

  const updateFromHsv = useCallback((h: number, s: number, v: number) => {
    const hh = ((h % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, s));
    const vv = Math.max(0, Math.min(100, v));
    setHsv({ h: hh, s: ss, v: vv });
    const out = hsvToRgb(hh, ss, vv);
    setRgb({ r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b) });
    setHex(rgbToHex(out.r, out.g, out.b));
  }, []);

  const handleSvMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const s = x * 100;
      const v = (1 - y) * 100;
      updateFromHsv(hsv.h, s, v);
    },
    [hsv.h, updateFromHsv]
  );

  const handleHueMove = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const h = x * 360;
      updateFromHsv(h, hsv.s, hsv.v);
    },
    [hsv.s, hsv.v, updateFromHsv]
  );

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e: MouseEvent) => {
      if (dragging === "sv") handleSvMove(e.clientX, e.clientY);
      else handleHueMove(e.clientX);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleSvMove, handleHueMove]);

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const hueColor = rgbToHex(...Object.values(hsvToRgb(hsv.h, 100, 100)));

  const validRgb = hexToRgb(hex);
  const effectiveHex = validRgb ? hex : rgbToHex(rgb.r, rgb.g, rgb.b);

  const onHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHex(v);
    const r = hexToRgb(v);
    if (r) updateFromRgb(r.r, r.g, r.b);
  };

  const copyHex = () => navigator.clipboard.writeText(effectiveHex);

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-text-primary">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-text-primary">Colour picker</h2>
        <button
          type="button"
          onClick={copyHex}
          className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-hover"
          title="Copy hex"
          aria-label="Copy hex"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      <div className="flex gap-4 shrink-0">
        <div
          className="rounded-lg border border-border shrink-0 overflow-hidden"
          style={{ width: PICKER_SIZE, height: PICKER_SIZE, backgroundColor: effectiveHex }}
          aria-hidden
        />
        <div className="relative shrink-0" style={{ width: PICKER_SIZE, height: PICKER_SIZE }}>
          <div
            ref={svRef}
            className="absolute inset-0 rounded-lg border border-border cursor-crosshair overflow-hidden"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setDragging("sv");
              handleSvMove(e.clientX, e.clientY);
            }}
          />
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
            style={{
              left: (hsv.s / 100) * PICKER_SIZE - 8,
              top: (1 - hsv.v / 100) * PICKER_SIZE - 8,
            }}
          />
        </div>
      </div>

      <div className="shrink-0" style={{ width: PICKER_SIZE }}>
        <label className="text-text-muted text-xs font-mono block mb-1.5">Hue</label>
        <div
          ref={hueRef}
          className="relative h-3 rounded-full border border-border cursor-pointer overflow-hidden"
          style={{
            width: PICKER_SIZE,
            background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging("hue");
            handleHueMove(e.clientX);
          }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
            style={{
              left: (hsv.h / 360) * PICKER_SIZE - 8,
              backgroundColor: hueColor,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 shrink-0">
        <div>
          <label className="text-text-muted text-xs font-mono block mb-1">HEX</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hex}
              onChange={onHexChange}
              className="flex-1 min-w-0 rounded-md bg-bg-primary border border-border px-2 py-1.5 font-mono text-sm text-text-primary outline-none"
            />
            <button
              type="button"
              onClick={copyHex}
              className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover shrink-0"
              title="Copy"
              aria-label="Copy"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <label className="text-text-muted text-xs font-mono block mb-1">RGB</label>
          <p className="font-mono text-sm text-text-secondary">
            {rgb.r}, {rgb.g}, {rgb.b}
          </p>
        </div>
        <div>
          <label className="text-text-muted text-xs font-mono block mb-1">CMYK</label>
          <p className="font-mono text-sm text-text-secondary">
            {Math.round(cmyk.c)}%, {Math.round(cmyk.m)}%, {Math.round(cmyk.y)}%, {Math.round(cmyk.k)}%
          </p>
        </div>
        <div>
          <label className="text-text-muted text-xs font-mono block mb-1">HSV</label>
          <p className="font-mono text-sm text-text-secondary">
            {Math.round(hsv.h)}°, {Math.round(hsv.s)}%, {Math.round(hsv.v)}%
          </p>
        </div>
        <div>
          <label className="text-text-muted text-xs font-mono block mb-1">HSL</label>
          <p className="font-mono text-sm text-text-secondary">
            {Math.round(hsl.h)}°, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%
          </p>
        </div>
      </div>

      {!validRgb && hex.trim() !== "" && (
        <p className="text-text-muted text-xs">Invalid hex; values from RGB.</p>
      )}
    </div>
  );
}
