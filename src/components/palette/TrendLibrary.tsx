"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sprout, Sun, Leaf, Snowflake, Infinity, Check, Search, Clipboard } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleFork = () => {
    if (forked) return;
    onFork(palette.colors, palette.name);
    setForked(true);
    setTimeout(() => setForked(false), 2000);
  };

  const handleCopyHex = () => {
    if (copied) return;
    navigator.clipboard.writeText(palette.colors.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <button
          onClick={handleCopyHex}
          className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-all ${
            copied
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          title="Copy all hex values (great for AI art prompts)"
        >
          {copied ? <Check size={11} /> : <Clipboard size={11} />}
        </button>
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

// Pre-compute palette count per season (static — TREND_PALETTES never changes at runtime)
const SEASON_COUNTS: Record<Season, number> = SEASONS.reduce(
  (acc, s) => ({ ...acc, [s]: TREND_PALETTES.filter((p) => p.season === s).length }),
  {} as Record<Season, number>
);

export default function TrendLibrary({ onClose, onFork, onUseInExtractor }: TrendLibraryProps) {
  const [season, setSeason] = useState<Season>("evergreen");
  const [query, setQuery] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());

  const handleSeasonChange = (s: Season) => {
    setSeason(s);
    setQuery("");
    setSelectedMoods(new Set());
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) => {
      const next = new Set(prev);
      if (next.has(mood)) next.delete(mood); else next.add(mood);
      return next;
    });
  };

  const seasonPalettes = TREND_PALETTES.filter((p) => p.season === season);

  // Derive unique mood keywords for the current season, sorted by frequency desc then alpha
  const seasonMoodWords = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of TREND_PALETTES.filter((x) => x.season === season)) {
      for (const raw of p.mood.split("·")) {
        const w = raw.trim().toLowerCase();
        if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => word);
  }, [season]);

  const q = query.trim().toLowerCase();
  const filtered = seasonPalettes
    .filter(
      (p) =>
        selectedMoods.size === 0 ||
        p.mood.split("·").some((m) => selectedMoods.has(m.trim().toLowerCase()))
    )
    .filter(
      (p) =>
        !q || p.name.toLowerCase().includes(q) || p.mood.toLowerCase().includes(q)
    );

  const isFiltered = selectedMoods.size > 0 || q.length > 0;

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
                  onClick={() => handleSeasonChange(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <TabIcon size={11} />
                  {SEASON_META[s].label}
                  <span className={`text-[10px] tabular-nums leading-none ${isActive ? "opacity-70" : "opacity-50"}`}>
                    {SEASON_COUNTS[s]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mood tag chips */}
          {seasonMoodWords.length > 0 && (
            <div className="px-5 pb-2 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {selectedMoods.size > 0 && (
                <button
                  onClick={() => setSelectedMoods(new Set())}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-[var(--accent)] text-[var(--accent-fg)] transition-all"
                  aria-label="Clear mood filters"
                >
                  <X size={9} />
                  Clear
                </button>
              )}
              {seasonMoodWords.map((word) => {
                const active = selectedMoods.has(word);
                return (
                  <button
                    key={word}
                    onClick={() => toggleMood(word)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      active
                        ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {word.charAt(0).toUpperCase() + word.slice(1)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search input */}
          <div className="px-5 pb-3 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${SEASON_META[season].label} palettes…`}
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Palette grid */}
          <div className="overflow-y-auto px-5 pb-5">
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <p className="text-sm text-[var(--muted)]">
                    {q
                      ? <>No palettes match <span className="font-semibold text-[var(--foreground)]">&ldquo;{query}&rdquo;</span></>
                      : "No palettes match the selected moods"
                    }
                  </p>
                  <button
                    onClick={() => { setQuery(""); setSelectedMoods(new Set()); }}
                    className="mt-2 text-xs text-[var(--accent)] hover:underline"
                  >
                    Clear filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={`${season}-${q}-${[...selectedMoods].sort().join(",")}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {filtered.map((p) => (
                    <TrendCard key={p.id} palette={p} onFork={onFork} onUseInExtractor={onUseInExtractor} />
                  ))}
                  {isFiltered && (
                    <p className="col-span-full text-[10px] text-[var(--muted)] text-right pt-1 tabular-nums">
                      {filtered.length} of {seasonPalettes.length}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
