"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Search, FolderOpen, Sparkles, BarChart2, Compass, BookMarked, X, Tag, ArrowUpDown } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Extractor from "@/components/palette/Extractor";
import PaletteCard from "@/components/palette/PaletteCard";
import ExportModal from "@/components/palette/ExportModal";
import RenameModal from "@/components/palette/RenameModal";
import CollectionModal from "@/components/palette/CollectionModal";
import HarmonyModal from "@/components/palette/HarmonyModal";
import SwatchEditor from "@/components/palette/SwatchEditor";
import CohesionModal from "@/components/palette/CohesionModal";
import TrendLibrary from "@/components/palette/TrendLibrary";
import { computeCohesionScore } from "@/lib/utils";
import type { Palette, Collection } from "@/types";

export default function Home() {
  const { palettes, collections, addPalette, duplicatePalette } = usePaletteStore();
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

  const filtered = palettes.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCollection =
      activeCollection === "all" || p.collectionId === activeCollection;
    const matchesTag =
      activeTag === "all"
        ? true
        : activeTag === "__mine__"
        ? !p.tags?.length
        : p.tags?.includes(activeTag);
    return matchesSearch && matchesCollection && matchesTag;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "most-colors": return b.colors.length - a.colors.length;
    }
  });

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
                      <div key={c.id} className="group/col flex items-center gap-1">
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
              {palettes.length > 0 && (
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
                          <Tag size={9} className="flex-shrink-0" />
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
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--muted)]">No palettes match your filters.</p>
                {(search || activeTag !== "all") && (
                  <button
                    onClick={() => { setSearch(""); setActiveTag("all"); }}
                    className="mt-2 text-xs text-[var(--accent)] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
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
