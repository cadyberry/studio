"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, RefreshCw, Plus } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";

interface Props {
  onClose: () => void;
  onSaved?: (paletteId: string) => void;
}

const EXAMPLE_PROMPTS = [
  "moody autumn forest at dusk",
  "retro 70s boho living room",
  "coastal cottage morning light",
  "neon Tokyo rainy night",
  "soft Nordic winter",
  "sun-bleached desert canyon",
  "velvet night sky with fireflies",
  "vintage botanical illustration",
];

export default function GeneratePaletteModal({ onClose, onSaved }: Props) {
  const addPalette = usePaletteStore((s) => s.addPalette);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; mood: string; colors: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useRef(
    EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]
  ).current;

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch("/api/generate-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!result || saved) return;
    const newPalette = addPalette({
      name: result.name,
      colors: result.colors.map((hex) => ({ hex })),
      tags: [],
    });
    setSaved(true);
    onSaved?.(newPalette.id);
  }

  const canGenerate = prompt.trim().length > 0 && !loading;

  return (
    <AnimatePresence>
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
          className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-violet-500/10">
                <Sparkles size={14} className="text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Generate from Description</h2>
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
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Describe a mood, scene, or aesthetic
              </label>
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generate();
                  }
                }}
                placeholder={placeholder}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
              />
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Press <kbd className="font-mono bg-[var(--surface-2)] px-1 rounded">Enter</kbd> to generate
              </p>
            </div>

            <button
              onClick={generate}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Palette
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-[var(--radius-sm)]">
                {error}
              </p>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Color strip */}
                  <div className="rounded-[var(--radius-sm)] overflow-hidden h-16 flex">
                    {result.colors.map((hex, i) => (
                      <div
                        key={i}
                        className="flex-1 relative group"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      >
                        <span className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-mono bg-black/40 text-white px-1 rounded leading-tight">
                            {hex}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Name & mood */}
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{result.name}</p>
                    {result.mood && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">{result.mood}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={generate}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-xs text-[var(--foreground)] transition-colors"
                    >
                      <RefreshCw size={12} />
                      Regenerate
                    </button>
                    <button
                      onClick={save}
                      disabled={saved}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-opacity"
                    >
                      {saved ? (
                        <>Saved to Library</>
                      ) : (
                        <>
                          <Plus size={12} />
                          Save to Library
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
