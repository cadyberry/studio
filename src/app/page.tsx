"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Search, FolderOpen, Sparkles } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Extractor from "@/components/palette/Extractor";
import PaletteCard from "@/components/palette/PaletteCard";
import ExportModal from "@/components/palette/ExportModal";
import RenameModal from "@/components/palette/RenameModal";
import CollectionModal from "@/components/palette/CollectionModal";
import type { Palette } from "@/types";

export default function Home() {
  const { palettes, collections } = usePaletteStore();
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | "all">("all");
  const [exportTarget, setExportTarget] = useState<Palette | null>(null);
  const [renameTarget, setRenameTarget] = useState<Palette | null>(null);
  const [collectionTarget, setCollectionTarget] = useState<Palette | null>(null);

  const filtered = palettes.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCollection =
      activeCollection === "all" || p.collectionId === activeCollection;
    return matchesSearch && matchesCollection;
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
                    const count = palettes.filter((p) => p.collectionId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveCollection(c.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                          activeCollection === c.id
                            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                            : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        }`}
                      >
                        <FolderOpen size={13} />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto text-xs opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — Library */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                Library
              </h2>
              {palettes.length > 0 && (
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
              )}
            </div>

            {palettes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex gap-1.5 mb-4">
                  {["#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#fcd34d"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-sm text-[var(--muted)]">Drop an image to extract your first palette</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-8 text-center">No palettes match your search.</p>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((palette) => (
                    <PaletteCard
                      key={palette.id}
                      palette={palette}
                      onExport={setExportTarget}
                      onRename={setRenameTarget}
                      onAssignCollection={setCollectionTarget}
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
    </div>
  );
}
