"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, CheckCheck, ScanSearch } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import { deltaE } from "@/lib/utils";
import type { Palette } from "@/types";

interface DuplicatesModalProps {
  onClose: () => void;
}

interface DuplicatePair {
  a: Palette;
  b: Palette;
  distance: number; // 0 = identical, higher = more different
  similarity: number; // 0–100 %
}

function palettePairDistance(a: Palette, b: Palette): number {
  if (a.colors.length === 0 || b.colors.length === 0) return 999;
  const forward = a.colors.map((ca) =>
    Math.min(...b.colors.map((cb) => deltaE(ca.hex, cb.hex)))
  );
  const backward = b.colors.map((cb) =>
    Math.min(...a.colors.map((ca) => deltaE(ca.hex, cb.hex)))
  );
  const meanFwd = forward.reduce((s, v) => s + v, 0) / forward.length;
  const meanBwd = backward.reduce((s, v) => s + v, 0) / backward.length;
  return (meanFwd + meanBwd) / 2;
}

const DISTANCE_THRESHOLD = 10; // avg ΔE per swatch — ≤10 is flagged as near-duplicate

export default function DuplicatesModal({ onClose }: DuplicatesModalProps) {
  const palettes = usePaletteStore((s) => s.palettes);
  const deletePalette = usePaletteStore((s) => s.deletePalette);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const pairs = useMemo<DuplicatePair[]>(() => {
    const result: DuplicatePair[] = [];
    for (let i = 0; i < palettes.length; i++) {
      for (let j = i + 1; j < palettes.length; j++) {
        const dist = palettePairDistance(palettes[i], palettes[j]);
        if (dist <= DISTANCE_THRESHOLD) {
          result.push({
            a: palettes[i],
            b: palettes[j],
            distance: dist,
            similarity: Math.round(Math.max(0, 1 - dist / DISTANCE_THRESHOLD) * 100),
          });
        }
      }
    }
    // Sort closest pairs first
    return result.sort((x, y) => x.distance - y.distance);
  }, [palettes]);

  const visiblePairs = pairs.filter(
    (p) => !dismissed.has(`${p.a.id}|${p.b.id}`) && palettes.some((pl) => pl.id === p.a.id) && palettes.some((pl) => pl.id === p.b.id)
  );

  const dismiss = (pair: DuplicatePair) =>
    setDismissed((prev) => new Set([...prev, `${pair.a.id}|${pair.b.id}`]));

  const handleDelete = (keepId: string, deleteId: string, pair: DuplicatePair) => {
    deletePalette(deleteId);
    dismiss({ ...pair, a: { ...pair.a, id: keepId }, b: { ...pair.b, id: deleteId } });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-[var(--surface)] rounded-[var(--radius)] w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-rose-100 dark:from-violet-900/30 dark:to-rose-900/30 flex items-center justify-center flex-shrink-0">
                <ScanSearch size={15} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Duplicate Palettes</h2>
                <p className="text-[11px] text-[var(--muted)]">
                  {visiblePairs.length === 0
                    ? "All clear — no near-duplicates found"
                    : `${visiblePairs.length} near-identical pair${visiblePairs.length !== 1 ? "s" : ""} detected`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>

          <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
            {visiblePairs.length === 0 && (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <CheckCheck size={32} className="text-emerald-500" />
                <p className="text-sm font-medium">Your library is clean!</p>
                <p className="text-xs text-[var(--muted)] max-w-xs">
                  No palettes were found with an average color distance below ΔE&nbsp;{DISTANCE_THRESHOLD}.
                </p>
              </div>
            )}

            {visiblePairs.map((pair) => {
              const olderPalette = pair.a.createdAt <= pair.b.createdAt ? pair.a : pair.b;
              const newerPalette = pair.a.createdAt <= pair.b.createdAt ? pair.b : pair.a;
              return (
                <div
                  key={`${pair.a.id}|${pair.b.id}`}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden"
                >
                  {/* Similarity badge */}
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pair.similarity >= 95
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : pair.similarity >= 80
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      }`}
                      title={`Average color distance: ΔE ${pair.distance.toFixed(1)}`}
                    >
                      {pair.similarity}% similar
                    </span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      avg ΔE {pair.distance.toFixed(1)}
                    </span>
                  </div>

                  {/* Palette rows */}
                  {[olderPalette, newerPalette].map((pl, idx) => (
                    <div key={pl.id} className={`px-3 pb-2 ${idx === 0 ? "pt-0.5" : "pt-1 border-t border-[var(--border)]/50"}`}>
                      <div className="flex items-center gap-2">
                        {/* Swatch strip */}
                        <div className="flex h-7 flex-1 rounded overflow-hidden border border-[var(--border)]/60">
                          {pl.colors.map((c, i) => (
                            <div
                              key={i}
                              className="flex-1"
                              style={{ backgroundColor: c.hex }}
                              title={c.name || c.hex}
                            />
                          ))}
                        </div>
                        {/* Name + meta */}
                        <div className="flex flex-col min-w-0 w-32 shrink-0">
                          <span className="text-[11px] font-medium truncate leading-tight">
                            {pl.name}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] leading-tight">
                            {idx === 0 ? "older" : "newer"} · {pl.colors.length} colors
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 px-3 pb-3 pt-2 border-t border-[var(--border)]/50">
                    <button
                      onClick={() => dismiss(pair)}
                      className="flex-1 text-[11px] font-medium px-2 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Keep both
                    </button>
                    <button
                      onClick={() => handleDelete(newerPalette.id, olderPalette.id, pair)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      title={`Delete "${olderPalette.name}" (older)`}
                    >
                      <Trash2 size={11} />
                      Delete older
                    </button>
                    <button
                      onClick={() => handleDelete(olderPalette.id, newerPalette.id, pair)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      title={`Delete "${newerPalette.name}" (newer)`}
                    >
                      <Trash2 size={11} />
                      Delete newer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <p className="text-[10px] text-[var(--muted)]">
              Similarity threshold: avg ΔE ≤ {DISTANCE_THRESHOLD} per swatch
            </p>
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
