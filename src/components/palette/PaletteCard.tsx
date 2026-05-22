"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Trash2, Download, FolderOpen, Edit2, Eye, Pencil, Wand2, X, Loader2, Tag, CopyPlus, Check } from "lucide-react";
import { getContrastColor, deltaE } from "@/lib/utils";
import { usePaletteStore } from "@/store/paletteStore";
import type { ColorSwatch, Palette } from "@/types";
import Button from "@/components/ui/Button";

type KeyedColor = ColorSwatch & { _key: string };

interface PaletteCardProps {
  palette: Palette;
  onExport: (palette: Palette) => void;
  onRename: (palette: Palette) => void;
  onAssignCollection: (palette: Palette) => void;
  onHarmony: (palette: Palette) => void;
  onEditSwatch: (palette: Palette, swatchIndex: number) => void;
  onDuplicate: (palette: Palette) => void;
  isSelected?: boolean;
  selectionActive?: boolean;
  onSelect?: (id: string) => void;
  colorMatchHex?: string;
}

type NamingState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "names"; names: string[] }
  | { type: "error" };

export default function PaletteCard({ palette, onExport, onRename, onAssignCollection, onHarmony, onEditSwatch, onDuplicate, isSelected = false, selectionActive = false, onSelect, colorMatchHex }: PaletteCardProps) {
  const { deletePalette, updatePalette } = usePaletteStore((s) => ({
    deletePalette: s.deletePalette,
    updatePalette: s.updatePalette,
  }));
  const [confirming, setConfirming] = useState(false);
  const [duplicated, setDuplicated] = useState(false);
  const [naming, setNaming] = useState<NamingState>({ type: "idle" });
  const [tagging, setTagging] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Ordered colors with stable keys for drag-to-reorder
  const [orderedColors, setOrderedColors] = useState<KeyedColor[]>(() =>
    palette.colors.map((c, i) => ({ ...c, _key: `${palette.id}-${i}` }))
  );
  const orderedColorsRef = useRef(orderedColors);
  const dragEndTimeRef = useRef(0);

  // Sync when palette.colors changes (swatch edits, external updates)
  useEffect(() => {
    setOrderedColors((prev) => {
      if (prev.length !== palette.colors.length) {
        const fresh = palette.colors.map((c, i) => ({ ...c, _key: `${palette.id}-${i}-${Date.now()}` }));
        orderedColorsRef.current = fresh;
        return fresh;
      }
      // Preserve order and keys; update hex/name values in place
      const updated = prev.map((kc, i) => ({ ...kc, hex: palette.colors[i].hex, name: palette.colors[i].name }));
      orderedColorsRef.current = updated;
      return updated;
    });
  }, [palette.colors, palette.id]);

  const handleReorder = (newOrder: KeyedColor[]) => {
    setOrderedColors(newOrder);
    orderedColorsRef.current = newOrder;
  };

  const handleDragEnd = () => {
    dragEndTimeRef.current = Date.now();
    const plain = orderedColorsRef.current.map(({ _key: _k, ...c }) => c);
    updatePalette(palette.id, { colors: plain });
  };

  const openTagging = () => {
    setNaming({ type: "idle" });
    setTagging(true);
    setTimeout(() => tagInputRef.current?.focus(), 50);
  };

  const closeTagging = () => {
    setTagging(false);
    setTagInput("");
  };

  const commitTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 24);
    if (!tag) return;
    const existing = palette.tags ?? [];
    if (existing.includes(tag)) return;
    updatePalette(palette.id, { tags: [...existing, tag] });
  };

  const removeTag = (tag: string) => {
    updatePalette(palette.id, { tags: (palette.tags ?? []).filter((t) => t !== tag) });
  };

  const handleNameWithAI = async () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "loading" });
    try {
      const res = await fetch("/api/name-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: palette.colors.map((c) => c.hex) }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (!data.names?.length) throw new Error("No names returned");
      setNaming({ type: "names", names: data.names });
    } catch {
      setNaming({ type: "error" });
      setTimeout(() => setNaming({ type: "idle" }), 2000);
    }
  };

  const applyName = (name: string) => {
    updatePalette(palette.id, { name });
    setNaming({ type: "idle" });
  };

  // Closest swatch to the active color search query
  const bestMatchIndex = colorMatchHex
    ? orderedColors.reduce<{ idx: number; dE: number }>(
        (best, color, i) => {
          const d = deltaE(color.hex, colorMatchHex);
          return d < best.dE ? { idx: i, dE: d } : best;
        },
        { idx: 0, dE: Infinity }
      )
    : null;

  const handleDuplicate = () => {
    onDuplicate(palette);
    setDuplicated(true);
    setTimeout(() => setDuplicated(false), 1500);
  };

  const handleDelete = () => {
    if (confirming) {
      deletePalette(palette.id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`group bg-[var(--surface)] rounded-[var(--radius)] border overflow-hidden hover:shadow-md transition-shadow duration-200 relative ${
        isSelected ? "border-[var(--accent)] shadow-sm" : "border-[var(--border)]"
      }`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(palette.id); }}
          title={isSelected ? "Deselect" : "Select"}
          className={`absolute top-2 left-2 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center transition-all duration-150 ${
            isSelected
              ? "bg-[var(--accent)] opacity-100"
              : selectionActive
              ? "bg-white/80 border border-white/60 opacity-100"
              : "bg-white/80 border border-white/60 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isSelected && <Check size={11} className="text-[var(--accent-fg)]" />}
        </button>
      )}

      {/* Swatch strip — drag to reorder */}
      <Reorder.Group
        as="div"
        axis="x"
        values={orderedColors}
        onReorder={handleReorder}
        className="flex h-28"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {orderedColors.map((color, i) => {
          const isMatch = bestMatchIndex !== null && i === bestMatchIndex.idx;
          return (
            <Reorder.Item
              key={color._key}
              value={color}
              as="div"
              style={{ flex: 1, position: "relative", backgroundColor: color.hex }}
              className="group/swatch cursor-grab active:cursor-grabbing"
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (Date.now() - dragEndTimeRef.current > 250) {
                  navigator.clipboard.writeText(color.hex);
                }
              }}
              title={`${color.hex} — drag to reorder · click to copy`}
              whileDrag={{ scale: 1.04, zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}
            >
              {/* Color match ring */}
              {isMatch && (
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" }} />
              )}
              {/* Hex label on hover */}
              <div
                className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none"
                style={{ color: getContrastColor(color.hex) }}
              >
                <span className="text-[9px] font-mono font-bold tracking-wider">
                  {color.hex.slice(1).toUpperCase()}
                </span>
              </div>
              {/* Color match ΔE badge */}
              {isMatch && bestMatchIndex && (
                <div
                  className="absolute top-1.5 left-1.5 pointer-events-none px-1 py-px rounded text-[8px] font-bold leading-tight"
                  style={{
                    backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)",
                    color: getContrastColor(color.hex),
                  }}
                >
                  ΔE {bestMatchIndex.dE.toFixed(1)}
                </div>
              )}
              {/* Edit pencil */}
              <button
                className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity hover:scale-110"
                style={{
                  backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
                  color: getContrastColor(color.hex),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSwatch(palette, i);
                }}
                title="Edit color"
              >
                <Pencil size={9} />
              </button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{palette.name}</div>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <span className="text-xs text-[var(--muted)]">{palette.colors.length} colors</span>
            {palette.collectionId && (
              <span className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[10px] text-[var(--muted)]">
                in collection
              </span>
            )}
            {palette.tags?.map((tag) => (
              <span
                key={tag}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  tag === "trend"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    : tag === "shared"
                    ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNameWithAI}
            title="Name with AI"
            disabled={naming.type === "loading"}
          >
            {naming.type === "loading" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wand2 size={13} />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onHarmony(palette)} title="Harmony view">
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRename(palette)} title="Rename">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAssignCollection(palette)} title="Add to collection">
            <FolderOpen size={13} />
          </Button>
          <Button
            variant={tagging ? "outline" : "ghost"}
            size="sm"
            onClick={tagging ? closeTagging : openTagging}
            title="Manage tags"
          >
            <Tag size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onExport(palette)} title="Export">
            <Download size={13} />
          </Button>
          <Button
            variant={duplicated ? "outline" : "ghost"}
            size="sm"
            onClick={handleDuplicate}
            title="Duplicate palette"
          >
            {duplicated ? <Check size={13} className="text-green-500" /> : <CopyPlus size={13} />}
          </Button>
          <Button
            variant={confirming ? "danger" : "ghost"}
            size="sm"
            onClick={handleDelete}
            title={confirming ? "Click again to delete" : "Delete"}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* AI naming overlay */}
      <AnimatePresence>
        {(naming.type === "names" || naming.type === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/95 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            {naming.type === "error" ? (
              <p className="text-xs text-[var(--muted)] text-center">Couldn&apos;t generate names — try again</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    AI Suggestions
                  </span>
                  <button
                    onClick={() => setNaming({ type: "idle" })}
                    className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {naming.names.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => applyName(name)}
                      className="w-full text-left text-sm px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors font-medium truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag editor overlay */}
      <AnimatePresence>
        {tagging && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Tags
              </span>
              <button
                onClick={closeTagging}
                className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={11} />
              </button>
            </div>

            {/* Current tags */}
            {(palette.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {(palette.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className={`flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded text-[10px] font-medium ${
                      tag === "trend"
                        ? "bg-rose-100 text-rose-600"
                        : tag === "shared"
                        ? "bg-sky-100 text-sky-600"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-black/10 transition-colors p-px"
                      title={`Remove tag "${tag}"`}
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input */}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTag(tagInput);
                  setTagInput("");
                } else if (e.key === "Escape") {
                  closeTagging();
                } else if (e.key === "Backspace" && tagInput === "") {
                  const tags = palette.tags ?? [];
                  if (tags.length > 0) removeTag(tags[tags.length - 1]);
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) {
                  commitTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder={(palette.tags ?? []).length === 0 ? "Add a tag…" : "Add another…"}
              className="w-full text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
              maxLength={24}
              spellCheck={false}
            />
            <p className="text-[9px] text-[var(--muted)] mt-1">Enter or comma to add · Backspace to remove last</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
