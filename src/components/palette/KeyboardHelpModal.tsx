"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  label: string;
  /** "+" for chords (default), "/" for alternatives */
  sep?: "+" | "/";
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutRow[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["/"], label: "Focus search" },
      { keys: ["?"], label: "Open this help sheet" },
      { keys: ["Shift", "D"], label: "Open Find Duplicates" },
      { keys: ["Esc"], label: "Clear & blur search" },
    ],
  },
  {
    title: "Palette Card  (hover to activate)",
    shortcuts: [
      { keys: ["D"], label: "Duplicate palette" },
      { keys: ["C"], label: "Compare — set anchor, then pick second palette" },
      { keys: ["H"], label: "Open Harmony View" },
      { keys: ["E"], label: "Open Export" },
      { keys: ["S"], label: "Open / close Color Story" },
      { keys: ["L"], label: "Toggle lock / unlock" },
      { keys: ["P"], label: "Pin / unpin palette" },
      { keys: ["F2"], label: "Rename inline" },
      { keys: ["Del"], label: "Delete (press twice to confirm)" },
    ],
  },
  {
    title: "Swatch Editor",
    shortcuts: [
      { keys: ["←", "→"], label: "Select previous / next swatch", sep: "/" },
      { keys: ["↑", "↓"], label: "Step slider value ±5", sep: "/" },
      { keys: ["Shift", "↑ / ↓"], label: "Step slider value ±10" },
      { keys: ["Enter"], label: "Confirm hex input" },
      { keys: ["Esc"], label: "Close editor" },
    ],
  },
  {
    title: "Inline Rename",
    shortcuts: [
      { keys: ["F2"], label: "Start rename (palette card, hovered)" },
      { keys: ["DblClick"], label: "Start rename (palette name or collection)" },
      { keys: ["Enter"], label: "Save name" },
      { keys: ["Esc"], label: "Cancel rename" },
    ],
  },
  {
    title: "Tags",
    shortcuts: [
      { keys: ["Enter", ","], label: "Add tag", sep: "/" },
      { keys: ["Backspace"], label: "Remove last tag (when input empty)" },
      { keys: ["Esc"], label: "Close tag input" },
    ],
  },
];

function Kbd({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded text-[10px] font-mono font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] leading-none shadow-[0_1px_0_0_var(--border)]">
      {label}
    </kbd>
  );
}

export default function KeyboardHelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--accent)]/10">
                  <Keyboard size={14} className="text-[var(--accent)]" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2.5">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.shortcuts.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--border)]/50 last:border-0"
                      >
                        <span className="text-xs text-[var(--foreground)] leading-none">{row.label}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {row.keys.map((k, i) => (
                            <span key={`${k}-${i}`} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-[10px] text-[var(--muted)] leading-none select-none">
                                  {row.sep ?? "+"}
                                </span>
                              )}
                              <Kbd label={k} />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
              <p className="text-[11px] text-[var(--muted)] text-center">
                Press <Kbd label="?" /> again or <Kbd label="Esc" /> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
