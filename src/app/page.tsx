"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Search, FolderOpen, Sparkles, BarChart2, Compass, BookMarked, X, ArrowUpDown, Trash2, CheckSquare, Pipette, Download, Loader2 } from "lucide-react";
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
import { computeCohesionScore, deltaE, isValidHex, getPaletteMood, type PaletteMood } from "@/lib/utils";
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

function getTagDotColor(tag: string): string {
  if (tag === "trend") return "#fb7185";
  if (tag === "shared") return "#38bdf8";
  return "#a1a1aa";
}

export default function Home() {
  const { palettes, collections, addPalette, duplicatePalette, deletePalettes, assignPalettesToCollection } = usePaletteStore();
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | "all">("all");
  const [exportTarget, setExportTarget] = useState<Palette | null>(null);
  const [renameTarget, setRenameTarget] = useState<Palette | null>(null);
  const [collectionTarget, setCollectionTarget] = useState<Palette | null>(null);
  const [harmonyTarget, setHarmonyTarget] = useState<Palette | null>(null);
  const [editTarget, setEditTarget] = useState<{ palette: Palette; swatchIndex: number } | null>(null);
  const [cohesionTarget, setCohesionTarget] = useState<Collection | null>(null);
  const [showTrendLibrary, setShowTrendLibrary] = useState(false);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [forkPrompt, setForkPrompt] = useState<{ name: string; colors: { hex: string }[] } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "most-colors">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [colorSearchActive, setColorSearchActive] = useState(false);
  const [colorSearchHex, setColorSearchHex] = useState("");
  const [activeMood, setActiveMood] = useState<PaletteMood | "all">("all");

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
  const activeCollectionCount = activeCollectionInfo ? palettes.filter((p) => p.collectionId === activeCollection).length : 0;

  const validColorSearch = colorSearchActive && isValidHex(colorSearchHex) ? colorSearchHex : null;
  const COLOR_MATCH_THRESHOLD = 25;

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

    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCollection && matchesTag;
  });

  const moodCounts = new Map<PaletteMood, number>();
  for (const p of baseFiltered) {
    const mood = getPaletteMood(p.colors);
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
  }

  const filtered =
    activeMood === "all"
      ? baseFiltered
      : baseFiltered.filter((p) => getPaletteMood(p.colors) === activeMood);

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
        }
      });

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
          <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
            <Sparkles size={12} />
            <span>{palettes.length} palette{palettes.length !== 1 ? "s" : ""}</span>
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
                    return (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          activeTag === tag
                            ? "text-[var(--accent)] font-medium"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getTagDotColor(tag) }}
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
                  {collections.map((c) => {
                    const collectionPalettes = palettes.filter((p) => p.collectionId === c.id);
                    const count = collectionPalettes.length;
                    const cohesionScore = count >= 2 ? computeCohesionScore(collectionPalettes) : null;
                    const scoreColor =
                      cohesionScore === null ? undefined :
                      cohesionScore >= 80 ? "#10b981" :
                      cohesionScore >= 60 ? "#0ea5e9" :
                      cohesionScore >= 40 ? "#f59e0b" : "#f43f5e";
                    const isActive = activeCollection === c.id;
                    return (
                      <div key={c.id} className="group/col relative flex items-center gap-1">
                        <button
                          onClick={() => setActiveCollection(c.id)}
                          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                            isActive
                              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                              : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                          }`}
                        >
                          <FolderOpen size={13} className="shrink-0" />
                          <span className="truncate">{c.name}</span>
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
                            <span className="text-xs opacity-60">{count}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setCohesionTarget(c)}
                          className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                          title="Cohesion view"
                        >
                          <BarChart2 size={12} />
                        </button>

                        {/* Palette preview tooltip — appears on hover to the right */}
                        {collectionPalettes.length > 0 && (
                          <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none opacity-0 group-hover/col:opacity-100 transition-opacity duration-200 delay-100">
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-2xl p-3 w-56">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2.5 truncate">{c.name}</p>
                              <div className="space-y-1.5">
                                {collectionPalettes.slice(0, 7).map((p) => (
                                  <div key={p.id} className="flex items-center gap-2">
                                    <div className="flex rounded-sm overflow-hidden h-[14px] flex-1 min-w-0">
                                      {p.colors.slice(0, 8).map((color, i) => (
                                        <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-[var(--muted)] truncate shrink-0 max-w-[72px]">{p.name}</span>
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
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search palettes…"
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-8 pr-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
                        />
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
                            if (colorSearchHex) return;
                            try {
                              const text = await navigator.clipboard.readText();
                              const cleaned = text.trim();
                              const hex = cleaned.startsWith("#") ? cleaned : "#" + cleaned;
                              if (isValidHex(hex)) setColorSearchHex(hex);
                            } catch { /* clipboard access denied */ }
                          }}
                          placeholder="#rrggbb — find by color"
                          autoFocus
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--accent)] rounded-[var(--radius-sm)] pl-3 pr-3 py-1.5 outline-none transition-colors placeholder:text-[var(--muted)] font-mono"
                          spellCheck={false}
                        />
                      </div>
                      {validColorSearch && (
                        <span className="text-[10px] text-[var(--muted)] shrink-0 whitespace-nowrap">sorted by match</span>
                      )}
                    </>
                  )}
                  {/* Color search toggle */}
                  <button
                    onClick={() => {
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
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTag(key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                          activeTag === key
                            ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                            : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {key !== "all" && key !== "__mine__" && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getTagDotColor(key) }}
                          />
                        )}
                        {label}
                        <span className={`text-[10px] ${activeTag === key ? "opacity-70" : "opacity-50"}`}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood filter pills */}
            <AnimatePresence>
              {moodCounts.size >= 2 && (
                <motion.div
                  key="mood-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
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
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setActiveTag("all");
                    setActiveMood("all");
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
                  {sorted.map((palette) => (
                    <PaletteCard
                      key={palette.id}
                      palette={palette}
                      onExport={setExportTarget}
                      onRename={setRenameTarget}
                      onAssignCollection={setCollectionTarget}
                      onHarmony={setHarmonyTarget}
                      onEditSwatch={(p, i) => setEditTarget({ palette: p, swatchIndex: i })}
                      onDuplicate={(p) => duplicatePalette(p.id)}
                      isSelected={selectedIds.has(palette.id)}
                      selectionActive={selectedIds.size > 0}
                      onSelect={toggleSelect}
                      colorMatchHex={validColorSearch ?? undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
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
              {collections.length > 0 && (
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
                    {collections.map((c) => (
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
                onClick={() => {
                  if (bulkDeleteConfirm) {
                    deletePalettes([...selectedIds]);
                    clearSelection();
                  } else {
                    setBulkDeleteConfirm(true);
                    setTimeout(() => setBulkDeleteConfirm(false), 2500);
                  }
                }}
                className="shrink-0 gap-1.5"
              >
                <Trash2 size={13} />
                {bulkDeleteConfirm
                  ? `Delete ${selectedIds.size}?`
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
