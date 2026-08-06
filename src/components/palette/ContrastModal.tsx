"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Filter } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import { getContrastRatio, getContrastColor } from "@/lib/utils";

interface ContrastModalProps {
  palette: Palette | null;
  onClose: () => void;
}

type TierKey = "AAA" | "AA" | "AL" | "fail";

const TIER_META: Record<TierKey, { label: string; fullLabel: string; chipBg: string; chipText: string }> = {
  AAA:  { label: "AAA",      fullLabel: "AAA (≥7:1)",        chipBg: "#d1fae5", chipText: "#065f46" },
  AA:   { label: "AA",       fullLabel: "AA (≥4.5:1)",       chipBg: "#e0f2fe", chipText: "#0c4a6e" },
  AL:   { label: "AA L",     fullLabel: "AA Large (≥3:1)",   chipBg: "#fef3c7", chipText: "#78350f" },
  fail: { label: "Fail",     fullLabel: "Fail (<3:1)",        chipBg: "#fee2e2", chipText: "#991b1b" },
};

function getTier(ratio: number): TierKey {
  if (ratio >= 7)   return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3)   return "AL";
  return "fail";
}

function buildMarkdown(palette: Palette): string {
  const colors = palette.colors;
  const label = (c: (typeof colors)[0]) =>
    c.name ? `${c.name} (${c.hex.toUpperCase()})` : c.hex.toUpperCase();
  const headers = ["Bg ╲ Fg", ...colors.map(label)];
  const sep = headers.map(() => "---");
  const rows = colors.map((bg) => {
    const cells = colors.map((fg) => {
      if (bg.hex.toLowerCase() === fg.hex.toLowerCase()) return "—";
      const ratio = getContrastRatio(bg.hex, fg.hex);
      const tier = getTier(ratio);
      return `${ratio.toFixed(1)} ${TIER_META[tier].fullLabel}`;
    });
    return [label(bg), ...cells];
  });
  return [headers, sep, ...rows].map((r) => `| ${r.join(" | ")} |`).join("\n");
}

function buildFilteredMarkdown(palette: Palette): string {
  const colors = palette.colors;
  const label = (c: (typeof colors)[0]) =>
    c.name ? `${c.name} (${c.hex.toUpperCase()})` : c.hex.toUpperCase();

  const problemPairs: { bg: (typeof colors)[0]; fg: (typeof colors)[0]; ratio: number; tier: TierKey }[] = [];
  for (const bg of colors) {
    for (const fg of colors) {
      if (bg.hex.toLowerCase() === fg.hex.toLowerCase()) continue;
      const ratio = getContrastRatio(bg.hex, fg.hex);
      const tier = getTier(ratio);
      if (tier === "AL" || tier === "fail") {
        problemPairs.push({ bg, fg, ratio, tier });
      }
    }
  }

  if (problemPairs.length === 0) {
    return `## Contrast Problems — ${palette.name}\n\n_All pairs pass WCAG 2.1 (minimum AA Large / 3:1)._`;
  }

  const headers = ["Background", "Foreground", "Ratio", "WCAG Level"];
  const sep = headers.map(() => "---");
  const rows = problemPairs.map(({ bg, fg, ratio, tier }) => [
    label(bg),
    label(fg),
    `${ratio.toFixed(2)}:1`,
    TIER_META[tier].fullLabel,
  ]);
  const title = `## Contrast Problems — ${palette.name}\n\n`;
  return title + [headers, sep, ...rows].map((r) => `| ${r.join(" | ")} |`).join("\n");
}

export default function ContrastModal({ palette, onClose }: ContrastModalProps) {
  const [copied, setCopied] = useState(false);
  const [showProblemsOnly, setShowProblemsOnly] = useState(false);

  if (!palette || palette.colors.length < 2) return null;

  const colors = palette.colors;
  const n = colors.length;

  // Pre-compute all contrast ratios
  const ratios: number[][] = colors.map((bg) =>
    colors.map((fg) => getContrastRatio(bg.hex, fg.hex))
  );

  // Count ordered pairs (bg, fg) — excludes diagonal self-pairs
  let aaaCount = 0, aaCount = 0, alCount = 0, failCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const tier = getTier(ratios[i][j]);
      if (tier === "AAA") aaaCount++;
      else if (tier === "AA") aaCount++;
      else if (tier === "AL") alCount++;
      else failCount++;
    }
  }
  const totalPairs = n * (n - 1);

  // Adaptive cell size based on number of colors
  const cellSize = n <= 4 ? 62 : n <= 5 ? 56 : n <= 6 ? 50 : n <= 7 ? 44 : 38;
  const headerSwatchSize = 18;
  const demoFontSize = n <= 5 ? 14 : n <= 7 ? 12 : 11;
  const ratioFontSize = n <= 5 ? 8.5 : 8;
  const tierFontSize = n <= 5 ? 7 : 6.5;

  const handleCopy = async () => {
    const md = showProblemsOnly ? buildFilteredMarkdown(palette) : buildMarkdown(palette);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-2xl shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Swatch header strip */}
          <div className="flex h-10">
            {colors.map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
            ))}
          </div>

          <div className="p-5">
            {/* Title row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">{palette.name}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Contrast matrix — all pairwise WCAG 2.1 ratios · row = background · column = foreground
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={14} />
              </Button>
            </div>

            {/* Summary chips */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-[11px] text-[var(--muted)]">
                {totalPairs} pair{totalPairs !== 1 ? "s" : ""}
              </span>
              {([
                { key: "AAA" as TierKey, count: aaaCount },
                { key: "AA"  as TierKey, count: aaCount  },
                { key: "AL"  as TierKey, count: alCount  },
                { key: "fail" as TierKey, count: failCount },
              ]).filter(({ count }) => count > 0).map(({ key, count }) => {
                const isPassing = key === "AAA" || key === "AA";
                const dimmed = showProblemsOnly && isPassing;
                return (
                  <span
                    key={key}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-opacity duration-150"
                    style={{
                      backgroundColor: TIER_META[key].chipBg,
                      color: TIER_META[key].chipText,
                      opacity: dimmed ? 0.35 : 1,
                    }}
                  >
                    {count} {TIER_META[key].label}
                  </span>
                );
              })}
              {showProblemsOnly && (alCount + failCount === 0) && (
                <span className="text-[11px] text-emerald-600 font-medium">All pairs pass ✓</span>
              )}
            </div>

            {/* Matrix grid */}
            <div className="overflow-x-auto -mx-1 px-1">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${headerSwatchSize}px repeat(${n}, ${cellSize}px)`,
                  gap: 3,
                  width: "fit-content",
                }}
              >
                {/* Corner + column headers */}
                <div />
                {colors.map((c, j) => (
                  <div
                    key={`ch-${j}`}
                    className="flex flex-col items-center gap-0.5 pb-1.5"
                    title={c.name ? `${c.name} — ${c.hex}` : c.hex}
                  >
                    <div
                      className="rounded-[3px] border border-black/10 flex-shrink-0"
                      style={{ width: headerSwatchSize, height: headerSwatchSize, backgroundColor: c.hex }}
                    />
                    <span
                      className="leading-none text-center"
                      style={{
                        fontSize: 7,
                        color: "var(--muted)",
                        maxWidth: cellSize,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                        fontFamily: "monospace",
                      }}
                    >
                      {c.name ?? c.hex.slice(1).toUpperCase()}
                    </span>
                  </div>
                ))}

                {/* Data rows */}
                {colors.map((bg, i) => (
                  <React.Fragment key={`row-${i}`}>
                    {/* Row header */}
                    <div
                      className="flex flex-col items-center gap-0.5 pr-1"
                      title={bg.name ? `${bg.name} — ${bg.hex}` : bg.hex}
                    >
                      <div
                        className="rounded-[3px] border border-black/10 flex-shrink-0"
                        style={{ width: headerSwatchSize, height: headerSwatchSize, backgroundColor: bg.hex }}
                      />
                      <span
                        className="leading-none text-center"
                        style={{
                          fontSize: 7,
                          color: "var(--muted)",
                          maxWidth: headerSwatchSize,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          fontFamily: "monospace",
                        }}
                      >
                        {bg.name ?? bg.hex.slice(1).toUpperCase()}
                      </span>
                    </div>

                    {/* Cells */}
                    {colors.map((fg, j) => {
                      if (i === j) {
                        return (
                          <div
                            key={`cell-${i}-${j}`}
                            className="rounded-[5px] flex items-center justify-center"
                            style={{
                              backgroundColor: bg.hex,
                              width: cellSize,
                              height: cellSize,
                              border: `1px solid ${getContrastColor(bg.hex) === "#fafaf8" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                            }}
                            title="Same color — contrast undefined"
                          >
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                opacity: 0.18,
                                color: getContrastColor(bg.hex),
                                userSelect: "none",
                              }}
                            >
                              —
                            </span>
                          </div>
                        );
                      }

                      const ratio = ratios[i][j];
                      const tier = getTier(ratio);
                      const isPassing = tier === "AAA" || tier === "AA";

                      // When filtering to problems only, dim passing cells
                      if (showProblemsOnly && isPassing) {
                        return (
                          <div
                            key={`cell-${i}-${j}`}
                            className="rounded-[5px] flex items-center justify-center transition-opacity duration-150"
                            style={{
                              backgroundColor: "var(--surface-raised, var(--surface))",
                              width: cellSize,
                              height: cellSize,
                              border: "1px solid var(--border)",
                              opacity: 0.28,
                            }}
                            title={`${bg.hex} bg · ${fg.hex} fg · ${ratio.toFixed(2)}:1 · ${TIER_META[tier].fullLabel} — passing`}
                          >
                            <span style={{ fontSize: 9, color: "var(--muted)", userSelect: "none" }}>✓</span>
                          </div>
                        );
                      }

                      // bg color for the chip — semi-transparent so the bg swatch shows through
                      const chipBgStyle = getContrastColor(bg.hex) === "#fafaf8"
                        ? "rgba(0,0,0,0.32)"
                        : "rgba(255,255,255,0.52)";
                      const chipTextStyle = getContrastColor(bg.hex);

                      // In problems-only mode, highlight AL/fail cells with a colored ring
                      const problemsBorder = showProblemsOnly
                        ? `2px solid ${tier === "fail" ? "#ef4444" : "#f59e0b"}`
                        : `1px solid ${getContrastColor(bg.hex) === "#fafaf8" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)"}`;

                      return (
                        <div
                          key={`cell-${i}-${j}`}
                          className="rounded-[5px] flex flex-col items-center justify-center gap-[2px] select-none cursor-default transition-all duration-150"
                          style={{
                            backgroundColor: bg.hex,
                            width: cellSize,
                            height: cellSize,
                            border: problemsBorder,
                          }}
                          title={`${bg.hex} bg · ${fg.hex} fg · ${ratio.toFixed(2)}:1 · WCAG ${TIER_META[tier].fullLabel}`}
                        >
                          {/* The "Aa" demo — fg color on bg color, THIS is the contrast preview */}
                          <span
                            style={{
                              color: fg.hex,
                              fontSize: demoFontSize,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            Aa
                          </span>
                          {/* Ratio + tier — always readable (uses contrast-aware color) */}
                          <div
                            className="flex flex-col items-center gap-[1px] rounded-[3px] px-[3px] py-[1.5px]"
                            style={{ backgroundColor: chipBgStyle }}
                          >
                            <span
                              style={{
                                color: chipTextStyle,
                                fontSize: ratioFontSize,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                lineHeight: 1,
                              }}
                            >
                              {ratio.toFixed(1)}
                            </span>
                            <span
                              style={{
                                color: chipTextStyle,
                                fontSize: tierFontSize,
                                fontWeight: 700,
                                lineHeight: 1,
                                opacity: 0.8,
                              }}
                            >
                              {TIER_META[tier].label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Legend + actions row */}
            <div className="mt-4 flex items-start gap-3 justify-between">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {(["AAA", "AA", "AL", "fail"] as TierKey[]).map((key) => {
                  const isPassing = key === "AAA" || key === "AA";
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 transition-opacity duration-150"
                      style={{ opacity: showProblemsOnly && isPassing ? 0.4 : 1 }}
                    >
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold"
                        style={{ backgroundColor: TIER_META[key].chipBg, color: TIER_META[key].chipText }}
                      >
                        {TIER_META[key].label}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {key === "AAA" ? "≥7:1" : key === "AA" ? "≥4.5:1" : key === "AL" ? "≥3:1 large text" : "<3:1"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setShowProblemsOnly((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-[11px] font-medium transition-colors"
                  style={{
                    borderColor: showProblemsOnly ? "#ef4444" : "var(--border)",
                    color: showProblemsOnly ? "#ef4444" : "var(--muted)",
                    backgroundColor: showProblemsOnly ? "#fef2f2" : "transparent",
                  }}
                  title={showProblemsOnly ? "Show all pairs" : "Show only AL and Fail pairs"}
                >
                  <Filter size={11} />
                  {showProblemsOnly ? "Problems only" : "All pairs"}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-[11px] font-medium transition-colors"
                  style={{
                    borderColor: showProblemsOnly ? "#f59e0b" : "var(--border)",
                    color: showProblemsOnly ? "#92400e" : "var(--muted)",
                    backgroundColor: showProblemsOnly ? "#fffbeb" : "transparent",
                  }}
                  title={
                    showProblemsOnly
                      ? "Copy AL & Fail pairs as Markdown table (filtered)"
                      : "Copy full contrast matrix as Markdown table"
                  }
                >
                  {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copied ? "Copied!" : showProblemsOnly ? "Copy filtered MD" : "Copy MD"}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-[var(--muted)] mt-3 leading-relaxed">
              WCAG 2.1 contrast ratios. The &ldquo;Aa&rdquo; in each cell shows how the foreground color (column) actually reads on the background (row). The ratio chip is always legible — it uses a contrast-aware overlay, not the pair itself. AL = AA Large, minimum for large text (18pt / 14pt bold) and UI components.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
