"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Download, FolderOpen, Edit2, Eye } from "lucide-react";
import { getContrastColor } from "@/lib/utils";
import { usePaletteStore } from "@/store/paletteStore";
import type { Palette } from "@/types";
import Button from "@/components/ui/Button";

interface PaletteCardProps {
  palette: Palette;
  onExport: (palette: Palette) => void;
  onRename: (palette: Palette) => void;
  onAssignCollection: (palette: Palette) => void;
  onHarmony: (palette: Palette) => void;
}

export default function PaletteCard({ palette, onExport, onRename, onAssignCollection, onHarmony }: PaletteCardProps) {
  const deletePalette = usePaletteStore((s) => s.deletePalette);
  const [confirming, setConfirming] = useState(false);

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
      className="group bg-[var(--surface)] rounded-[var(--radius)] border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[var(--border)] transition-shadow duration-200"
    >
      {/* Swatch strip */}
      <div className="flex h-28">
        {palette.colors.map((color, i) => (
          <div
            key={i}
            className="flex-1 relative group/swatch cursor-pointer"
            style={{ backgroundColor: color.hex }}
            onClick={() => navigator.clipboard.writeText(color.hex)}
            title={color.hex}
          >
            <div
              className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/swatch:opacity-100 transition-opacity"
              style={{ color: getContrastColor(color.hex) }}
            >
              <span className="text-[9px] font-mono font-bold tracking-wider">
                {color.hex.slice(1).toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{palette.name}</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {palette.colors.length} colors
            {palette.collectionId && (
              <span className="ml-1.5 bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[10px]">
                in collection
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onHarmony(palette)} title="Harmony view">
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRename(palette)} title="Rename">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAssignCollection(palette)} title="Add to collection">
            <FolderOpen size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onExport(palette)} title="Export">
            <Download size={13} />
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
    </motion.div>
  );
}
