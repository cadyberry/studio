"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";

interface CollectionModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function CollectionModal({ palette, onClose }: CollectionModalProps) {
  const { collections, palettes, addCollection, updatePalette } = usePaletteStore();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!palette) return null;

  const handleAssign = (collectionId: string | undefined) => {
    updatePalette(palette.id, { collectionId });
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const c = addCollection(newName.trim());
    updatePalette(palette.id, { collectionId: c.id });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-xs shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Add to collection</h2>
              <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
              {/* No collection option */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-sm"
                onClick={() => handleAssign(undefined)}
              >
                <span className="text-[var(--muted)]">No collection</span>
                {!palette.collectionId && <Check size={14} className="text-[var(--accent)]" />}
              </button>
              {collections.map((c) => {
                const count = palettes.filter((p) => p.collectionId === c.id).length;
                return (
                  <button
                    key={c.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-sm"
                    onClick={() => handleAssign(c.id)}
                  >
                    <span>{c.name}</span>
                    <span className="flex items-center gap-2 shrink-0 ml-2">
                      {count > 0 && (
                        <span className="text-[11px] text-[var(--muted)] tabular-nums">{count}</span>
                      )}
                      {palette.collectionId === c.id && <Check size={14} className="text-[var(--accent)]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Create new */}
            {creating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="Collection name…"
                  className="flex-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors"
                />
                <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] hover:border-[var(--muted)] transition-colors text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() => setCreating(true)}
              >
                <Plus size={13} />
                New collection
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
