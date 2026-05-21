"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";

interface RenameModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function RenameModal({ palette, onClose }: RenameModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const updatePalette = usePaletteStore((s) => s.updatePalette);

  useEffect(() => {
    if (palette) {
      setName(palette.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [palette]);

  if (!palette) return null;

  const handleSave = () => {
    if (name.trim()) {
      updatePalette(palette.id, { name: name.trim() });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="bg-[var(--surface)] rounded-[var(--radius)] w-full max-w-xs shadow-2xl p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Rename palette</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            className="w-full text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors mb-4"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
