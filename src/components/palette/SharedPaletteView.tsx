"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ArrowLeft, BookMarked, StickyNote } from "lucide-react";
import { getContrastColor } from "@/lib/utils";
import type { ColorSwatch } from "@/types";

interface SharedPaletteViewProps {
  name: string;
  colors: ColorSwatch[];
  notes?: string;
}

export default function SharedPaletteView({ name, colors, notes }: SharedPaletteViewProps) {
  const [copied, setCopied] = useState<number | "all" | null>(null);

  const copy = (text: string, key: number | "all") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const forkUrl = `/p/fork?n=${encodeURIComponent(name)}&c=${colors.map((c) => c.hex.replace("#", "")).join(",")}`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Palette</span>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-300 via-violet-300 to-sky-300" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Large palette strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-[var(--radius-lg)] overflow-hidden flex mb-8 shadow-lg"
          style={{ height: 120 }}
        >
          {colors.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
          ))}
        </motion.div>

        {/* Palette name + meta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {colors.length} color{colors.length !== 1 ? "s" : ""} — shared palette
          </p>
        </motion.div>

        {/* Notes */}
        {notes && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="mb-6 flex gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40"
          >
            <StickyNote size={15} className="shrink-0 mt-0.5 text-yellow-500 dark:text-yellow-400 fill-yellow-100 dark:fill-yellow-900/40" />
            <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{notes}</p>
          </motion.div>
        )}

        {/* Swatches */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="space-y-2 mb-8"
        >
          {colors.map((color, i) => {
            const fg = getContrastColor(color.hex);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + i * 0.04 }}
                className="flex items-center gap-3"
              >
                {/* Swatch chip */}
                <div
                  className="w-12 h-12 rounded-[var(--radius-sm)] flex-shrink-0 flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: color.hex }}
                >
                  <span
                    className="text-[10px] font-mono font-medium opacity-70 select-none"
                    style={{ color: fg }}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Hex value */}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm font-medium">{color.hex.toUpperCase()}</span>
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copy(color.hex.toUpperCase(), i)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {copied === i ? (
                    <>
                      <Check size={11} className="text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      Copy
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Copy all + Fork actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-wrap gap-3"
        >
          <button
            onClick={() => copy(colors.map((c) => c.hex.toUpperCase()).join(", "), "all")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-sm font-medium text-[var(--foreground)]"
          >
            {copied === "all" ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-500">Copied all!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy all hex codes
              </>
            )}
          </button>

          <a
            href={`/?fork=${encodeURIComponent(`${name}|${colors.map((c) => c.hex.replace("#", "")).join(",")}`)}` }
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <BookMarked size={13} />
            Fork to my library
          </a>
        </motion.div>

        {/* Footer note */}
        <p className="mt-12 text-xs text-[var(--muted)] text-center">
          Made with{" "}
          <a href="/" className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors">
            Palette
          </a>
          {" "}— color intelligence for creators
        </p>
      </main>
    </div>
  );
}
