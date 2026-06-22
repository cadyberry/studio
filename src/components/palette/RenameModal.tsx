"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";

interface RenameModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function RenameModal({ palette, onClose }: RenameModalProps) {
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updatePalette = usePaletteStore((s) => s.updatePalette);

  useEffect(() => {
    if (palette) {
      setName(palette.name);
      setSuggestions([]);
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

  const handleSuggest = async () => {
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/name-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: palette.colors.map((c) => c.hex) }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.names ?? []);
      }
    } catch {
      // silently fail — suggestions are a nice-to-have
    } finally {
      setLoadingSuggestions(false);
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
            className="w-full text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
          />

          {/* AI suggestions */}
          <div className="mt-2 mb-4 min-h-[28px]">
            {loadingSuggestions ? (
              <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs">
                <Loader2 size={11} className="animate-spin" />
                <span>Generating names…</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setName(s); inputRef.current?.focus(); }}
                    className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={handleSuggest}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                <Sparkles size={11} />
                <span>Suggest names with AI</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
