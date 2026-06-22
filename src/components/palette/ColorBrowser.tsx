"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { getContrastColor } from "@/lib/utils";

interface ColorEntry {
  hex: string;
  paletteIds: string[];
  paletteNames: string[];
  hue: number;
  lightness: number;
}

interface ColorBrowserProps {
  colorIndex: ColorEntry[];
  onSelectColor: (hex: string) => void;
}

const HUE_BANDS = [
  { label: "Reds", min: 0, max: 30 },
  { label: "Oranges", min: 30, max: 60 },
  { label: "Yellows", min: 60, max: 90 },
  { label: "Yellow-Greens", min: 90, max: 150 },
  { label: "Greens", min: 150, max: 195 },
  { label: "Cyans", min: 195, max: 240 },
  { label: "Blues", min: 240, max: 285 },
  { label: "Purples", min: 285, max: 330 },
  { label: "Pinks", min: 330, max: 360 },
];

function getBand(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  for (const band of HUE_BANDS) {
    if (h >= band.min && h < band.max) return band.label;
  }
  return "Reds"; // 360 wraps to 0
}

export default function ColorBrowser({ colorIndex, onSelectColor }: ColorBrowserProps) {
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Separate neutrals (low chroma) from chromatic colors
  const { neutrals, chromatics } = useMemo(() => {
    // We don't have chroma in colorIndex but we can approximate from hue variance
    // Use oklch approximation: if hex brightness is between 15-85% and it's near grey, it's neutral
    // Simpler: neutrals are colors where R, G, B are all within 30 of each other
    const neutrals: ColorEntry[] = [];
    const chromatics: ColorEntry[] = [];
    for (const c of colorIndex) {
      const hex = c.hex.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const range = Math.max(r, g, b) - Math.min(r, g, b);
      if (range < 28) {
        neutrals.push(c);
      } else {
        chromatics.push(c);
      }
    }
    return { neutrals: neutrals.sort((a, b) => a.lightness - b.lightness), chromatics };
  }, [colorIndex]);

  const bands = useMemo(() => {
    const bandMap = new Map<string, ColorEntry[]>();
    for (const band of HUE_BANDS) bandMap.set(band.label, []);
    for (const c of chromatics) {
      const label = getBand(c.hue);
      bandMap.get(label)?.push(c);
    }
    return HUE_BANDS.map((b) => ({ label: b.label, colors: bandMap.get(b.label) ?? [] })).filter((b) => b.colors.length > 0);
  }, [chromatics]);

  const handleCopy = (e: React.MouseEvent, hex: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 800);
  };

  const renderSwatch = (c: ColorEntry) => {
    const isHovered = hoveredHex === c.hex;
    const isCopied = copiedHex === c.hex;
    const fg = getContrastColor(c.hex);
    const count = c.paletteIds.length;

    return (
      <motion.div
        key={c.hex}
        layout
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        title={`${c.hex.toUpperCase()} — in ${count} palette${count !== 1 ? "s" : ""}: ${c.paletteNames.slice(0, 3).join(", ")}${count > 3 ? ` +${count - 3} more` : ""}`}
        style={{ backgroundColor: c.hex }}
        className="relative rounded-[var(--radius-sm)] cursor-pointer transition-transform hover:scale-105 hover:z-10 hover:shadow-md"
        onMouseEnter={() => setHoveredHex(c.hex)}
        onMouseLeave={() => setHoveredHex(null)}
        onClick={() => onSelectColor(c.hex)}
      >
        {/* 48x48 square */}
        <div className="w-full" style={{ paddingBottom: "100%" }} />

        {/* Count badge — shows when there are multiple palettes */}
        {count > 1 && !isHovered && (
          <div
            className="absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none px-[3px] py-[2px] rounded-[2px]"
            style={{
              backgroundColor: fg === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.55)",
              color: fg,
            }}
          >
            {count}
          </div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-0.5 p-0.5"
            style={{ backgroundColor: fg === "#fafaf8" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.72)" }}
          >
            <span
              className="text-[8px] font-mono font-bold leading-none"
              style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }}
            >
              {c.hex.slice(1).toUpperCase()}
            </span>
            <button
              className="flex items-center justify-center w-5 h-5 rounded"
              style={{ backgroundColor: fg === "#fafaf8" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}
              onClick={(e) => handleCopy(e, c.hex)}
              title="Copy hex"
            >
              {isCopied
                ? <Check size={9} style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }} />
                : <Copy size={9} style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }} />
              }
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  if (colorIndex.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-[var(--muted)]">No colors in the current view</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <p className="text-xs text-[var(--muted)]">
          {colorIndex.length} unique color{colorIndex.length !== 1 ? "s" : ""} — click any swatch to find palettes that contain it
        </p>
      </div>

      {bands.map((band) => (
        <div key={band.label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">
              {band.label}
            </span>
            <span className="text-[10px] text-[var(--muted)]/60 tabular-nums">{band.colors.length}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
          >
            {band.colors.map(renderSwatch)}
          </div>
        </div>
      ))}

      {neutrals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">
              Neutrals
            </span>
            <span className="text-[10px] text-[var(--muted)]/60 tabular-nums">{neutrals.length}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
          >
            {neutrals.map(renderSwatch)}
          </div>
        </div>
      )}
    </div>
  );
}
