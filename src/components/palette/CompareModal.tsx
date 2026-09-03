"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeftRight } from "lucide-react";
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

  // Reset swap direction each time the modal opens with a new pair
  useEffect(() => {
    if (open) setSwapped(false);
  }, [open]);

  // S = swap A↔B while modal is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const inInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if ((e.key === "s" || e.key === "S") && !inInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setSwapped((s) => !s);
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [open]);

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

  const avgDelta = useMemo(() => {
    if (pairs.length === 0) return 0;
    return Math.round((pairs.reduce((s, p) => s + p.dE, 0) / pairs.length) * 10) / 10;
  }, [pairs]);

  const closestDelta = pairs.length > 0 ? pairs[0].dE : 0;
  const furthestDelta = pairs.length > 0 ? pairs[pairs.length - 1].dE : 0;

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
                <button
                  onClick={() => setSwapped((s) => !s)}
                  title="Swap A ↔ B — re-run nearest-neighbor pairs from the other direction (S)"
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
                    {effectiveA!.colors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} title={c.hex} />
                    ))}
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
                    {effectiveB!.colors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} title={c.hex} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] text-right">{effectiveB!.colors.length} swatches · target</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Nearest-neighbor pairs */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Nearest-neighbor pairs · sorted by closeness
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                  {pairs.map((pair, i) => {
                    const tier = getMatchTier(pair.dE);
                    return (
                      <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        {/* Swatch A */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-md flex-shrink-0 border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: pair.hexA }}
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-mono text-[var(--foreground)] leading-none">{pair.hexA}</p>
                            {pair.nameA && (
                              <p className="text-[9px] text-[var(--muted)] truncate mt-0.5">{pair.nameA}</p>
                            )}
                          </div>
                        </div>

                        {/* ΔE badge */}
                        <div className="flex flex-col items-center shrink-0 w-12">
                          <div
                            className={`w-full text-center px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${tier.bg} ${tier.text}`}
                            title={`ΔE ${pair.dE} — ${tier.label}`}
                          >
                            {pair.dE}
                          </div>
                        </div>

                        {/* Swatch B */}
                        <div className="flex items-center gap-2 min-w-0 justify-end">
                          <div className="min-w-0 text-right">
                            <p className="text-[11px] font-mono text-[var(--foreground)] leading-none">{pair.hexB}</p>
                            {pair.nameB && (
                              <p className="text-[9px] text-[var(--muted)] truncate mt-0.5">{pair.nameB}</p>
                            )}
                          </div>
                          <div
                            className="w-8 h-8 rounded-md flex-shrink-0 border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: pair.hexB }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
