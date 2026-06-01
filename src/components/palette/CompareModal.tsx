"use client";

import { useMemo } from "react";
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

  // For each swatch in A, find the nearest match in B
  const pairs = useMemo((): ComparePair[] => {
    if (!paletteA || !paletteB) return [];
    return paletteA.colors.map((swA) => {
      let bestDelta = Infinity;
      let bestB = paletteB.colors[0];
      for (const swB of paletteB.colors) {
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
  }, [paletteA, paletteB]);

  const avgDelta = useMemo(() => {
    if (pairs.length === 0) return 0;
    return Math.round((pairs.reduce((s, p) => s + p.dE, 0) / pairs.length) * 10) / 10;
  }, [pairs]);

  const closestDelta = pairs.length > 0 ? pairs[0].dE : 0;
  const furthestDelta = pairs.length > 0 ? pairs[pairs.length - 1].dE : 0;

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
              <button
                onClick={onClose}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Palette strips + overall ΔE */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate" title={paletteA!.name}>
                    {paletteA!.name}
                  </p>
                  <div className="flex rounded-md overflow-hidden h-10 border border-[var(--border-subtle)]">
                    {paletteA!.colors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} title={c.hex} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">{paletteA!.colors.length} swatches</p>
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
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate text-right" title={paletteB!.name}>
                    {paletteB!.name}
                  </p>
                  <div className="flex rounded-md overflow-hidden h-10 border border-[var(--border-subtle)]">
                    {paletteB!.colors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} title={c.hex} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] text-right">{paletteB!.colors.length} swatches</p>
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
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
