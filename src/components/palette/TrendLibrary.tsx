"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sprout, Sun, Leaf, Snowflake, Infinity, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { TREND_PALETTES, SEASONS, SEASON_META, type Season } from "@/lib/trendPalettes";
import { getContrastColor } from "@/lib/utils";

interface TrendLibraryProps {
  onClose: () => void;
  onFork: (colors: string[], name: string) => void;
  onUseInExtractor?: (colors: string[], name: string) => void;
}

const SEASON_ICONS: Record<Season, React.FC<{ size?: number; className?: string }>> = {
  spring:    Sprout,
  summer:    Sun,
  fall:      Leaf,
  winter:    Snowflake,
  evergreen: Infinity,
};

function TrendCard({
  palette,
  onFork,
  onUseInExtractor,
}: {
  palette: (typeof TREND_PALETTES)[0];
  onFork: (colors: string[], name: string) => void;
  onUseInExtractor?: (colors: string[], name: string) => void;
}) {
  const [forked, setForked] = useState(false);

  const handleFork = () => {
    if (forked) return;
    onFork(palette.colors, palette.name);
    setForked(true);
    setTimeout(() => setForked(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)] hover:border-[var(--border-subtle)] hover:shadow-md transition-all bg-[var(--surface)]"
    >
      {/* Color strip */}
      <div className="flex h-14">
        {palette.colors.map((hex, i) => (
          <div
            key={i}
            className="flex-1 relative group/swatch"
            style={{ backgroundColor: hex }}
          >
            <span
              className="absolute inset-0 flex items-end justify-center pb-1 text-[9px] font-mono opacity-0 group-hover/swatch:opacity-100 transition-opacity"
              style={{ color: getContrastColor(hex) }}
            >
              {hex.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Info + actions */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{palette.name}</p>
          <p className="text-[11px] text-[var(--muted)] truncate">{palette.mood}</p>
        </div>
        {onUseInExtractor && (
          <button
            onClick={() => onUseInExtractor(palette.colors, palette.name)}
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
            title="Open in extractor to customize before saving"
          >
            Remix
          </button>
        )}
        <button
          onClick={handleFork}
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border transition-all ${
            forked
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center gap-1">
            {forked ? (
              <>
                <Check size={11} />
                Saved
              </>
            ) : (
              "Fork"
            )}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

export default function TrendLibrary({ onClose, onFork, onUseInExtractor }: TrendLibraryProps) {
  const [season, setSeason] = useState<Season>("evergreen");

  const filtered = TREND_PALETTES.filter((p) => p.season === season);
  const meta = SEASON_META[season];
  const Icon = SEASON_ICONS[season];

  return (
    <AnimatePresence>
      <motion.div
        key="trend-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="bg-[var(--surface)] w-full sm:max-w-2xl rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Season gradient header */}
          <div className={`h-2 bg-gradient-to-r ${meta.gradient}`} />

          {/* Title row */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-[var(--muted)]" />
              <h2 className="text-base font-semibold">Trend Library</h2>
              <span className="text-xs text-[var(--muted)]">— seasonal palettes to fork</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>

          {/* Season tabs */}
          <div className="px-5 pb-3 flex gap-1 shrink-0 overflow-x-auto">
            {SEASONS.map((s) => {
              const TabIcon = SEASON_ICONS[s];
              const isActive = s === season;
              return (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <TabIcon size={11} />
                  {SEASON_META[s].label}
                </button>
              );
            })}
          </div>

          {/* Palette grid */}
          <div className="overflow-y-auto px-5 pb-5">
            <motion.div
              key={season}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {filtered.map((p) => (
                <TrendCard key={p.id} palette={p} onFork={onFork} onUseInExtractor={onUseInExtractor} />
              ))}
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] shrink-0">
            <p className="text-[10px] text-[var(--muted)]">
              <strong className="font-semibold">Fork</strong> saves directly to your library · <strong className="font-semibold">Remix</strong> opens it in the extractor to customize first
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
