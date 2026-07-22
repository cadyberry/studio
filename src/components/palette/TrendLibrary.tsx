"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sprout, Sun, Leaf, Snowflake, Infinity, Check, Search, Clipboard, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import { TREND_PALETTES, SEASONS, SEASON_META, type Season } from "@/lib/trendPalettes";
import { getContrastColor } from "@/lib/utils";

type SeasonTab = Season | "all";

interface TrendLibraryProps {
  onClose: () => void;
  onSave: (colors: string[], name: string) => void;
  onUseInExtractor?: (colors: string[], name: string) => void;
}

const SEASON_ICONS: Record<Season, React.FC<{ size?: number; className?: string }>> = {
  spring:    Sprout,
  summer:    Sun,
  fall:      Leaf,
  winter:    Snowflake,
  evergreen: Infinity,
};

const SEASON_BADGE_COLORS: Record<Season, string> = {
  spring:    "bg-green-100 text-green-700",
  summer:    "bg-amber-100 text-amber-700",
  fall:      "bg-orange-100 text-orange-700",
  winter:    "bg-blue-100 text-blue-700",
  evergreen: "bg-violet-100 text-violet-700",
};

// Chip colors for active mood chips in "All" mode — one per season
const SEASON_CHIP_ACTIVE: Record<Season, string> = {
  spring:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  summer:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  fall:      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  winter:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  evergreen: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

const SEASON_DOT_COLOR: Record<Season, string> = {
  spring:    "#4ade80",
  summer:    "#fbbf24",
  fall:      "#f97316",
  winter:    "#60a5fa",
  evergreen: "#a78bfa",
};

function TrendCard({
  palette,
  onSave,
  onUseInExtractor,
  showSeason,
}: {
  palette: (typeof TREND_PALETTES)[0];
  onSave: (colors: string[], name: string) => void;
  onUseInExtractor?: (colors: string[], name: string) => void;
  showSeason?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (saved) return;
    onSave(palette.colors, palette.name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{palette.name}</p>
            {showSeason && (
              <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${SEASON_BADGE_COLORS[palette.season]}`}>
                {SEASON_META[palette.season].label}
              </span>
            )}
          </div>
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
          onClick={handleSave}
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border transition-all ${
            saved
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center gap-1">
            {saved ? (
              <>
                <Check size={11} />
                Saved
              </>
            ) : (
              "Save"
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

const ALL_META = {
  label: "All Seasons",
  gradient: "from-rose-200 via-violet-200 via-cyan-200 to-amber-200",
};

export default function TrendLibrary({ onClose, onSave, onUseInExtractor }: TrendLibraryProps) {
  const [season, setSeason] = useState<SeasonTab>("evergreen");
  const [query, setQuery] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [sessionSaveCount, setSessionSaveCount] = useState(0);

  const handleSave = (colors: string[], name: string) => {
    onSave(colors, name);
    setSessionSaveCount((n) => n + 1);
  };

  const handleSeasonChange = (s: SeasonTab) => {
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

  const isAllSeasons = season === "all";
  const activePalettes = isAllSeasons
    ? TREND_PALETTES
    : TREND_PALETTES.filter((p) => p.season === season);

  // Derive unique mood keywords and (in All mode) the dominant season per keyword
  const { moodWords, moodDominantSeason } = useMemo(() => {
    const counts = new Map<string, number>();
    const seasonCounts = new Map<string, Map<Season, number>>();
    for (const p of activePalettes) {
      for (const raw of p.mood.split("·")) {
        const w = raw.trim().toLowerCase();
        if (!w) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
        if (isAllSeasons) {
          if (!seasonCounts.has(w)) seasonCounts.set(w, new Map());
          const sc = seasonCounts.get(w)!;
          sc.set(p.season, (sc.get(p.season) ?? 0) + 1);
        }
      }
    }
    const words = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => word);
    const dominantSeason = new Map<string, Season>();
    for (const [word, sc] of seasonCounts) {
      const top = [...sc.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) dominantSeason.set(word, top[0]);
    }
    return { moodWords: words, moodDominantSeason: dominantSeason };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const q = query.trim().toLowerCase();
  const filtered = activePalettes
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

  // Dominant season in filtered results — used for the "why" footer in All mode
  const filteredSeasonInfo: {
    season: Season;
    count: number;
    breakdown: Array<{ season: Season; count: number }>;
  } | null = (() => {
    if (!isAllSeasons || selectedMoods.size === 0 || filtered.length === 0) return null;
    const counts = new Map<Season, number>();
    for (const p of filtered) {
      counts.set(p.season, (counts.get(p.season) ?? 0) + 1);
    }
    const breakdown = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => ({ season: s as Season, count: c }));
    return breakdown[0] ? { season: breakdown[0].season, count: breakdown[0].count, breakdown } : null;
  })();

  const headerGradient = isAllSeasons
    ? ALL_META.gradient
    : SEASON_META[season as Season].gradient;
  const headerLabel = isAllSeasons ? ALL_META.label : SEASON_META[season as Season].label;
  const HeaderIcon = isAllSeasons ? Layers : SEASON_ICONS[season as Season];

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
          <div className={`h-2 bg-gradient-to-r ${headerGradient}`} />

          {/* Title row */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <HeaderIcon size={16} className="text-[var(--muted)]" />
              <h2 className="text-base font-semibold">Trend Library</h2>
              <span className="text-xs text-[var(--muted)]">— seasonal palettes to save</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>

          {/* Season tabs */}
          <div className="px-5 pb-3 flex gap-1 shrink-0 overflow-x-auto scrollbar-none">
            {/* "All Seasons" tab */}
            <button
              onClick={() => handleSeasonChange("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                season === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              <Layers size={11} />
              All
              <span className={`text-[10px] tabular-nums leading-none ${season === "all" ? "opacity-70" : "opacity-50"}`}>
                {TREND_PALETTES.length}
              </span>
            </button>

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
          {moodWords.length > 0 && (
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
              {moodWords.map((word) => {
                const active = selectedMoods.has(word);
                const dominantSeason = isAllSeasons ? moodDominantSeason.get(word) : undefined;
                const seasonLabel = dominantSeason ? SEASON_META[dominantSeason].label : undefined;
                return (
                  <button
                    key={word}
                    onClick={() => toggleMood(word)}
                    title={active && seasonLabel ? `Dominant season: ${seasonLabel}` : undefined}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      active
                        ? (dominantSeason ? `${SEASON_CHIP_ACTIVE[dominantSeason]} shadow-sm` : "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm")
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {active && dominantSeason && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: SEASON_DOT_COLOR[dominantSeason] }}
                      />
                    )}
                    {word.charAt(0).toUpperCase() + word.slice(1)}
                  </button>
                );
              })}
            </div>
          )}

          {/* "Why" footer — dominant season context in All mode with active chips */}
          <AnimatePresence>
            {filteredSeasonInfo && (
              <motion.div
                key="why-footer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden shrink-0"
              >
                <p className="px-5 pb-2 text-[10px] text-[var(--muted)]">
                  <span className="tabular-nums">{filtered.length}</span>
                  {filtered.length === 1 ? " palette" : " palettes"}
                  {" · strongest in "}
                  <span
                    className="font-semibold cursor-default"
                    style={{ color: SEASON_DOT_COLOR[filteredSeasonInfo.season] }}
                    title={filteredSeasonInfo.breakdown
                      .map(({ season, count }) => `${SEASON_META[season].label} ${count}`)
                      .join(" · ")}
                  >
                    {SEASON_META[filteredSeasonInfo.season].label}
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search input */}
          <div className="px-5 pb-3 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${headerLabel} palettes…`}
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
                    <TrendCard
                      key={p.id}
                      palette={p}
                      onSave={handleSave}
                      onUseInExtractor={onUseInExtractor}
                      showSeason={isAllSeasons}
                    />
                  ))}
                  {isFiltered && (
                    <p className="col-span-full text-[10px] text-[var(--muted)] text-right pt-1 tabular-nums">
                      {filtered.length} of {activePalettes.length}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] shrink-0 flex items-center justify-between gap-3">
            <p className="text-[10px] text-[var(--muted)]">
              <strong className="font-semibold">Save</strong> adds to your library · <strong className="font-semibold">Remix</strong> opens in extractor to customize first
            </p>
            {sessionSaveCount > 0 && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                <Check size={10} />
                {sessionSaveCount} saved this session
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
