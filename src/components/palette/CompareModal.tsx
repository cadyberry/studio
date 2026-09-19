"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeftRight, ArrowRight, Check, Copy, Download } from "lucide-react";
import { deltaE } from "@/lib/utils";
import type { Palette } from "@/types";

interface ComparePair {
  hexA: string;
  nameA?: string;
  hexB: string;
  nameB?: string;
  dE: number;
}

function getMatchTier(dE: number): { bg: string; text: string; label: string } {
  if (dE < 5)  return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "excellent" };
  if (dE < 10) return { bg: "bg-sky-100 dark:bg-sky-900/30",         text: "text-sky-700 dark:text-sky-400",         label: "good"      };
  if (dE < 15) return { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-400",     label: "fair"      };
  return               { bg: "bg-rose-100 dark:bg-rose-900/30",      text: "text-rose-700 dark:text-rose-400",       label: "loose"     };
}

interface CompareModalProps {
  paletteA: Palette | null;
  paletteB: Palette | null;
  onClose: () => void;
}

export default function CompareModal({ paletteA, paletteB, onClose }: CompareModalProps) {
  const open = !!(paletteA && paletteB);
  const [swapped, setSwapped] = useState(false);
  const [showDirTip, setShowDirTip] = useState(false);
  const [showCoverageTip, setShowCoverageTip] = useState(false);
  const [showSwapTip, setShowSwapTip] = useState(false);
  const [hoveredPairIdx, setHoveredPairIdx] = useState<number | null>(null);
  const [hoveredStripInfo, setHoveredStripInfo] = useState<{ pairIdx: number } | null>(null);
  const [copiedInfo, setCopiedInfo] = useState<{ pairIdx: number; side: "A" | "B" } | null>(null);
  const [copiedTextInfo, setCopiedTextInfo] = useState<{ pairIdx: number; side: "A" | "B" } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copyAllFormat, setCopyAllFormat] = useState<"text" | "json" | "csv">("text");

  const [keyboardPairIdx, setKeyboardPairIdx] = useState<number | null>(null);
  const [copiedKeyboardPairIdx, setCopiedKeyboardPairIdx] = useState<number | null>(null);

  const pairsScrollRef = useRef<HTMLDivElement | null>(null);
  const pairRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // When a strip swatch is hovered, scroll its pair row into view within the pairs container.
  // Uses getBoundingClientRect so the sticky header height (~38px) is automatically accounted for.
  useEffect(() => {
    if (hoveredStripInfo === null) return;
    const container = pairsScrollRef.current;
    const row = pairRowRefs.current[hoveredStripInfo.pairIdx];
    if (!container || !row) return;
    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const STICKY_H = 38;
    if (rowRect.top < containerRect.top + STICKY_H) {
      container.scrollBy({ top: rowRect.top - containerRect.top - STICKY_H - 8, behavior: "smooth" });
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollBy({ top: rowRect.bottom - containerRect.bottom + 8, behavior: "smooth" });
    }
  }, [hoveredStripInfo]);

  const copyHex = (hex: string, pairIdx: number, side: "A" | "B") => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopiedInfo({ pairIdx, side });
    setTimeout(() => setCopiedInfo(null), 1500);
  };

  const copyHexText = (hex: string, pairIdx: number, side: "A" | "B") => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopiedTextInfo({ pairIdx, side });
    setTimeout(() => setCopiedTextInfo(null), 1500);
  };

  const copyAll = () => {
    let text: string;
    if (copyAllFormat === "json") {
      text = JSON.stringify(pairs.map((p) => ({ hexA: p.hexA, hexB: p.hexB, dE: p.dE })), null, 2);
    } else if (copyAllFormat === "csv") {
      const rows = pairs.map((p) => `${p.hexA},${p.hexB},${p.dE}`);
      text = ["hexA,hexB,dE", ...rows].join("\n");
    } else {
      text = pairs.map((p) => `${p.hexA} → ${p.hexB} (ΔE ${p.dE})`).join("\n");
    }
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const downloadAll = () => {
    let content: string;
    let ext: string;
    let mime: string;
    if (copyAllFormat === "json") {
      content = JSON.stringify(pairs.map((p) => ({ hexA: p.hexA, hexB: p.hexB, dE: p.dE })), null, 2);
      ext = "json"; mime = "application/json";
    } else if (copyAllFormat === "csv") {
      content = ["hexA,hexB,dE", ...pairs.map((p) => `${p.hexA},${p.hexB},${p.dE}`)].join("\n");
      ext = "csv"; mime = "text/csv";
    } else {
      content = pairs.map((p) => `${p.hexA} → ${p.hexB} (ΔE ${p.dE})`).join("\n");
      ext = "txt"; mime = "text/plain";
    }
    const safe = (s: string) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${safe(effectiveA!.name)}_vs_${safe(effectiveB!.name)}.${ext}`;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  // Reset on open and on swap
  useEffect(() => {
    if (open) { setSwapped(false); setHoveredPairIdx(null); setHoveredStripInfo(null); setCopiedInfo(null); setCopiedTextInfo(null); setCopiedAll(false); setDownloaded(false); setKeyboardPairIdx(null); setCopiedKeyboardPairIdx(null); }
  }, [open]);
  useEffect(() => { setHoveredStripInfo(null); setKeyboardPairIdx(null); }, [swapped]);

  const effectiveA = swapped ? paletteB : paletteA;
  const effectiveB = swapped ? paletteA : paletteB;

  // For each swatch in effectiveA, find the nearest match in effectiveB
  const pairs = useMemo((): ComparePair[] => {
    if (!effectiveA || !effectiveB) return [];
    return effectiveA.colors.map((swA) => {
      let bestDelta = Infinity;
      let bestB = effectiveB.colors[0];
      for (const swB of effectiveB.colors) {
        const d = deltaE(swA.hex, swB.hex);
        if (d < bestDelta) { bestDelta = d; bestB = swB; }
      }
      return {
        hexA: swA.hex,
        nameA: swA.name,
        hexB: bestB.hex,
        nameB: bestB.name,
        dE: Math.round(bestDelta * 10) / 10,
      };
    }).sort((a, b) => a.dE - b.dE);
  }, [effectiveA, effectiveB]);

  // S = swap A↔B; ↑↓ navigate pairs; Enter/C copy focused pair
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const inInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if (inInput || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        e.stopPropagation();
        setSwapped((s) => !s);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setKeyboardPairIdx((prev) => {
          if (pairs.length === 0) return null;
          if (prev === null) return e.key === "ArrowDown" ? 0 : pairs.length - 1;
          return e.key === "ArrowDown"
            ? Math.min(prev + 1, pairs.length - 1)
            : Math.max(prev - 1, 0);
        });
      } else if ((e.key === "Enter" || e.key === "c" || e.key === "C") && keyboardPairIdx !== null) {
        e.preventDefault();
        e.stopPropagation();
        const pair = pairs[keyboardPairIdx];
        if (pair) {
          let pairText: string;
          if (copyAllFormat === "json") {
            pairText = JSON.stringify({ hexA: pair.hexA, hexB: pair.hexB, dE: pair.dE }, null, 2);
          } else if (copyAllFormat === "csv") {
            pairText = `${pair.hexA},${pair.hexB},${pair.dE}`;
          } else {
            pairText = `${pair.hexA} → ${pair.hexB} (ΔE ${pair.dE})`;
          }
          navigator.clipboard.writeText(pairText).catch(() => {});
          setCopiedKeyboardPairIdx(keyboardPairIdx);
          setTimeout(() => setCopiedKeyboardPairIdx(null), 1500);
        }
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [open, pairs, keyboardPairIdx, copyAllFormat]);

  // Auto-scroll when keyboard navigation moves the focused row
  useEffect(() => {
    if (keyboardPairIdx === null) return;
    const container = pairsScrollRef.current;
    const row = pairRowRefs.current[keyboardPairIdx];
    if (!container || !row) return;
    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const STICKY_H = 38;
    if (rowRect.top < containerRect.top + STICKY_H) {
      container.scrollBy({ top: rowRect.top - containerRect.top - STICKY_H - 8, behavior: "smooth" });
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollBy({ top: rowRect.bottom - containerRect.bottom + 8, behavior: "smooth" });
    }
  }, [keyboardPairIdx]);

  const avgDelta = useMemo(() => {
    if (pairs.length === 0) return 0;
    return Math.round((pairs.reduce((s, p) => s + p.dE, 0) / pairs.length) * 10) / 10;
  }, [pairs]);

  const closestDelta = pairs.length > 0 ? pairs[0].dE : 0;
  const furthestDelta = pairs.length > 0 ? pairs[pairs.length - 1].dE : 0;

  const coverageStats = useMemo(() => {
    if (pairs.length === 0) return null;
    const total     = pairs.length;
    const excellent = pairs.filter((p) => p.dE < 5).length;
    const good      = pairs.filter((p) => p.dE >= 5  && p.dE < 10).length;
    const fair      = pairs.filter((p) => p.dE >= 10 && p.dE < 15).length;
    const loose     = pairs.filter((p) => p.dE >= 15).length;
    const covered   = excellent + good;
    return {
      good: covered,
      total,
      pct: Math.round((covered / total) * 100),
      tiers: [
        { label: "excellent", count: excellent, pct: (excellent / total) * 100, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", barTitle: `${excellent} excellent — ΔE < 5`      },
        { label: "good",      count: good,      pct: (good      / total) * 100, color: "bg-sky-500",     textColor: "text-sky-600 dark:text-sky-400",         barTitle: `${good} good — ΔE 5–10`             },
        { label: "fair",      count: fair,      pct: (fair      / total) * 100, color: "bg-amber-500",   textColor: "text-amber-600 dark:text-amber-400",     barTitle: `${fair} fair — ΔE 10–15`            },
        { label: "loose",     count: loose,     pct: (loose     / total) * 100, color: "bg-rose-500",    textColor: "text-rose-600 dark:text-rose-400",       barTitle: `${loose} loose — ΔE ≥ 15`           },
      ].filter((t) => t.count > 0),
    };
  }, [pairs]);

  // Build hex→sorted-pair-index maps so strip swatches can drive row highlights
  const hexAToPairIdx = useMemo(() => {
    const m = new Map<string, number>();
    pairs.forEach((p, i) => m.set(p.hexA.toLowerCase(), i));
    return m;
  }, [pairs]);
  const hexBToPairIdx = useMemo(() => {
    const m = new Map<string, number>();
    // For each B hex, store the lowest-ΔE pair index (first occurrence, pairs are sorted asc)
    pairs.forEach((p, i) => { const k = p.hexB.toLowerCase(); if (!m.has(k)) m.set(k, i); });
    return m;
  }, [pairs]);

  const effectivePairIdx = hoveredPairIdx ?? keyboardPairIdx ?? hoveredStripInfo?.pairIdx ?? null;
  const highlightedHexA = effectivePairIdx !== null ? pairs[effectivePairIdx]?.hexA ?? null : null;
  const highlightedHexB = effectivePairIdx !== null ? pairs[effectivePairIdx]?.hexB ?? null : null;

  const uniqueColorStats = useMemo(() => {
    if (!effectiveA || !effectiveB) return null;
    const hexesA = new Set(effectiveA.colors.map((c) => c.hex.toLowerCase()));
    const hexesB = new Set(effectiveB.colors.map((c) => c.hex.toLowerCase()));
    const unionCount = new Set([...hexesA, ...hexesB]).size;
    const exactShared = [...hexesA].filter((h) => hexesB.has(h)).length;
    const nearDups = pairs.filter((p) => p.dE < 5).length;
    return {
      totalA: effectiveA.colors.length,
      totalB: effectiveB.colors.length,
      unionCount,
      exactShared,
      nearDups,
    };
  }, [effectiveA, effectiveB, pairs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="compare-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={14} className="text-[var(--muted)]" />
                <h2 className="text-sm font-semibold">Compare Palettes</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="relative"
                  onMouseEnter={() => setShowSwapTip(true)}
                  onMouseLeave={() => setShowSwapTip(false)}
                >
                  {showSwapTip && (
                    <div className="absolute top-full right-0 mt-1.5 z-20 pointer-events-none bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg px-2.5 py-1.5 min-w-max">
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                        <span>{swapped ? "Restore original order" : "Swap A ↔ B"}</span>
                        <kbd className="inline-flex items-center justify-center h-3.5 px-1 rounded text-[9px] font-mono bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] leading-none">
                          S
                        </kbd>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSwapped((s) => !s)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${
                      swapped
                        ? "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <ArrowLeftRight size={12} />
                    {swapped && <span>swapped</span>}
                    {!swapped && (
                      <kbd className="hidden sm:inline-flex items-center justify-center h-3.5 px-1 rounded text-[9px] font-mono bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] leading-none opacity-60">
                        S
                      </kbd>
                    )}
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Palette strips + overall ΔE */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">A</span>
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate" title={effectiveA!.name}>
                      {effectiveA!.name}
                    </p>
                  </div>
                  <div className="flex rounded-md overflow-hidden h-10 border border-[var(--border-subtle)]">
                    {effectiveA!.colors.map((c, i) => {
                      const dimmed = highlightedHexA !== null && c.hex.toLowerCase() !== highlightedHexA.toLowerCase();
                      return (
                        <div
                          key={i}
                          className={`flex-1 transition-opacity duration-150 cursor-pointer ${dimmed ? "opacity-20" : "opacity-100"}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.hex}
                          onMouseEnter={() => {
                            const idx = hexAToPairIdx.get(c.hex.toLowerCase());
                            if (idx !== undefined) setHoveredStripInfo({ pairIdx: idx });
                          }}
                          onMouseLeave={() => setHoveredStripInfo(null)}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">{effectiveA!.colors.length} swatches · source</p>
                </div>

                <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-bold tabular-nums ${getMatchTier(avgDelta).bg} ${getMatchTier(avgDelta).text}`}
                    title={`Average nearest-neighbor ΔE: ${avgDelta} (${getMatchTier(avgDelta).label})`}
                  >
                    ΔE {avgDelta}
                  </div>
                  <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide">avg</p>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1 justify-end">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate text-right" title={effectiveB!.name}>
                      {effectiveB!.name}
                    </p>
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">B</span>
                  </div>
                  <div className="flex rounded-md overflow-hidden h-10 border border-[var(--border-subtle)]">
                    {effectiveB!.colors.map((c, i) => {
                      const dimmed = highlightedHexB !== null && c.hex.toLowerCase() !== highlightedHexB.toLowerCase();
                      return (
                        <div
                          key={i}
                          className={`flex-1 transition-opacity duration-150 cursor-pointer ${dimmed ? "opacity-20" : "opacity-100"}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.hex}
                          onMouseEnter={() => {
                            const idx = hexBToPairIdx.get(c.hex.toLowerCase());
                            if (idx !== undefined) setHoveredStripInfo({ pairIdx: idx });
                          }}
                          onMouseLeave={() => setHoveredStripInfo(null)}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] text-right">{effectiveB!.colors.length} swatches · target</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Nearest-neighbor pairs */}
              <div>
                <div ref={pairsScrollRef} className="max-h-72 overflow-y-auto">
                  {/* Sticky header — stays anchored to the top of the scroll container */}
                  <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] flex-shrink-0">
                      Nearest-neighbor pairs
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Format toggle */}
                      <div className="flex items-center rounded overflow-hidden border border-[var(--border-subtle)] text-[9px]">
                        {(["text", "json", "csv"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setCopyAllFormat(fmt)}
                            className={`px-1.5 py-0.5 transition-colors ${
                              copyAllFormat === fmt
                                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                            title={
                              fmt === "text" ? "Copy as readable text (hexA → hexB)" :
                              fmt === "json" ? "Copy as JSON array" :
                              "Copy as CSV (hexA,hexB,dE) for spreadsheets"
                            }
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={copyAll}
                        disabled={pairs.length === 0}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                        title={`Copy all pairs as ${copyAllFormat === "json" ? "JSON array" : copyAllFormat === "csv" ? "CSV" : "hex text list"}`}
                      >
                        {copiedAll
                          ? <Check size={9} className="text-emerald-500" />
                          : <Copy size={9} />}
                        <span className={copiedAll ? "text-emerald-600 dark:text-emerald-400" : ""}>
                          {copiedAll ? "Copied!" : "Copy all"}
                        </span>
                      </button>
                      <button
                        onClick={downloadAll}
                        disabled={pairs.length === 0}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                        title={`Download pairs as .${copyAllFormat === "json" ? "json" : copyAllFormat === "csv" ? "csv" : "txt"} file`}
                      >
                        {downloaded
                          ? <Check size={9} className="text-emerald-500" />
                          : <Download size={9} />}
                        <span className={downloaded ? "text-emerald-600 dark:text-emerald-400" : ""}>
                          {downloaded ? "Saved!" : "Download"}
                        </span>
                      </button>
                      <div
                        className="relative"
                        onMouseEnter={() => setShowDirTip(true)}
                        onMouseLeave={() => setShowDirTip(false)}
                      >
                        {showDirTip && (
                          <div className="absolute top-full right-0 mt-2 z-20 pointer-events-none bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg px-3 py-2 min-w-max">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-mono font-bold text-[var(--foreground)]">A</span>
                              <span className="text-[var(--muted)]">=</span>
                              <span className="text-[var(--foreground)] max-w-[150px] truncate">{effectiveA!.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] mt-1">
                              <span className="font-mono font-bold text-[var(--foreground)]">B</span>
                              <span className="text-[var(--muted)]">=</span>
                              <span className="text-[var(--foreground)] max-w-[150px] truncate">{effectiveB!.name}</span>
                            </div>
                          </div>
                        )}
                        <div
                          className="flex items-center gap-1 cursor-default"
                          title="For each swatch in A, the closest match in B is shown — sorted by ΔE, lowest first"
                        >
                          <span className="text-[9px] font-bold text-[var(--foreground)] font-mono">A</span>
                          <ArrowRight size={9} className="text-[var(--muted)]" />
                          <span className="text-[9px] font-bold text-[var(--foreground)] font-mono">B</span>
                          <span className="text-[9px] text-[var(--muted)] ml-0.5">· by closeness</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 pr-0.5">
                  {pairs.map((pair, i) => {
                    const tier = getMatchTier(pair.dE);
                    const isRowHovered = hoveredPairIdx === i;
                    const isStripHighlighted = hoveredStripInfo?.pairIdx === i;
                    const isKeyboardFocused = keyboardPairIdx === i;
                    const isKeyCopied = copiedKeyboardPairIdx === i;
                    const isActive = isRowHovered || isStripHighlighted || isKeyboardFocused;
                    return (
                      <div
                        key={i}
                        ref={(el) => { pairRowRefs.current[i] = el; }}
                        className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-1.5 -mx-1.5 py-0.5 transition-all duration-100 cursor-default ${
                          isActive ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]/50"
                        }${isKeyCopied ? " ring-2 ring-inset ring-emerald-400/70" : isKeyboardFocused && !isRowHovered ? " ring-2 ring-inset ring-violet-400/60" : isStripHighlighted && !isRowHovered ? " ring-1 ring-inset ring-[var(--border)]" : ""}`}
                        onMouseEnter={() => setHoveredPairIdx(i)}
                        onMouseLeave={() => setHoveredPairIdx(null)}
                      >
                        {/* Swatch A */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-md flex-shrink-0 border border-black/10 dark:border-white/10 relative cursor-pointer"
                            style={{ backgroundColor: pair.hexA }}
                            onClick={() => copyHex(pair.hexA, i, "A")}
                            title={`Click to copy ${pair.hexA}`}
                          >
                            {copiedInfo?.pairIdx === i && copiedInfo?.side === "A" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[11px] font-mono leading-none cursor-pointer select-none transition-colors duration-150 ${
                                copiedTextInfo?.pairIdx === i && copiedTextInfo?.side === "A"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-[var(--foreground)]"
                              }`}
                              onClick={() => copyHexText(pair.hexA, i, "A")}
                              title={`Click to copy ${pair.hexA}`}
                            >
                              {pair.hexA}
                            </p>
                            {pair.nameA && (
                              <p className={`text-[9px] truncate mt-0.5 transition-colors duration-100 ${isStripHighlighted ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)]"}`}>{pair.nameA}</p>
                            )}
                          </div>
                        </div>

                        {/* ΔE badge + coverage icon */}
                        <div className="flex flex-col items-center shrink-0 w-12">
                          <div
                            className={`w-full text-center px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${tier.bg} ${tier.text}`}
                            title={`ΔE ${pair.dE} — ${tier.label}`}
                          >
                            {pair.dE}
                          </div>
                          <div
                            className={`mt-0.5 ${pair.dE < 10 ? "text-emerald-500" : "text-rose-400 opacity-60"}`}
                            title={pair.dE < 10 ? "Covered — good match (ΔE < 10)" : "Not covered — loose match (ΔE ≥ 10)"}
                          >
                            {pair.dE < 10 ? <Check size={9} /> : <X size={9} />}
                          </div>
                        </div>

                        {/* Swatch B */}
                        <div className="flex items-center gap-2 min-w-0 justify-end">
                          <div className="min-w-0 text-right">
                            <p
                              className={`text-[11px] font-mono leading-none cursor-pointer select-none transition-colors duration-150 ${
                                copiedTextInfo?.pairIdx === i && copiedTextInfo?.side === "B"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-[var(--foreground)]"
                              }`}
                              onClick={() => copyHexText(pair.hexB, i, "B")}
                              title={`Click to copy ${pair.hexB}`}
                            >
                              {pair.hexB}
                            </p>
                            {pair.nameB && (
                              <p className={`text-[9px] truncate mt-0.5 transition-colors duration-100 ${isStripHighlighted ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)]"}`}>{pair.nameB}</p>
                            )}
                          </div>
                          <div
                            className="w-8 h-8 rounded-md flex-shrink-0 border border-black/10 dark:border-white/10 relative cursor-pointer"
                            style={{ backgroundColor: pair.hexB }}
                            onClick={() => copyHex(pair.hexB, i, "B")}
                            title={`Click to copy ${pair.hexB}`}
                          >
                            {copiedInfo?.pairIdx === i && copiedInfo?.side === "B" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
                {pairs.length > 1 && (
                  <p className="flex items-center gap-1.5 mt-1 text-[9px] text-[var(--muted)] select-none">
                    <kbd className="inline-flex items-center justify-center h-3.5 px-1 rounded text-[9px] font-mono bg-[var(--surface-2)] border border-[var(--border)] leading-none">↑↓</kbd>
                    <span>navigate</span>
                    <span className="opacity-40">·</span>
                    <kbd className="inline-flex items-center justify-center h-3.5 px-1.5 rounded text-[9px] font-mono bg-[var(--surface-2)] border border-[var(--border)] leading-none">Enter</kbd>
                    <span>or</span>
                    <kbd className="inline-flex items-center justify-center h-3.5 px-1 rounded text-[9px] font-mono bg-[var(--surface-2)] border border-[var(--border)] leading-none">C</kbd>
                    <span>copy pair as</span>
                    <span className="font-mono text-[var(--foreground)] opacity-70">{copyAllFormat}</span>
                  </p>
                )}
              </div>

              {/* Summary stats footer */}
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-bold tabular-nums ${getMatchTier(avgDelta).text}`}>{avgDelta}</p>
                    <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">avg ΔE</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold tabular-nums ${getMatchTier(closestDelta).text}`}>{closestDelta}</p>
                    <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">closest pair</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold tabular-nums ${getMatchTier(furthestDelta).text}`}>{furthestDelta}</p>
                    <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">furthest pair</p>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--muted)] text-center mt-2.5">
                  {avgDelta < 5 ? "These palettes are nearly identical — very high overlap." :
                   avgDelta < 10 ? "Strong similarity — these palettes share a clear color family." :
                   avgDelta < 15 ? "Moderate similarity — related tones with meaningful differences." :
                   avgDelta < 20 ? "Loose similarity — some shared hues but distinct character." :
                   "Low similarity — these palettes have little color overlap."}
                </p>

                {coverageStats && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                        Coverage <span className="normal-case tracking-normal font-normal">(ΔE &lt; 10)</span>
                      </p>
                      <div
                        className="relative"
                        onMouseEnter={() => setShowCoverageTip(true)}
                        onMouseLeave={() => setShowCoverageTip(false)}
                      >
                        {showCoverageTip && coverageStats.tiers.length > 0 && (
                          <div className="absolute bottom-full right-0 mb-2 z-20 pointer-events-none bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg px-3 py-2 min-w-max">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">Tier breakdown</p>
                            <div className="flex flex-col gap-1">
                              {(["excellent", "good", "fair", "loose"] as const).map((tierLabel) => {
                                const tier = coverageStats.tiers.find((t) => t.label === tierLabel);
                                const count = tier?.count ?? 0;
                                const tierStyles: Record<string, { dot: string; text: string; range: string }> = {
                                  excellent: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", range: "ΔE < 5" },
                                  good:      { dot: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400",         range: "ΔE 5–10" },
                                  fair:      { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     range: "ΔE 10–15" },
                                  loose:     { dot: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400",       range: "ΔE ≥ 15" },
                                };
                                const s = tierStyles[tierLabel];
                                return (
                                  <div key={tierLabel} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot} ${count === 0 ? "opacity-25" : ""}`} />
                                    <span className={`text-[10px] capitalize min-w-[3.5rem] ${count === 0 ? "text-[var(--muted)] opacity-50" : s.text}`}>{tierLabel}</span>
                                    <span className={`text-[10px] font-bold tabular-nums min-w-[1rem] text-right ${count === 0 ? "text-[var(--muted)] opacity-50" : "text-[var(--foreground)]"}`}>{count}</span>
                                    <span className={`text-[9px] ${count === 0 ? "text-[var(--muted)] opacity-40" : "text-[var(--muted)]"}`}>{s.range}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <span
                          className={`text-sm font-bold tabular-nums cursor-default ${
                            coverageStats.pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                            coverageStats.pct >= 50 ? "text-sky-600 dark:text-sky-400" :
                            coverageStats.pct >= 25 ? "text-amber-600 dark:text-amber-400" :
                            "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {coverageStats.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden flex">
                      {coverageStats.tiers.map((tier, i) => (
                        <motion.div
                          key={tier.label}
                          className={`h-full ${tier.color}`}
                          title={tier.barTitle}
                          initial={{ width: 0 }}
                          animate={{ width: `${tier.pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-3 justify-center mt-2 flex-wrap">
                      {coverageStats.tiers.map((tier) => (
                        <div key={tier.label} className={`flex items-center gap-1 text-[9px] ${tier.textColor}`} title={tier.barTitle}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.color}`} />
                          <span className="capitalize">{tier.label}</span>
                          <span className="opacity-60">({tier.count})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] text-center mt-1">
                      {coverageStats.good} of {coverageStats.total} source{" "}
                      {coverageStats.total === 1 ? "color has" : "colors have"} a good match in B
                    </p>
                  </div>
                )}

                {uniqueColorStats && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] text-center mb-2">
                      Color Distribution
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">
                          {uniqueColorStats.totalA + uniqueColorStats.totalB}
                        </p>
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">
                          combined
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">
                          {uniqueColorStats.unionCount}
                        </p>
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">
                          unique
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold tabular-nums ${uniqueColorStats.nearDups > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"}`}>
                          {uniqueColorStats.nearDups}
                        </p>
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-0.5">
                          near-identical
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] text-center mt-2">
                      {uniqueColorStats.exactShared > 0
                        ? `${uniqueColorStats.exactShared} exact hex ${uniqueColorStats.exactShared === 1 ? "match" : "matches"} · `
                        : ""}
                      {uniqueColorStats.nearDups > 0
                        ? `${uniqueColorStats.nearDups} pair${uniqueColorStats.nearDups === 1 ? "" : "s"} within ΔE 5`
                        : uniqueColorStats.unionCount === uniqueColorStats.totalA + uniqueColorStats.totalB
                        ? "No duplicate hexes across either palette"
                        : `${(uniqueColorStats.totalA + uniqueColorStats.totalB) - uniqueColorStats.unionCount} repeated hex${(uniqueColorStats.totalA + uniqueColorStats.totalB) - uniqueColorStats.unionCount === 1 ? "" : "es"}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
