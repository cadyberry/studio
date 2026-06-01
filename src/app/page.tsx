"use client";

import { useState, useEffect, useCallback, useRef, type JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Search, FolderOpen, Sparkles, BarChart2, Compass, BookMarked, X, ArrowUpDown, Trash2, CheckSquare, Pipette, Download, Loader2, Archive, CheckCircle2, Lock, CopyPlus, ChevronRight, ChevronDown, RotateCcw, Import, ArrowLeftRight } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import Extractor from "@/components/palette/Extractor";
import PaletteCard from "@/components/palette/PaletteCard";
import ExportModal from "@/components/palette/ExportModal";
import RenameModal from "@/components/palette/RenameModal";
import CollectionModal from "@/components/palette/CollectionModal";
import HarmonyModal from "@/components/palette/HarmonyModal";
import SwatchEditor from "@/components/palette/SwatchEditor";
import CohesionModal from "@/components/palette/CohesionModal";
import TrendLibrary from "@/components/palette/TrendLibrary";
import ImportModal from "@/components/palette/ImportModal";
import KeyboardHelpModal from "@/components/palette/KeyboardHelpModal";
import ShadeModal from "@/components/palette/ShadeModal";
import CompareModal from "@/components/palette/CompareModal";
import { computeCohesionScore, deltaE, isValidHex, getPaletteMood, formatDate, type PaletteMood } from "@/lib/utils";
import { batchExportZip } from "@/lib/exportPalette";
import type { Palette, Collection } from "@/types";

const MOOD_ORDER: PaletteMood[] = ["warm", "cool", "earthy", "vivid", "muted", "dreamy"];

const MOOD_PILL_STYLES: Record<PaletteMood, { dot: string; activeClass: string; inactiveClass: string }> = {
  warm:   { dot: "#f59e0b", activeClass: "bg-amber-100 text-amber-700 border-amber-300",    inactiveClass: "text-amber-600 border-amber-200 hover:border-amber-400 hover:bg-amber-50" },
  cool:   { dot: "#0ea5e9", activeClass: "bg-sky-100 text-sky-700 border-sky-300",          inactiveClass: "text-sky-600 border-sky-200 hover:border-sky-400 hover:bg-sky-50" },
  earthy: { dot: "#84cc16", activeClass: "bg-lime-100 text-lime-700 border-lime-300",        inactiveClass: "text-lime-600 border-lime-200 hover:border-lime-400 hover:bg-lime-50" },
  vivid:  { dot: "#f43f5e", activeClass: "bg-rose-100 text-rose-700 border-rose-300",        inactiveClass: "text-rose-500 border-rose-200 hover:border-rose-400 hover:bg-rose-50" },
  muted:  { dot: "#71717a", activeClass: "bg-zinc-100 text-zinc-700 border-zinc-300",        inactiveClass: "text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50" },
  dreamy: { dot: "#8b5cf6", activeClass: "bg-violet-100 text-violet-700 border-violet-300",  inactiveClass: "text-violet-500 border-violet-200 hover:border-violet-400 hover:bg-violet-50" },
};

const SPECIAL_TAG_STYLES: Record<string, { dot: string; activeClass: string; inactiveClass: string; sidebarActiveText: string }> = {
  trend: {
    dot: "#fb7185",
    activeClass: "bg-rose-100 text-rose-700 border-rose-300 shadow-sm dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800",
    inactiveClass: "bg-[var(--surface)] text-rose-500 border-rose-200 hover:border-rose-400 hover:bg-rose-50/60 dark:text-rose-400 dark:border-rose-800/60 dark:hover:bg-rose-950/20",
    sidebarActiveText: "text-rose-500",
  },
  shared: {
    dot: "#38bdf8",
    activeClass: "bg-sky-100 text-sky-700 border-sky-300 shadow-sm dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
    inactiveClass: "bg-[var(--surface)] text-sky-500 border-sky-200 hover:border-sky-400 hover:bg-sky-50/60 dark:text-sky-400 dark:border-sky-800/60 dark:hover:bg-sky-950/20",
    sidebarActiveText: "text-sky-500",
  },
  harmony: {
    dot: "#10b981",
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    inactiveClass: "bg-[var(--surface)] text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/60 dark:text-emerald-400 dark:border-emerald-800/60 dark:hover:bg-emerald-950/20",
    sidebarActiveText: "text-emerald-600",
  },
};

function getTagDotColor(tag: string): string {
  return SPECIAL_TAG_STYLES[tag]?.dot ?? "#a1a1aa";
}

// Counts up from 0 to `value` on first mount, then tracks `value` statically.
function AnimatedStat({ value, suffix }: { value: number; suffix?: string }): JSX.Element {
  const [display, setDisplay] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const start = performance.now();
    const duration = 600;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        done.current = true;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = done.current ? value : display;
  return <>{shown}{suffix}</>
}

export default function Home() {
  const { palettes, collections, addPalette, duplicatePalette, deletePalettes, assignPalettesToCollection, updateCollection, updatePalette } = usePaletteStore();
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | "all">("all");
  const [exportTarget, setExportTarget] = useState<Palette | null>(null);
  const [renameTarget, setRenameTarget] = useState<Palette | null>(null);
  const [collectionTarget, setCollectionTarget] = useState<Palette | null>(null);
  const [harmonyTarget, setHarmonyTarget] = useState<Palette | null>(null);
  const [editTarget, setEditTarget] = useState<{ palette: Palette; swatchIndex: number } | null>(null);
  const [shadeTarget, setShadeTarget] = useState<{ hex: string; name?: string } | null>(null);
  const [compareAnchor, setCompareAnchor] = useState<Palette | null>(null);
  const [compareTarget, setCompareTarget] = useState<Palette | null>(null);
  const [cohesionTarget, setCohesionTarget] = useState<Collection | null>(null);
  const [showTrendLibrary, setShowTrendLibrary] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [forkPrompt, setForkPrompt] = useState<{ name: string; colors: { hex: string }[] } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "most-colors" | "most-notes">("newest");
  const [hoveredCollectionId, setHoveredCollectionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [collectionExporting, setCollectionExporting] = useState<string | null>(null);
  const [colorSearchActive, setColorSearchActive] = useState(false);
  const [colorSearchHex, setColorSearchHex] = useState("");
  const [colorSearchHistory, setColorSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [activeMood, setActiveMood] = useState<PaletteMood | "all">("all");
  const [activeFreezeFilter, setActiveFreezeFilter] = useState<"all" | "locked">("all");
  const [exportToast, setExportToast] = useState<{ count: number; source?: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [inlineCollectionName, setInlineCollectionName] = useState("");
  const [flashedCollectionId, setFlashedCollectionId] = useState<string | null>(null);
  const [showArchivedCollections, setShowArchivedCollections] = useState(false);

  const jumpToCollection = useCallback((id: string) => {
    setActiveCollection(id);
    setFlashedCollectionId(id);
    setTimeout(() => setFlashedCollectionId(null), 820);
  }, []);

  const commitCollectionRename = useCallback(() => {
    if (!renamingCollectionId) return;
    const trimmed = inlineCollectionName.trim();
    if (trimmed) updateCollection(renamingCollectionId, { name: trimmed });
    setRenamingCollectionId(null);
  }, [renamingCollectionId, inlineCollectionName, updateCollection]);

  const cancelCollectionRename = useCallback(() => {
    setRenamingCollectionId(null);
  }, []);

  useEffect(() => {
    if (!exportToast) return;
    const t = setTimeout(() => setExportToast(null), 3500);
    return () => clearTimeout(t);
  }, [exportToast]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("palette-color-search-history");
      if (saved) setColorSearchHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("palette-color-search-history", JSON.stringify(colorSearchHistory));
    } catch {}
  }, [colorSearchHistory]);

  // `/` focuses search bar from anywhere; Escape blurs it; `?` opens help overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "?" && !inInput) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (e.key !== "/" || inInput) return;
      e.preventDefault();
      if (colorSearchActive) {
        setColorSearchActive(false);
        setColorSearchHex("");
        setActiveMood("all");
      }
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [colorSearchActive]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fork = url.searchParams.get("fork");
    if (!fork) return;
    const [name, colorsStr] = fork.split("|");
    if (!name || !colorsStr) return;
    const colors = colorsStr
      .split(",")
      .filter((h) => /^[0-9a-fA-F]{6}$/.test(h))
      .map((h) => ({ hex: `#${h}` }));
    if (colors.length > 0) {
      setForkPrompt({ name: decodeURIComponent(name), colors });
      url.searchParams.delete("fork");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const allUniqueTags = Array.from(new Set(palettes.flatMap((p) => p.tags ?? [])));
  const untaggedCount = palettes.filter((p) => !p.tags?.length).length;
  const activeCollectionInfo = activeCollection !== "all" ? (collections.find((c) => c.id === activeCollection) ?? null) : null;
  const activeCollections = collections.filter((c) => !c.archived);
  const archivedCollections = collections.filter((c) => c.archived);
  const activeCollectionCount = activeCollectionInfo ? palettes.filter((p) => p.collectionId === activeCollection).length : 0;

  // Library stats (sidebar widget)
  const totalSwatches = palettes.reduce((sum, p) => sum + p.colors.length, 0);
  const annotationPct = palettes.length > 0
    ? Math.round((palettes.filter((p) => p.notes).length / palettes.length) * 100)
    : 0;
  const moodTally = new Map<PaletteMood, number>();
  for (const p of palettes) {
    const m = getPaletteMood(p.colors);
    moodTally.set(m, (moodTally.get(m) ?? 0) + 1);
  }
  const topMood: PaletteMood | null = palettes.length > 0
    ? [...moodTally.entries()].reduce((best, cur) => cur[1] > best[1] ? cur : best)[0]
    : null;
  const oldestCreatedAt = palettes.length > 0
    ? palettes.reduce((oldest, p) => p.createdAt < oldest ? p.createdAt : oldest, palettes[0].createdAt)
    : null;
  const oldestSince = oldestCreatedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(oldestCreatedAt))
    : null;
  const bucketSmall = palettes.filter((p) => p.colors.length <= 4).length;
  const bucketMed   = palettes.filter((p) => p.colors.length >= 5 && p.colors.length <= 6).length;
  const bucketLarge = palettes.filter((p) => p.colors.length >= 7).length;
  const bucketMax   = Math.max(bucketSmall, bucketMed, bucketLarge, 1);

  const validColorSearch = colorSearchActive && isValidHex(colorSearchHex) ? colorSearchHex : null;
  const COLOR_MATCH_THRESHOLD = 25;

  // Record each valid search hex into history (most recent first, capped at 8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!validColorSearch) return;
    setColorSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== validColorSearch.toLowerCase());
      return [validColorSearch, ...filtered].slice(0, 8);
    });
  }, [validColorSearch]);

  const baseFiltered = palettes.filter((p) => {
    const matchesCollection =
      activeCollection === "all" || p.collectionId === activeCollection;
    const matchesTag =
      activeTag === "all"
        ? true
        : activeTag === "__mine__"
        ? !p.tags?.length
        : p.tags?.includes(activeTag);

    if (validColorSearch) {
      const minDelta = Math.min(...p.colors.map((c) => deltaE(c.hex, validColorSearch)));
      return matchesCollection && matchesTag && minDelta <= COLOR_MATCH_THRESHOLD;
    }

    const q = search.toLowerCase();
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      (!!p.notes && p.notes.toLowerCase().includes(q));
    return matchesSearch && matchesCollection && matchesTag;
  });

  const moodCounts = new Map<PaletteMood, number>();
  for (const p of baseFiltered) {
    const mood = getPaletteMood(p.colors);
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
  }

  const moodFiltered =
    activeMood === "all"
      ? baseFiltered
      : baseFiltered.filter((p) => getPaletteMood(p.colors) === activeMood);

  const anyFrozen = palettes.some((p) => p.frozen);
  const frozenInView = moodFiltered.filter((p) => p.frozen).length;

  const filtered = activeFreezeFilter === "locked" ? moodFiltered.filter((p) => p.frozen) : moodFiltered;

  const sorted = validColorSearch
    ? [...filtered].sort((a, b) => {
        const aMin = Math.min(...a.colors.map((c) => deltaE(c.hex, validColorSearch)));
        const bMin = Math.min(...b.colors.map((c) => deltaE(c.hex, validColorSearch)));
        return aMin - bMin;
      })
    : [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "name-asc": return a.name.localeCompare(b.name);
          case "name-desc": return b.name.localeCompare(a.name);
          case "most-colors": return b.colors.length - a.colors.length;
          case "most-notes": return (b.notes?.length ?? 0) - (a.notes?.length ?? 0);
        }
      });

  const coverPaletteId = activeCollectionInfo?.coverPaletteId ?? null;

  const frozenSelectedCount = selectedIds.size > 0
    ? [...selectedIds].filter(id => palettes.find(p => p.id === id)?.frozen).length
    : 0;
  const deletableSelectedIds = selectedIds.size > 0
    ? [...selectedIds].filter(id => !palettes.find(p => p.id === id)?.frozen)
    : [];

  // Pin cover palette to front of grid when browsing a specific collection
  const displayList = (() => {
    if (activeCollection === "all" || !coverPaletteId) return sorted;
    const coverIdx = sorted.findIndex((p) => p.id === coverPaletteId);
    if (coverIdx <= 0) return sorted;
    const reordered = [...sorted];
    const [cover] = reordered.splice(coverIdx, 1);
    reordered.unshift(cover);
    return reordered;
  })();

  const handleSetCover = (palette: Palette) => {
    if (activeCollection === "all") return;
    const newCoverId = palette.id === coverPaletteId ? undefined : palette.id;
    updateCollection(activeCollection, { coverPaletteId: newCoverId });
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setBulkDeleteConfirm(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(sorted.map((p) => p.id)));
    setBulkDeleteConfirm(false);
  }, [sorted]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-300 via-violet-300 to-sky-300 flex-shrink-0" />
            <span className="text-base font-semibold tracking-tight">Palette</span>
            <span className="text-xs text-[var(--muted)] hidden sm:block">— color intelligence for creators</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <Sparkles size={12} />
              <span>{palettes.length} palette{palettes.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              title="Keyboard shortcuts (?)"
              className="flex items-center justify-center w-5 h-5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors text-[11px] font-semibold font-mono border border-[var(--border)] leading-none"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          {/* Left panel — Extractor */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Extract
              </h2>
              <Extractor />
            </div>

            {/* Library stats panel */}
            {palettes.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                  Stats
                </h2>
                <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden text-center">
                  <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={palettes.length} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">palettes</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={totalSwatches} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">swatches</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={collections.length} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">collections</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)]">
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={annotationPct} suffix="%" />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">annotated</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)] flex flex-col items-center justify-center">
                      {topMood ? (
                        <>
                          <div className="flex items-center gap-1 leading-none">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MOOD_PILL_STYLES[topMood].dot }}
                            />
                            <span className="text-[11px] font-semibold">{topMood}</span>
                          </div>
                          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">top mood</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold leading-none">—</div>
                          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">top mood</div>
                        </>
                      )}
                    </div>
                    <div
                      className="px-2 py-2.5 bg-[var(--surface)]"
                      title={oldestCreatedAt ? `Oldest palette: ${formatDate(oldestCreatedAt)}` : undefined}
                    >
                      <div className="text-[11px] font-semibold leading-none truncate">{oldestSince ?? "—"}</div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">oldest</div>
                    </div>
                  </div>
                  {/* Sparkline — palette size distribution */}
                  <div className="border-t border-[var(--border)] px-3 py-2 bg-[var(--surface)]">
                    <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mb-2">size distribution</div>
                    <div className="flex gap-1.5">
                      {[
                        { label: "1–4", count: bucketSmall, color: "#a78bfa" },
                        { label: "5–6", count: bucketMed,   color: "#818cf8" },
                        { label: "7+",  count: bucketLarge,  color: "#60a5fa" },
                      ].map(({ label, count, color }) => {
                        const barH = count === 0 ? 2 : Math.max(3, Math.round((count / bucketMax) * 24));
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex flex-col justify-end mb-1" style={{ height: 24 }}>
                              <div
                                className="w-full rounded-[2px] transition-all duration-500"
                                style={{
                                  height: barH,
                                  backgroundColor: count > 0 ? color : "var(--border)",
                                }}
                                title={`${count} palette${count !== 1 ? "s" : ""}`}
                              />
                            </div>
                            <div className="text-[8px] text-[var(--muted)] leading-none">{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discover button */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Discover
              </h2>
              <button
                onClick={() => setShowTrendLibrary(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all text-sm group"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-rose-200 via-violet-200 to-sky-200 flex items-center justify-center flex-shrink-0">
                  <Compass size={13} className="text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[var(--foreground)]">Trend Library</div>
                  <div className="text-[11px] text-[var(--muted)]">22 seasonal palettes to fork</div>
                </div>
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all text-sm group mt-1"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Import size={13} className="text-teal-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[var(--foreground)]">Import Palette</div>
                  <div className="text-[11px] text-[var(--muted)]">Hex codes or from a URL</div>
                </div>
              </button>
              {/* Tag inventory — compact count summary */}
              {palettes.length > 0 && (allUniqueTags.length > 0 || untaggedCount > 0) && (
                <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 pl-1">
                  {untaggedCount > 0 && (
                    <button
                      onClick={() => setActiveTag("__mine__")}
                      className={`text-[11px] transition-colors ${
                        activeTag === "__mine__"
                          ? "text-[var(--accent)] font-medium"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Mine <span className="tabular-nums font-semibold">{untaggedCount}</span>
                    </button>
                  )}
                  {allUniqueTags.map((tag) => {
                    const count = palettes.filter((p) => p.tags?.includes(tag)).length;
                    const label = tag.charAt(0).toUpperCase() + tag.slice(1);
                    const specialStyle = SPECIAL_TAG_STYLES[tag];
                    return (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          activeTag === tag
                            ? `${specialStyle?.sidebarActiveText ?? "text-[var(--accent)]"} font-medium`
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: specialStyle?.dot ?? getTagDotColor(tag) }}
                        />
                        {label} <span className="tabular-nums font-semibold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collections sidebar */}
            {collections.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                  Collections
                </h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveCollection("all")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                      activeCollection === "all"
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                    }`}
                  >
                    <Layers size={13} />
                    All palettes
                    <span className="ml-auto text-xs opacity-60">{palettes.length}</span>
                  </button>
                  {activeCollections.map((c) => {
                    const collectionPalettes = palettes.filter((p) => p.collectionId === c.id);
                    const count = collectionPalettes.length;
                    const swatchCount = collectionPalettes.reduce((acc, p) => acc + p.colors.length, 0);
                    const cohesionScore = count >= 2 ? computeCohesionScore(collectionPalettes) : null;
                    const scoreColor =
                      cohesionScore === null ? undefined :
                      cohesionScore >= 80 ? "#10b981" :
                      cohesionScore >= 60 ? "#0ea5e9" :
                      cohesionScore >= 40 ? "#f59e0b" : "#f43f5e";
                    const isActive = activeCollection === c.id;
                    const isRenaming = renamingCollectionId === c.id;
                    const isFlashing = flashedCollectionId === c.id;

                    const scoreAndCount = (
                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        {cohesionScore !== null && (
                          <span
                            className="text-[9px] font-bold tabular-nums leading-none"
                            style={{ color: isActive ? "currentColor" : scoreColor, opacity: isActive ? 0.75 : 1 }}
                            title={`Cohesion score: ${cohesionScore}/100`}
                          >
                            {cohesionScore}
                          </span>
                        )}
                        <div
                          className="flex flex-col items-end leading-none gap-[2px]"
                          title={`${count} palette${count !== 1 ? "s" : ""} · ${swatchCount} swatch${swatchCount !== 1 ? "es" : ""}`}
                        >
                          <span className="text-xs opacity-60 tabular-nums">{count}</span>
                          {swatchCount > 0 && (
                            <span className="text-[8px] opacity-35 tabular-nums">{swatchCount}</span>
                          )}
                        </div>
                      </div>
                    );

                    return (
                      <div
                        key={c.id}
                        className="group/col relative flex items-center gap-1"
                        onMouseEnter={() => !isRenaming && setHoveredCollectionId(c.id)}
                        onMouseLeave={() => setHoveredCollectionId(null)}
                      >
                        {isFlashing && (
                          <div
                            className="absolute inset-0 rounded-[var(--radius-sm)] pointer-events-none"
                            style={{
                              background: "rgba(139,92,246,1)",
                              animation: "col-flash 750ms ease-out forwards",
                            }}
                          />
                        )}
                        {isRenaming ? (
                          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm ${
                            isActive ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--surface-2)]"
                          }`}>
                            <FolderOpen size={13} className="shrink-0" />
                            <input
                              autoFocus
                              type="text"
                              value={inlineCollectionName}
                              onChange={(e) => setInlineCollectionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); commitCollectionRename(); }
                                if (e.key === "Escape") { e.preventDefault(); cancelCollectionRename(); }
                              }}
                              onBlur={commitCollectionRename}
                              className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                              spellCheck={false}
                            />
                            {scoreAndCount}
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveCollection(c.id)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                              isActive
                                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                            }`}
                          >
                            <FolderOpen size={13} className="shrink-0" />
                            <span
                              className="truncate"
                              title={c.description ? `${c.description}\n\nDouble-click to rename` : "Double-click to rename"}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenamingCollectionId(c.id);
                                setInlineCollectionName(c.name);
                                setHoveredCollectionId(null);
                              }}
                            >
                              {c.name}
                            </span>
                            {scoreAndCount}
                          </button>
                        )}
                        {!isRenaming && count > 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (collectionExporting === c.id) return;
                              setCollectionExporting(c.id);
                              try {
                                await batchExportZip(collectionPalettes, c.name);
                                setExportToast({ count: collectionPalettes.length, source: c.name });
                              } finally {
                                setCollectionExporting(null);
                              }
                            }}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                            title={`Export all ${count} palette${count !== 1 ? "s" : ""} in "${c.name}" as ZIP`}
                          >
                            {collectionExporting === c.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Download size={12} />
                            }
                          </button>
                        )}
                        {!isRenaming && (
                          <button
                            onClick={() => {
                              if (activeCollection === c.id) setActiveCollection("all");
                              updateCollection(c.id, { archived: true });
                            }}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-amber-500 shrink-0"
                            title={`Archive "${c.name}"`}
                          >
                            <Archive size={12} />
                          </button>
                        )}
                        {!isRenaming && (
                          <button
                            onClick={() => setCohesionTarget(c)}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                            title="Cohesion view"
                          >
                            <BarChart2 size={12} />
                          </button>
                        )}

                        {/* Palette preview tooltip — appears on hover to the right */}
                        {!isRenaming && collectionPalettes.length > 0 && (
                          <div
                            className={`hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 transition-opacity duration-200 ${
                              hoveredCollectionId === c.id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                            }`}
                            onMouseEnter={() => setHoveredCollectionId(c.id)}
                            onMouseLeave={() => setHoveredCollectionId(null)}
                          >
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-2xl p-3 w-60">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2.5 truncate">{c.name}</p>
                              <div className="space-y-1">
                                {collectionPalettes.slice(0, 7).map((p) => (
                                  <div key={p.id} className="group/row flex items-center gap-2">
                                    <div className="flex rounded-sm overflow-hidden h-[14px] flex-1 min-w-0">
                                      {p.colors.slice(0, 8).map((color, i) => (
                                        <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-[var(--muted)] truncate shrink-0 max-w-[64px]">{p.name}</span>
                                    <button
                                      onClick={() => duplicatePalette(p.id)}
                                      title={`Duplicate "${p.name}"`}
                                      className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                    >
                                      <CopyPlus size={10} />
                                    </button>
                                  </div>
                                ))}
                                {collectionPalettes.length > 7 && (
                                  <p className="text-[9px] text-[var(--muted)] text-center pt-0.5">
                                    +{collectionPalettes.length - 7} more
                                  </p>
                                )}
                              </div>
                              {cohesionScore !== null && (
                                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                                  <span className="text-[9px] text-[var(--muted)]">Cohesion</span>
                                  <span className="text-[10px] font-bold tabular-nums" style={{ color: scoreColor ?? "var(--muted)" }}>
                                    {cohesionScore}/100
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Archived collections — collapsible section */}
                {archivedCollections.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => setShowArchivedCollections((v) => !v)}
                      className="w-full flex items-center gap-1.5 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {showArchivedCollections ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      Archived · {archivedCollections.length}
                    </button>
                    <AnimatePresence>
                      {showArchivedCollections && (
                        <motion.div
                          key="archived-list"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5 mt-1.5">
                            {archivedCollections.map((c) => {
                              const count = palettes.filter((p) => p.collectionId === c.id).length;
                              const isActive = activeCollection === c.id;
                              return (
                                <div key={c.id} className="group/col-arch flex items-center gap-1">
                                  <button
                                    onClick={() => setActiveCollection(c.id)}
                                    className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs transition-colors ${
                                      isActive
                                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                                    }`}
                                  >
                                    <FolderOpen size={11} className="shrink-0 opacity-60" />
                                    <span className="truncate">{c.name}</span>
                                    <span className="ml-auto opacity-50">{count}</span>
                                  </button>
                                  <button
                                    onClick={() => updateCollection(c.id, { archived: false })}
                                    className="p-1.5 rounded opacity-0 group-hover/col-arch:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-emerald-600 shrink-0"
                                    title={`Restore "${c.name}" to active collections`}
                                  >
                                    <RotateCcw size={11} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — Library */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0">
                Library
              </h2>
              {activeCollectionInfo && (
                <span className="text-[11px] text-[var(--muted)] font-normal normal-case tracking-normal shrink-0 truncate max-w-[140px]">
                  — {activeCollectionInfo.name} · {activeCollectionCount}
                </span>
              )}
              {palettes.length > 0 && (
                <>
                  {!colorSearchActive && (
                    <>
                      <div className="flex-1 relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.currentTarget.blur();
                              setSearch("");
                            }
                          }}
                          placeholder="Search palettes & notes…"
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-8 pr-8 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
                        />
                        {!search && (
                          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] font-mono bg-[var(--surface-2)] border border-[var(--border)] rounded px-1 py-0.5 pointer-events-none select-none leading-none">
                            /
                          </kbd>
                        )}
                        {search && (
                          <button
                            onClick={() => { setSearch(""); searchInputRef.current?.focus(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            aria-label="Clear search"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] px-2 py-1.5 text-[var(--muted)] hover:border-[var(--accent)] transition-colors">
                        <ArrowUpDown size={11} className="shrink-0" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          className="bg-transparent outline-none text-xs text-[var(--foreground)] cursor-pointer appearance-none"
                          aria-label="Sort palettes"
                        >
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                          <option value="name-asc">Name A→Z</option>
                          <option value="name-desc">Name Z→A</option>
                          <option value="most-colors">Most colors</option>
                          <option value="most-notes">Most annotated</option>
                        </select>
                      </div>
                    </>
                  )}
                  {colorSearchActive && (
                    <>
                      {/* Color swatch + native picker */}
                      <div
                        className="relative w-8 h-8 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 border-2 border-[var(--accent)] cursor-pointer"
                        style={{ backgroundColor: validColorSearch || "#cccccc" }}
                        title="Click to open color picker"
                      >
                        <input
                          type="color"
                          value={validColorSearch || "#cccccc"}
                          onChange={(e) => setColorSearchHex(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          aria-label="Pick a color"
                        />
                      </div>
                      {/* Hex input */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={colorSearchHex}
                          onChange={(e) => {
                            let v = e.target.value.trim();
                            if (v && !v.startsWith("#")) v = "#" + v;
                            setColorSearchHex(v.slice(0, 7));
                          }}
                          onFocus={async () => {
                            setShowSearchHistory(true);
                            if (colorSearchHex) return;
                            try {
                              const text = await navigator.clipboard.readText();
                              const cleaned = text.trim();
                              const hex = cleaned.startsWith("#") ? cleaned : "#" + cleaned;
                              if (isValidHex(hex)) setColorSearchHex(hex);
                            } catch { /* clipboard access denied */ }
                          }}
                          onBlur={() => setTimeout(() => setShowSearchHistory(false), 150)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setShowSearchHistory(false);
                          }}
                          placeholder="#rrggbb — find by color"
                          autoFocus
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--accent)] rounded-[var(--radius-sm)] pl-3 pr-3 py-1.5 outline-none transition-colors placeholder:text-[var(--muted)] font-mono"
                          spellCheck={false}
                        />
                        <AnimatePresence>
                          {showSearchHistory && colorSearchHistory.length > 0 && (
                            <motion.div
                              key="color-search-history"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-xl z-50 overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Recent</span>
                                <button
                                  onMouseDown={(e) => { e.preventDefault(); setColorSearchHistory([]); setShowSearchHistory(false); }}
                                  className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                >
                                  Clear
                                </button>
                              </div>
                              {colorSearchHistory.map((hex) => (
                                <button
                                  key={hex}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setColorSearchHex(hex);
                                    setShowSearchHistory(false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[var(--surface-2)] transition-colors text-left"
                                >
                                  <div
                                    className="w-5 h-5 rounded-sm flex-shrink-0 border border-[var(--border)]"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span className="text-sm font-mono text-[var(--foreground)]">{hex}</span>
                                </button>
                              ))}
                              <div className="h-1.5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {validColorSearch && (
                        <span className="text-[10px] text-[var(--muted)] shrink-0 whitespace-nowrap">sorted by match</span>
                      )}
                    </>
                  )}
                  {/* Color search toggle */}
                  <button
                    onClick={() => {
                      if (colorSearchActive) setActiveMood("all");
                      setColorSearchActive(!colorSearchActive);
                      setColorSearchHex("");
                    }}
                    title={colorSearchActive ? "Exit color search" : "Search by color"}
                    className={`p-1.5 rounded-[var(--radius-sm)] border transition-all shrink-0 ${
                      colorSearchActive
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Pipette size={13} />
                  </button>
                </>
              )}
            </div>

            {/* Inline mood filter — only shown when color search is active */}
            <AnimatePresence>
              {colorSearchActive && validColorSearch && baseFiltered.length > 0 && (
                <motion.div
                  key="color-search-mood"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5">
                      Filter
                    </span>
                    {/* Mood pills sourced from color-search results */}
                    {moodCounts.size >= 2 && (
                      <>
                        <button
                          onClick={() => setActiveMood("all")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeMood === "all"
                              ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                          title="Show all moods"
                        >
                          All moods
                          <span className={`text-[10px] ${activeMood === "all" ? "opacity-70" : "opacity-50"}`}>
                            {baseFiltered.length}
                          </span>
                        </button>
                        {MOOD_ORDER.filter((m) => moodCounts.has(m)).map((mood) => {
                          const count = moodCounts.get(mood)!;
                          const style = MOOD_PILL_STYLES[mood];
                          const isActive = activeMood === mood;
                          return (
                            <button
                              key={mood}
                              onClick={() => setActiveMood(isActive ? "all" : mood)}
                              title={`${isActive ? "Clear" : "Show only"} ${mood} palettes`}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isActive ? style.activeClass : style.inactiveClass
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: style.dot }}
                              />
                              {mood.charAt(0).toUpperCase() + mood.slice(1)}
                              <span className="text-[10px] opacity-60">{count}</span>
                            </button>
                          );
                        })}
                        {anyFrozen && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                      </>
                    )}
                    {/* Locked pill — always shown in color search context when any frozen */}
                    {anyFrozen && (
                      <button
                        onClick={() => setActiveFreezeFilter(activeFreezeFilter === "locked" ? "all" : "locked")}
                        title={activeFreezeFilter === "locked" ? "Show all palettes" : "Show only locked palettes"}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                          activeFreezeFilter === "locked"
                            ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                            : "bg-[var(--surface)] text-indigo-500 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:text-indigo-400 dark:border-indigo-800/60 dark:hover:bg-indigo-950/20"
                        }`}
                      >
                        <Lock size={9} className="flex-shrink-0" />
                        Locked
                        <span className="text-[10px] opacity-60">{frozenInView}</span>
                      </button>
                    )}
                    {/* Special tag pills (harmony, trend, shared) present in color search results */}
                    {(() => {
                      const specialTagsInResults = ["harmony", "trend", "shared"]
                        .filter((tag) => baseFiltered.some((p) => p.tags?.includes(tag)));
                      if (specialTagsInResults.length === 0) return null;
                      return (
                        <>
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                          {specialTagsInResults.map((tag) => {
                            const style = SPECIAL_TAG_STYLES[tag];
                            if (!style) return null;
                            const count = baseFiltered.filter((p) => p.tags?.includes(tag)).length;
                            const isActive = activeTag === tag;
                            return (
                              <button
                                key={tag}
                                onClick={() => setActiveTag(isActive ? "all" : tag)}
                                title={`${isActive ? "Clear" : "Show only"} ${tag} palettes`}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                  isActive ? style.activeClass : style.inactiveClass
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                <span className="text-[10px] opacity-60">{count}</span>
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                    {/* Single-mood label when only one mood in results */}
                    {moodCounts.size === 1 && (() => {
                      const [mood] = [...moodCounts.keys()];
                      const style = MOOD_PILL_STYLES[mood];
                      return (
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.inactiveClass}`}
                          title={`All ${baseFiltered.length} matching palettes are ${mood} mood`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                          {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          <span className="text-[10px] opacity-60">{baseFiltered.length}</span>
                        </span>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag filter pills */}
            <AnimatePresence>
              {allUniqueTags.length > 0 && (
                <motion.div
                  key="tag-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { key: "all", label: "All", count: palettes.length },
                      ...(untaggedCount > 0 ? [{ key: "__mine__", label: "Mine", count: untaggedCount }] : []),
                      ...allUniqueTags.map((tag) => ({
                        key: tag,
                        label: tag.charAt(0).toUpperCase() + tag.slice(1),
                        count: palettes.filter((p) => p.tags?.includes(tag)).length,
                      })),
                    ].map(({ key, label, count }) => {
                      const specialStyle = SPECIAL_TAG_STYLES[key];
                      const isActive = activeTag === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveTag(key)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            isActive
                              ? (specialStyle?.activeClass ?? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm")
                              : (specialStyle?.inactiveClass ?? "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]")
                          }`}
                        >
                          {key !== "all" && key !== "__mine__" && (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: specialStyle?.dot ?? getTagDotColor(key) }}
                            />
                          )}
                          {label}
                          <span className={`text-[10px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood + Locked filter pills — hidden when color search is active (inline strip handles it) */}
            <AnimatePresence>
              {!colorSearchActive && (moodCounts.size >= 2 || anyFrozen) && (
                <motion.div
                  key="mood-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {moodCounts.size >= 2 && (
                      <>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5">
                          Mood
                        </span>
                        <button
                          onClick={() => setActiveMood("all")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeMood === "all"
                              ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          All
                          <span className={`text-[10px] ${activeMood === "all" ? "opacity-70" : "opacity-50"}`}>
                            {baseFiltered.length}
                          </span>
                        </button>
                        {MOOD_ORDER.filter((m) => moodCounts.has(m)).map((mood) => {
                          const count = moodCounts.get(mood)!;
                          const style = MOOD_PILL_STYLES[mood];
                          const isActive = activeMood === mood;
                          const label = mood.charAt(0).toUpperCase() + mood.slice(1);
                          return (
                            <button
                              key={mood}
                              onClick={() => setActiveMood(isActive ? "all" : mood)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isActive ? style.activeClass : style.inactiveClass
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: style.dot }}
                              />
                              {label}
                              <span className="text-[10px] opacity-60">{count}</span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Locked filter pill — separated visually when mood pills also present */}
                    {anyFrozen && (
                      <>
                        {moodCounts.size >= 2 && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setActiveFreezeFilter(activeFreezeFilter === "locked" ? "all" : "locked")}
                          title={activeFreezeFilter === "locked" ? "Show all palettes" : "Show only locked palettes"}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeFreezeFilter === "locked"
                              ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                              : "bg-[var(--surface)] text-indigo-500 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:text-indigo-400 dark:border-indigo-800/60 dark:hover:bg-indigo-950/20"
                          }`}
                        >
                          <Lock size={9} className="flex-shrink-0" />
                          Locked
                          <span className="text-[10px] opacity-60">{frozenInView}</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compare anchor hint banner */}
            <AnimatePresence>
              {compareAnchor && !compareTarget && (
                <motion.div
                  key="compare-hint"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] border border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 text-sm">
                    <ArrowLeftRight size={13} className="text-violet-500 shrink-0" />
                    <span className="text-violet-700 dark:text-violet-400 text-xs">
                      Comparing <strong className="font-semibold">{compareAnchor.name}</strong> — click{" "}
                      <ArrowLeftRight size={10} className="inline -mt-0.5 mx-0.5" /> on another palette to compare
                    </span>
                    <button
                      onClick={() => setCompareAnchor(null)}
                      className="ml-auto p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-400 hover:text-violet-600 transition-colors shrink-0"
                      title="Cancel compare"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {palettes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex gap-1.5 mb-4">
                  {["#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#fcd34d"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-sm text-[var(--muted)]">Drop an image to extract your first palette</p>
              </div>
            ) : activeCollection !== "all" && activeCollectionCount === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30 border border-[var(--border)] flex items-center justify-center">
                  <FolderOpen size={26} className="text-[var(--muted)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  &ldquo;{activeCollectionInfo?.name}&rdquo; is empty
                </p>
                <p className="text-xs text-[var(--muted)] max-w-[240px] leading-relaxed mb-6">
                  Click the <FolderOpen size={11} className="inline-block align-middle -mt-0.5 mx-0.5" /> icon on any palette card, or select multiple palettes and use the bulk action bar to add them here.
                </p>
                <button
                  onClick={() => setActiveCollection("all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Layers size={12} />
                  Browse all palettes
                </button>
              </motion.div>
            ) : sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                {/* Faded palette strip with search icon overlay */}
                <div className="relative mb-5 w-44 h-10">
                  <div className="absolute inset-0 flex rounded-xl overflow-hidden opacity-[0.18] blur-[2px]">
                    {["#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#fcd34d", "#fb923c"].map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center justify-center">
                      <Search size={15} className="text-[var(--muted)]" />
                    </div>
                  </div>
                </div>

                <p className="text-sm font-semibold text-[var(--foreground)] mb-1.5">No matching palettes</p>
                <p className="text-xs text-[var(--muted)] max-w-[260px] leading-relaxed mb-5">
                  {validColorSearch
                    ? `No palettes contain a color within ΔE ≤ ${COLOR_MATCH_THRESHOLD} of ${validColorSearch}.`
                    : "Try adjusting or clearing the active filters below."}
                </p>

                {/* Active filter chips — each dismissible individually */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-5 max-w-xs">
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <Search size={10} className="shrink-0" />
                      &ldquo;{search}&rdquo;
                      <X size={10} className="ml-0.5 shrink-0" />
                    </button>
                  )}
                  {activeTag !== "all" && (
                    <button
                      onClick={() => setActiveTag("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: activeTag === "__mine__" ? "#a1a1aa" : getTagDotColor(activeTag) }}
                      />
                      {activeTag === "__mine__" ? "Mine" : activeTag.charAt(0).toUpperCase() + activeTag.slice(1)}
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeMood !== "all" && (
                    <button
                      onClick={() => setActiveMood("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: MOOD_PILL_STYLES[activeMood].dot }}
                      />
                      {activeMood.charAt(0).toUpperCase() + activeMood.slice(1)} mood
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeCollection !== "all" && (
                    <button
                      onClick={() => setActiveCollection("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <FolderOpen size={10} className="shrink-0" />
                      {activeCollectionInfo?.name ?? "Collection"}
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {validColorSearch && (
                    <button
                      onClick={() => { setColorSearchActive(false); setColorSearchHex(""); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-[var(--border-subtle)]"
                        style={{ backgroundColor: validColorSearch }}
                      />
                      {validColorSearch}
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeFreezeFilter === "locked" && (
                    <button
                      onClick={() => setActiveFreezeFilter("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <Lock size={10} className="shrink-0 text-indigo-400" />
                      Locked only
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setActiveTag("all");
                    setActiveMood("all");
                    setActiveFreezeFilter("all");
                    setColorSearchActive(false);
                    setColorSearchHex("");
                  }}
                  className="gap-1.5"
                >
                  <X size={12} />
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {displayList.map((palette) => {
                    const isCoverPalette = activeCollection !== "all" && palette.id === coverPaletteId;
                    const palCollectionName = palette.collectionId
                      ? (collections.find((c) => c.id === palette.collectionId)?.name)
                      : undefined;
                    return (
                      <PaletteCard
                        key={palette.id}
                        palette={palette}
                        onExport={setExportTarget}
                        onRename={setRenameTarget}
                        onAssignCollection={setCollectionTarget}
                        onHarmony={setHarmonyTarget}
                        onEditSwatch={(p, i) => setEditTarget({ palette: p, swatchIndex: i })}
                        onShadeScale={(p, i) => setShadeTarget({ hex: p.colors[i].hex, name: p.colors[i].name })}
                        onCompare={(p) => {
                          if (!compareAnchor) {
                            setCompareAnchor(p);
                          } else if (compareAnchor.id === p.id) {
                            setCompareAnchor(null);
                          } else {
                            setCompareTarget(p);
                          }
                        }}
                        isCompareAnchor={compareAnchor?.id === palette.id}
                        onDuplicate={(p) => duplicatePalette(p.id)}
                        isSelected={selectedIds.has(palette.id)}
                        selectionActive={selectedIds.size > 0}
                        onSelect={toggleSelect}
                        colorMatchHex={validColorSearch ?? undefined}
                        isCover={isCoverPalette}
                        onSetCover={activeCollection !== "all" ? handleSetCover : undefined}
                        className={isCoverPalette ? "sm:col-span-2" : ""}
                        searchQuery={search || undefined}
                        collectionName={palCollectionName}
                        onJumpToCollection={jumpToCollection}
                        onClearCollection={palette.collectionId ? () => updatePalette(palette.id, { collectionId: undefined }) : undefined}
                        onFilterByTag={(tag) => setActiveTag(activeTag === tag ? "all" : tag)}
                        activeTag={activeTag !== "all" ? activeTag : undefined}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <ShadeModal
        color={shadeTarget}
        onClose={() => setShadeTarget(null)}
        onSaveAsPalette={(colors) => {
          const baseName = shadeTarget?.name || shadeTarget?.hex?.toUpperCase() || "Color";
          addPalette({ name: `${baseName} · Shades`, colors, tags: ["shades"] });
        }}
      />
      <CompareModal
        paletteA={compareAnchor}
        paletteB={compareTarget}
        onClose={() => { setCompareAnchor(null); setCompareTarget(null); }}
      />
      <ExportModal palette={exportTarget} onClose={() => setExportTarget(null)} />
      <RenameModal palette={renameTarget} onClose={() => setRenameTarget(null)} />
      <CollectionModal palette={collectionTarget} onClose={() => setCollectionTarget(null)} />
      <HarmonyModal palette={harmonyTarget} onClose={() => setHarmonyTarget(null)} />
      <SwatchEditor
        palette={editTarget?.palette ?? null}
        swatchIndex={editTarget?.swatchIndex ?? 0}
        onClose={() => setEditTarget(null)}
      />
      <CohesionModal
        collection={cohesionTarget}
        palettes={cohesionTarget ? palettes.filter((p) => p.collectionId === cohesionTarget.id) : []}
        onClose={() => setCohesionTarget(null)}
        onEditPalette={(palette, swatchIndex) => setEditTarget({ palette, swatchIndex })}
      />
      {showTrendLibrary && (
        <TrendLibrary
          onClose={() => setShowTrendLibrary(false)}
          onFork={(colors, name) => {
            addPalette({ name, colors: colors.map((hex) => ({ hex })), tags: ["trend"] });
          }}
        />
      )}
      <AnimatePresence>
        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
            onImport={(name, colors) => {
              addPalette({ name, colors, tags: [] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 72, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="text-[var(--accent)] shrink-0" />
                <span className="text-sm font-medium">
                  {selectedIds.size} palette{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                {sorted.length > selectedIds.size && (
                  <button
                    onClick={selectAllVisible}
                    className="text-xs text-[var(--accent)] hover:underline shrink-0"
                  >
                    Select all {sorted.length}
                  </button>
                )}
              </div>

              <div className="flex-1" />

              {/* Assign to collection */}
              {activeCollections.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <FolderOpen size={13} className="text-[var(--muted)]" />
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const colId = e.target.value === "__none__" ? undefined : e.target.value;
                      assignPalettesToCollection([...selectedIds], colId);
                      clearSelection();
                      e.target.value = "";
                    }}
                    className="text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer transition-colors"
                    aria-label="Assign to collection"
                  >
                    <option value="" disabled>Move to collection…</option>
                    <option value="__none__">Remove from collection</option>
                    {activeCollections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batch export ZIP */}
              <Button
                variant="outline"
                size="sm"
                disabled={bulkExporting}
                onClick={async () => {
                  setBulkExporting(true);
                  const targets = palettes.filter((p) => selectedIds.has(p.id));
                  try {
                    await batchExportZip(targets);
                    setExportToast({ count: targets.length });
                  } finally {
                    setBulkExporting(false);
                  }
                }}
                className="shrink-0 gap-1.5"
                title="Download selected palettes as a ZIP of PNG cards"
              >
                {bulkExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {bulkExporting ? "Exporting…" : `Export ZIP`}
              </Button>

              {/* Bulk delete */}
              <Button
                variant={bulkDeleteConfirm ? "danger" : "outline"}
                size="sm"
                disabled={deletableSelectedIds.length === 0}
                onClick={() => {
                  if (bulkDeleteConfirm) {
                    deletePalettes(deletableSelectedIds);
                    clearSelection();
                  } else {
                    setBulkDeleteConfirm(true);
                    setTimeout(() => setBulkDeleteConfirm(false), 2500);
                  }
                }}
                className="shrink-0 gap-1.5"
                title={deletableSelectedIds.length === 0 ? "All selected palettes are locked" : undefined}
              >
                <Trash2 size={13} />
                {bulkDeleteConfirm
                  ? frozenSelectedCount > 0
                    ? `Delete ${deletableSelectedIds.length} (${frozenSelectedCount} locked)`
                    : `Delete ${selectedIds.size}?`
                  : `Delete ${selectedIds.size}`}
              </Button>

              {/* Clear selection */}
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors shrink-0"
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export success toast */}
      <AnimatePresence>
        {exportToast && (
          <motion.div
            key="export-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl px-4 py-3 flex items-center gap-3 max-w-xs"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] leading-tight">
                {exportToast.count === 1 ? "1 palette exported" : `${exportToast.count} palettes exported`}
              </p>
              <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
                {exportToast.source ? `${exportToast.source} · ZIP downloaded` : "ZIP downloaded"}
              </p>
            </div>
            <button
              onClick={() => setExportToast(null)}
              className="flex-shrink-0 p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard help overlay */}
      <KeyboardHelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Fork-from-share toast */}
      <AnimatePresence>
        {forkPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100vw-2rem)]"
          >
            {/* Palette strip preview */}
            <div className="flex rounded-md overflow-hidden h-10 w-20 flex-shrink-0">
              {forkPrompt.colors.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{forkPrompt.name}</p>
              <p className="text-xs text-[var(--muted)]">Fork this palette to your library?</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  addPalette({ name: forkPrompt.name, colors: forkPrompt.colors, tags: ["shared"] });
                  setForkPrompt(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <BookMarked size={11} />
                Fork
              </button>
              <button
                onClick={() => setForkPrompt(null)}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
